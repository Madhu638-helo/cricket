/**
 * ball-tracker.worker.js
 * 
 * Client-side cricket ball tracking pipeline using ONNX Runtime Web.
 * Runs entirely in a Web Worker to keep the main thread free.
 * 
 * Pipeline:
 *   ImageData (640x640) → YOLOv8n inference → Kalman track →
 *   Phase detection (release/impact) → Speed calc (km/h) → postMessage result
 * 
 * Model: YOLOv8n ONNX (sports-ball class 32 from COCO, or cricket-specific)
 * Backend: WebGPU → WebGL → WASM fallback
 */

// ── ONNX Runtime Web loaded via importScripts (served from /ort/) ──
// We use the CDN version since Next.js Worker bundling is complex.
// The speed page loads it into scope before creating this worker.

let session = null;
let inferenceReady = false;
let modelError = null;

// ── Kalman filter state (simple 2D position + velocity) ──
let kx = 0, ky = 0, kvx = 0, kvy = 0;
let kalmanInit = false;

const PROCESS_NOISE = 0.08;   // how much we trust prediction vs measurement
const MEASURE_NOISE = 0.6;    // how noisy the detector is
let P = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]; // covariance

// ── Phase detection state ──
let releaseFrame = null;       // frame timestamp when ball released
let impactFrame = null;        // frame timestamp at impact
let releasePos = null;         // {x, y} at release
let impactPos = null;          // {x, y} at impact
let prevSpeed = 0;
let ballTrail = [];            // last N center positions for trail render
const TRAIL_LENGTH = 12;
const MIN_SPEED_CHANGE = 0.4;  // velocity drop to trigger impact

// Speed history for smoothing
let speedHistory = [];
const SPEED_WINDOW = 4;

// ── Input tensor config (must match model export) ──
const MODEL_INPUT_W = 640;
const MODEL_INPUT_H = 640;
const CONF_THRESH = 0.15;
const NMS_IOU = 0.45;
const BALL_CLASS = 32; // COCO sports-ball class index

// Pitch length in real world (standard cricket) and approx pixel scaling
// User calibrates this via the UI; default assumes camera is ~10m from side
const DEFAULT_PITCH_LENGTH_M = 20.12;
let pitchLengthM = DEFAULT_PITCH_LENGTH_M;
let pixelsPerMeter = 20; // will be refined by calibration

// ── Init: Load ONNX model ──
async function initModel() {
  try {
    // ort is injected into worker scope from the main thread via importScripts
    if (typeof ort === 'undefined') {
      modelError = 'ORT not loaded';
      return;
    }

    // Point ORT to fetch WASM binaries from the CDN instead of our local server
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

    // Prefer WebGPU → WebGL → WASM
    const providers = [];
    try {
      await ort.env.wasm.wasmPaths;
      providers.push('webgpu');
    } catch (_) {}
    providers.push('wasm');

    session = await ort.InferenceSession.create(`/models/yolov8n-sports.onnx?v=${Date.now()}`, {
      executionProviders: providers,
      graphOptimizationLevel: 'all',
    });

    inferenceReady = true;
    postMessage({ type: 'ready', providers });
  } catch (err) {
    modelError = String(err);
    postMessage({ type: 'error', message: modelError });
  }
}

let preallocatedTensor = null;

// ── Preprocessing: ImageData → Float32 NCHW tensor ──
function preprocess(imageData) {
  const { width, height, data } = imageData;
  if (!preallocatedTensor) {
    preallocatedTensor = new Float32Array(3 * MODEL_INPUT_W * MODEL_INPUT_H);
  }
  const tensor = preallocatedTensor;
  const scaleX = MODEL_INPUT_W / width;
  const scaleY = MODEL_INPUT_H / height;
  const scaledW = Math.min(MODEL_INPUT_W, Math.round(width * Math.min(scaleX, scaleY)));
  const scaledH = Math.min(MODEL_INPUT_H, Math.round(height * Math.min(scaleX, scaleY)));
  const offsetX = Math.floor((MODEL_INPUT_W - scaledW) / 2);
  const offsetY = Math.floor((MODEL_INPUT_H - scaledH) / 2);

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const srcX = Math.min(width - 1, Math.round(x / scaleX));
      const srcY = Math.min(height - 1, Math.round(y / scaleY));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstX = x + offsetX;
      const dstY = y + offsetY;
      const dstBase = dstY * MODEL_INPUT_W + dstX;
      tensor[dstBase] = data[srcIdx] / 255;                           // R
      tensor[MODEL_INPUT_W * MODEL_INPUT_H + dstBase] = data[srcIdx + 1] / 255;  // G
      tensor[2 * MODEL_INPUT_W * MODEL_INPUT_H + dstBase] = data[srcIdx + 2] / 255; // B
    }
  }
  return { tensor, offsetX, offsetY, scaledW, scaledH };
}

// ── Post-processing: parse YOLOv8 output → detections ──
// YOLOv8 output shape: [1, 84, 8400] (84 = 4 box coords + 80 class scores)
function parseDetections(output, offsetX, offsetY, scaledW, scaledH, imgW, imgH) {
  const data = output.data;
  const numDetections = 8400;
  const numClasses = 84 - 4;
  const detections = [];
  const scaleX = imgW / scaledW;
  const scaleY = imgH / scaledH;

  for (let i = 0; i < numDetections; i++) {
    // Coordinates (cx, cy, w, h) normalized to 640x640
    const cx = data[0 * numDetections + i];
    const cy = data[1 * numDetections + i];
    const w  = data[2 * numDetections + i];
    const h  = data[3 * numDetections + i];

    // Find max class score
    let maxConf = 0, maxClass = 0;
    for (let c = 0; c < numClasses; c++) {
      const conf = data[(4 + c) * numDetections + i];
      if (conf > maxConf) { maxConf = conf; maxClass = c; }
    }

    if (maxConf < CONF_THRESH) continue;
    
    // STRICTLY filter for the sports ball class (32)
    if (maxClass !== BALL_CLASS) continue;

    // Convert from 640x640 letterboxed back to original image coords
    const x1 = ((cx - w/2 - offsetX) / scaledW) * imgW;
    const y1 = ((cy - h/2 - offsetY) / scaledH) * imgH;
    const x2 = ((cx + w/2 - offsetX) / scaledW) * imgW;
    const y2 = ((cy + h/2 - offsetY) / scaledH) * imgH;

    detections.push({ x1, y1, x2, y2, conf: maxConf, cls: maxClass });
  }

  // NMS
  return nms(detections);
}

// ── Simple NMS ──
function nms(detections) {
  detections.sort((a, b) => b.conf - a.conf);
  const kept = [];
  const suppressed = new Set();
  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(detections[i]);
    for (let j = i + 1; j < detections.length; j++) {
      if (iou(detections[i], detections[j]) > NMS_IOU) suppressed.add(j);
    }
  }
  return kept.slice(0, 5);
}

function iou(a, b) {
  const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2-ix1) * Math.max(0, iy2-iy1);
  if (inter === 0) return 0;
  const aArea = (a.x2-a.x1)*(a.y2-a.y1);
  const bArea = (b.x2-b.x1)*(b.y2-b.y1);
  return inter / (aArea + bArea - inter);
}

// ── Kalman prediction step ──
function kalmanPredict() {
  kx += kvx;
  ky += kvy;
  for (let i = 0; i < 4; i++) P[i][i] += PROCESS_NOISE;
  return { x: kx, y: ky };
}

// ── Kalman update with measurement ──
function kalmanUpdate(mx, my) {
  const K = [
    P[0][0]/(P[0][0]+MEASURE_NOISE), P[1][1]/(P[1][1]+MEASURE_NOISE),
    P[2][2]/(P[2][2]+MEASURE_NOISE), P[3][3]/(P[3][3]+MEASURE_NOISE),
  ];
  const prevX = kx, prevY = ky;
  kx  += K[0] * (mx - kx);
  ky  += K[1] * (my - ky);
  kvx += K[2] * ((mx-prevX) - kvx);
  kvy += K[3] * ((my-prevY) - kvy);
  P[0][0] *= (1 - K[0]);
  P[1][1] *= (1 - K[1]);
  P[2][2] *= (1 - K[2]);
  P[3][3] *= (1 - K[3]);
}

// ── Speed calculation ──
function computeSpeed_kmh(frameCount, fps) {
  if (!releaseFrame || !impactFrame || !releasePos || !impactPos) return null;
  const flightFrames = impactFrame - releaseFrame;
  if (flightFrames < 2) return null;
  const flightTime = flightFrames / fps;
  const dx = (impactPos.x - releasePos.x);
  const dy = (impactPos.y - releasePos.y);
  const distPx = Math.sqrt(dx*dx + dy*dy);
  const distM = distPx / pixelsPerMeter;
  // Clamp to realistic bowling speeds (60–220 km/h)
  const kmh = (distM / flightTime) * 3.6;
  return kmh >= 60 && kmh <= 220 ? kmh : null;
}

// ── Smooth speed using rolling average ──
function smoothedSpeed(rawKmh) {
  if (rawKmh === null) return null;
  speedHistory.push(rawKmh);
  if (speedHistory.length > SPEED_WINDOW) speedHistory.shift();
  return speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
}

// ── Main message handler ──
let frameCount = 0;
let lastFrameTime = performance.now();
let measuredFps = 30;

onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === '__ort_src') {
    try {
      importScripts(e.data.src);
      await initModel();
    } catch (err) {
      postMessage({ type: 'error', message: 'Failed to load ONNX runtime: ' + String(err) });
    }
    return;
  }

  if (type === 'init') {
    pitchLengthM = data.pitchLengthM ?? DEFAULT_PITCH_LENGTH_M;
    pixelsPerMeter = data.pixelsPerMeter ?? 20;
    return;
  }

  if (type === 'calibrate') {
    pixelsPerMeter = data.pixelsPerMeter;
    return;
  }

  if (type === 'reset') {
    releaseFrame = null; impactFrame = null;
    releasePos = null; impactPos = null;
    ballTrail = []; speedHistory = [];
    kalmanInit = false;
    return;
  }

  if (type === 'frame') {
    if (!inferenceReady) return;

    const { imageData, width, height, timestamp } = data;
    const now = performance.now();
    const delta = now - lastFrameTime;
    measuredFps = delta > 0 ? Math.round(1000 / delta) : 30;
    lastFrameTime = now;
    frameCount++;

    try {
      // 1. Preprocess
      const { tensor, offsetX, offsetY, scaledW, scaledH } = preprocess(imageData);
      const inputTensor = new ort.Tensor('float32', tensor, [1, 3, MODEL_INPUT_H, MODEL_INPUT_W]);

      // 2. Inference
      const feeds = {};
      feeds[session.inputNames[0]] = inputTensor;
      const results = await session.run(feeds);
      const output = results[session.outputNames[0]];

      // 3. Parse detections
      const dets = parseDetections(output, offsetX, offsetY, scaledW, scaledH, width, height);

      // Clean up GPU memory immediately to prevent Safari from crashing due to OOM
      if (inputTensor.dispose) inputTensor.dispose();
      for (const key in results) {
        if (results[key].dispose) results[key].dispose();
      }

      // 4. Kalman filter
      let trackedBox = null;
      let cx = null, cy = null;

      if (dets.length > 0) {
        const best = dets[0];
        cx = (best.x1 + best.x2) / 2;
        cy = (best.y1 + best.y2) / 2;

        if (!kalmanInit) {
          kx = cx; ky = cy; kvx = 0; kvy = 0;
          kalmanInit = true;
        } else {
          kalmanPredict();
          kalmanUpdate(cx, cy);
        }
        trackedBox = { x1: best.x1, y1: best.y1, x2: best.x2, y2: best.y2, conf: best.conf };
      } else if (kalmanInit) {
        // No detection — propagate prediction
        const pred = kalmanPredict();
        cx = pred.x; cy = pred.y;
      }

      // 5. Update trail
      if (cx !== null && cy !== null) {
        ballTrail.push({ x: cx, y: cy, t: frameCount });
        if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();
      }

      // 6. Phase detection
      let phase = 'tracking';
      let speed_kmh = null;

      if (cx !== null) {
        const speed = Math.sqrt(kvx*kvx + kvy*kvy) * pixelsPerMeter * measuredFps * 3.6;

        // Release: ball begins moving toward batsman (kvx > threshold)
        if (!releaseFrame && kvx > 1.5) {
          releaseFrame = frameCount;
          releasePos = { x: cx, y: cy };
          phase = 'release';
        }

        // Impact: sudden velocity drop or ball leaves frame (x close to right edge)
        if (releaseFrame && !impactFrame) {
          const isDecelerating = prevSpeed > 0 && speed < prevSpeed * (1 - MIN_SPEED_CHANGE) && speed > 2;
          const isAtBatsman = cx > width * 0.7;
          if (isDecelerating || isAtBatsman) {
            impactFrame = frameCount;
            impactPos = { x: cx, y: cy };
            phase = 'impact';
            const rawSpeed = computeSpeed_kmh(frameCount, measuredFps);
            speed_kmh = smoothedSpeed(rawSpeed);
          }
        } else if (impactFrame) {
          phase = 'result';
          // Keep showing last computed speed
          speed_kmh = speedHistory.length > 0
            ? speedHistory[speedHistory.length - 1]
            : null;
        }

        prevSpeed = speed;
      }

      // 7. Post result back to main thread
      postMessage({
        type: 'result',
        trackedBox,
        trail: ballTrail.slice(-8),
        phase,
        speed_kmh: speed_kmh ? Math.round(speed_kmh * 10) / 10 : null,
        confidence: dets.length > 0 ? dets[0].conf : 0,
        fps: measuredFps,
        frameCount,
      });

    } catch (err) {
      postMessage({ type: 'frame_error', message: String(err) });
    }
  }
};
