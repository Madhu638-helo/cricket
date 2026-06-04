'use client';
import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PageProps { params: Promise<{ code: string }> }

type WorkerPhase = 'idle' | 'tracking' | 'release' | 'impact' | 'result';
type SpeedTier = 'slow' | 'medium' | 'medium-fast' | 'fast';

interface WorkerResult {
  type: string;
  trackedBox?: { x1: number; y1: number; x2: number; y2: number; conf: number };
  trail?: { x: number; y: number; t: number }[];
  phase?: WorkerPhase;
  speed_kmh?: number | null;
  confidence?: number;
  fps?: number;
  message?: string;
}

function getSpeedTier(kmh: number): SpeedTier {
  if (kmh >= 135) return 'fast';
  if (kmh >= 120) return 'medium-fast';
  if (kmh >= 100) return 'medium';
  return 'slow';
}

const TIER_CONFIG: Record<SpeedTier, { color: string; bg: string; border: string; label: string; emoji: string }> = {
  fast: { color: '#f87171', bg: 'rgba(239,68,68,.15)', border: 'rgba(239,68,68,.5)', label: 'FAST', emoji: '🔴' },
  'medium-fast': { color: '#f97316', bg: 'rgba(249,115,22,.15)', border: 'rgba(249,115,22,.5)', label: 'MED-FAST', emoji: '🟠' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.5)', label: 'MEDIUM', emoji: '🟡' },
  slow: { color: '#60a5fa', bg: 'rgba(96,165,250,.15)', border: 'rgba(96,165,250,.5)', label: 'SLOW', emoji: '🔵' },
};

// Cross-Origin Isolation helper
function COIWarning() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px', textAlign: 'center', gap: '16px',
    }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>WebGPU Not Available</div>
      <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.6 }}>
        The ball speed pipeline needs Cross-Origin Isolation headers for WebGPU.<br />
        The server needs <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>COOP: same-origin</code> and <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>COEP: require-corp</code>.
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>Model will fall back to WASM (slower but works)</div>
    </div>
  );
}

export default function SpeedCameraPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const workerReadyRef = useRef(false);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fps, setFps] = useState(0);
  const [phase, setPhase] = useState<WorkerPhase>('idle');
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [lastSpeeds, setLastSpeeds] = useState<number[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [pitchPx, setPitchPx] = useState(200); // pixels for calibration
  const [pitchLengthM, setPitchLengthM] = useState(20.12); // real world pitch length in meters
  const [showCalib, setShowCalib] = useState(false);
  const [calibState, setCalibState] = useState<'idle' | 'point1' | 'point2' | 'done'>('idle');
  const [calibPoint1, setCalibPoint1] = useState<{x: number, y: number} | null>(null);
  const [calibPoint2, setCalibPoint2] = useState<{x: number, y: number} | null>(null);
  const [detectedBall, setDetectedBall] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // ── Model download progress (simulated, since fetch can't track ONNX load) ──
  const [loadProgress, setLoadProgress] = useState(0);
  const [syncedToScorer, setSyncedToScorer] = useState(false);

  // ── BroadcastChannel: push speed to scorer tab on same device ──
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  // ── Supabase channel: push speed to ALL viewers via realtime ──
  const supabaseRef = useRef(createClient());
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  useEffect(() => {
    // Same-device sync (scorer + speed cam open in different tabs)
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastRef.current = new BroadcastChannel(`speed-cam-${code}`);
    }
    // Cross-device realtime (spectators on other phones)
    const ch = supabaseRef.current.channel(`match:${code}`);
    realtimeChannelRef.current = ch;
    ch.subscribe();
    return () => {
      broadcastRef.current?.close();
      supabaseRef.current.removeChannel(ch);
    };
  }, [code]);

  // ── Broadcast speed to scorer + spectators ──
  const broadcastSpeed = useCallback((kmh: number) => {
    // 1. Same-device tab (scorer picks this up to attach to next ball)
    broadcastRef.current?.postMessage({ type: 'ball_speed', speed_kmh: kmh, code });
    // 2. All viewers via Supabase realtime broadcast (instant, no DB write)
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'ball_speed',
      payload: { speed_kmh: kmh },
    });
    setSyncedToScorer(true);
    setTimeout(() => setSyncedToScorer(false), 3000);
  }, [code]);

  // ── Calibration tap handler ──
  const handleCalibClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (calibState === 'idle' || calibState === 'done') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert DOM click coordinates to Canvas intrinsic coordinates
    const canvas = overlayRef.current;
    if (!canvas) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const intrinsicX = x * scaleX;
    const intrinsicY = y * scaleY;

    if (calibState === 'point1') {
      setCalibPoint1({ x: intrinsicX, y: intrinsicY });
      setCalibState('point2');
    } else if (calibState === 'point2') {
      setCalibPoint2({ x: intrinsicX, y: intrinsicY });
      setCalibState('done');
      
      const dist = Math.sqrt(
        Math.pow(intrinsicX - (calibPoint1?.x ?? 0), 2) + 
        Math.pow(intrinsicY - (calibPoint1?.y ?? 0), 2)
      );
      setPitchPx(Math.round(dist));
      workerRef.current?.postMessage({ type: 'calibrate', data: { pixelsPerMeter: dist / pitchLengthM } });
    }
  }, [calibState, calibPoint1, pitchLengthM]);

  // ── Overlay drawing ──
  const drawOverlay = useCallback((result: WorkerResult) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Trail
    if (result.trail && result.trail.length > 1) {
      for (let i = 1; i < result.trail.length; i++) {
        const alpha = i / result.trail.length;
        ctx.beginPath();
        ctx.arc(result.trail[i].x, result.trail[i].y, 4 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${alpha * 0.8})`;
        ctx.fill();
      }
      // Trail line
      ctx.beginPath();
      ctx.moveTo(result.trail[0].x, result.trail[0].y);
      for (let i = 1; i < result.trail.length; i++) {
        ctx.lineTo(result.trail[i].x, result.trail[i].y);
      }
      ctx.strokeStyle = 'rgba(249,115,22,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Bounding box
    if (result.trackedBox) {
      const { x1, y1, x2, y2, conf } = result.trackedBox;
      const tierColor = result.speed_kmh ? TIER_CONFIG[getSpeedTier(result.speed_kmh)].color : '#f97316';
      ctx.strokeStyle = tierColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Confidence label
      ctx.fillStyle = tierColor;
      ctx.font = 'bold 10px Barlow, sans-serif';
      ctx.fillText(`🏏 ${Math.round(conf * 100)}%`, x1, y1 - 4);
    }

    // Phase indicators
    if (result.phase === 'release') {
      ctx.fillStyle = 'rgba(48,209,88,0.8)';
      ctx.font = 'bold 12px Barlow, sans-serif';
      ctx.fillText('● RELEASE', 16, 28);
    } else if (result.phase === 'impact') {
      ctx.fillStyle = 'rgba(249,115,22,0.9)';
      ctx.font = 'bold 12px Barlow, sans-serif';
      ctx.fillText('⚡ IMPACT', 16, 28);
    }

    // FPS counter
    if (result.fps) {
      ctx.fillStyle = 'rgba(110,110,115,0.8)';
      ctx.font = '10px monospace';
      ctx.fillText(`${result.fps} fps`, W - 50, 16);
    }
  }, []);

  // ── Main frame capture loop ──
  const captureLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !workerReadyRef.current) {
      animFrameRef.current = requestAnimationFrame(captureLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(captureLoop);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    workerRef.current?.postMessage({
      type: 'frame',
      data: { imageData, width: canvas.width, height: canvas.height, timestamp: performance.now() },
    }, [imageData.data.buffer]);

    animFrameRef.current = requestAnimationFrame(captureLoop);
  }, []);

  // ── Start camera ──
  const startCamera = async () => {
    setStatus('loading');
    setLoadProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          frameRate: { ideal: 60, min: 30 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      // Resize canvases to video
      const W = video.videoWidth || 640;
      const H = video.videoHeight || 480;
      if (canvasRef.current) { canvasRef.current.width = W; canvasRef.current.height = H; }
      if (overlayRef.current) { overlayRef.current.width = W; overlayRef.current.height = H; }

      // Init worker (with cache-buster to clear out the old 307-redirected HTML version)
      const worker = new Worker(`/workers/ball-tracker.worker.js?v=${Date.now()}`);
      workerRef.current = worker;

      // Load ORT into worker via importScripts
      worker.postMessage({ type: '__ort_src', src: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js' });

      // Simulate load progress
      const prog = setInterval(() => setLoadProgress(p => Math.min(90, p + 10)), 300);

      worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        const msg = e.data;
        if (msg.type === 'ready') {
          clearInterval(prog);
          setLoadProgress(100);
          setTimeout(() => {
            setModelReady(true);
            setStatus('running');
            workerReadyRef.current = true;
            worker.postMessage({ type: 'init', data: { pitchLengthM, pixelsPerMeter: pitchPx / pitchLengthM } });
            animFrameRef.current = requestAnimationFrame(captureLoop);
          }, 400);
        } else if (msg.type === 'result') {
          setFps(msg.fps ?? 0);
          setPhase(msg.phase ?? 'idle');
          setDetectedBall(!!msg.trackedBox);
          if (msg.speed_kmh) {
            setSpeedKmh(msg.speed_kmh);
            setLastSpeeds(prev => [msg.speed_kmh!, ...prev].slice(0, 8));
            if (msg.phase === 'result') {
              setShowFlash(true);
              setTimeout(() => setShowFlash(false), 1500);
              // Auto-broadcast when a speed result is confirmed
              broadcastSpeed(msg.speed_kmh);
            }
          }
          drawOverlay(msg);
        } else if (msg.type === 'error') {
          setErrorMsg(msg.message || 'Unknown worker error');
          setStatus('error');
        }
      };

      worker.onerror = (e) => {
        setErrorMsg('Worker error: ' + (e.message || 'Script failed to execute'));
        setStatus('error');
      };

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Camera access denied');
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    workerRef.current?.terminate();
    workerRef.current = null;
    workerReadyRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStatus('idle');
    setModelReady(false);
    setSpeedKmh(null);
    setPhase('idle');
  };

  const resetBall = () => {
    workerRef.current?.postMessage({ type: 'reset' });
    setSpeedKmh(null);
    setPhase('tracking');
  };

  useEffect(() => () => stopCamera(), []);

  const currentTier = speedKmh ? getSpeedTier(speedKmh) : null;
  const tierCfg = currentTier ? TIER_CONFIG[currentTier] : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column',
      maxWidth: '430px', margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: 'calc(16px + env(safe-area-inset-top,0px)) 16px 12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 60%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { stopCamera(); router.back(); }}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >←</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>⚡ Speed Cam</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', fontFamily: 'Barlow, sans-serif' }}>
              {status === 'running' ? (modelReady ? `${fps} fps · ${detectedBall ? '🔵 Tracking' : '⬜ Scanning'}` : 'Loading model…') : 'Tap to start'}
            </div>
          </div>
          <button
            onClick={() => setShowCalib(!showCalib)}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}
          >📐</button>
        </div>
      </div>

      {/* Video feed */}
      <div style={{ position: 'relative', flex: 1 }} onClick={handleCalibClick}>
        <video
          ref={videoRef}
          playsInline muted autoPlay
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {/* Overlay canvas for detection viz */}
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        
        {/* Calibration Markers */}
        {calibPoint1 && overlayRef.current && (
          <div style={{ position: 'absolute', left: `${(calibPoint1.x / overlayRef.current.width) * 100}%`, top: `${(calibPoint1.y / overlayRef.current.height) * 100}%`, width: '16px', height: '16px', marginLeft: '-8px', marginTop: '-8px', background: '#f97316', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 8px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
        )}
        {calibPoint2 && overlayRef.current && (
          <div style={{ position: 'absolute', left: `${(calibPoint2.x / overlayRef.current.width) * 100}%`, top: `${(calibPoint2.y / overlayRef.current.height) * 100}%`, width: '16px', height: '16px', marginLeft: '-8px', marginTop: '-8px', background: '#30d158', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 8px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
        )}

        {/* Speed flash overlay */}
        {showFlash && (
          <div style={{
            position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${tierCfg?.bg ?? 'rgba(249,115,22,.3)'} 0%, transparent 70%)`,
            pointerEvents: 'none', animation: 'fadeInOut 1.5s ease forwards',
          }} />
        )}

        {/* Synced badge */}
        {syncedToScorer && (
          <div style={{
            position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(48,209,88,.15)', border: '1px solid rgba(48,209,88,.4)',
            borderRadius: '20px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 700, color: '#30d158',
            animation: 'fadeInOut 3s ease forwards', whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            ✓ Speed synced to scorer &amp; viewers
          </div>
        )}

        {/* Start screen */}
        {status === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '20px',
            background: 'rgba(0,0,0,0.85)',
          }}>
            <div style={{ fontSize: '72px' }}>🏏</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif' }}>Ball Speed Camera</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', marginTop: '6px', maxWidth: '260px', lineHeight: 1.5 }}>
                Point camera at the pitch. AI detects the ball and calculates speed — no cloud, all on-device.
              </div>
            </div>
            <button
              onClick={startCamera}
              style={{
                background: '#E31B23', border: 'none', color: '#fff', borderRadius: '50%',
                width: '80px', height: '80px', cursor: 'pointer', fontSize: '32px',
                boxShadow: '0 0 40px rgba(227,27,35,.5)', fontWeight: 800,
              }}
            >▶</button>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
              Uses YOLO ball detection · No video stored · 100% private
            </div>
          </div>
        )}

        {/* Loading screen */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '16px',
            background: 'rgba(0,0,0,0.8)',
          }}>
            <div style={{ fontSize: '36px' }}>🧠</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Loading AI Model…</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>YOLOv8n · ~6MB · First time only</div>
            {/* Progress bar */}
            <div style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${loadProgress}%`, background: '#E31B23', borderRadius: '2px', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>
              WebGPU → WASM fallback if unsupported
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'rgba(0,0,0,0.9)', padding: '32px' }}>
            <div style={{ fontSize: '48px' }}>📵</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f87171', textAlign: 'center' }}>{errorMsg}</div>
            <button onClick={() => { setStatus('idle'); setErrorMsg(''); }} style={{ background: '#E31B23', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      {status === 'running' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          padding: '12px 16px calc(20px + env(safe-area-inset-bottom,0px))',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 70%, transparent)',
        }}>

          {/* Calibration panel */}
          {showCalib && (
            <div style={{ background: 'rgba(30,30,30,0.95)', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', border: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>📐 Calibration</span>
                <span style={{ color: '#fff' }}>{pitchPx}px</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', whiteSpace: 'nowrap' }}>Pitch Length (m)</div>
                <input
                  type="number" value={pitchLengthM}
                  onChange={e => {
                    const m = parseFloat(e.target.value) || 20.12;
                    setPitchLengthM(m);
                    workerRef.current?.postMessage({ type: 'calibrate', data: { pixelsPerMeter: pitchPx / m } });
                  }}
                  style={{ width: '70px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '13px' }}
                  step="0.1"
                />
              </div>

              {calibState === 'idle' || calibState === 'done' ? (
                <button
                  onClick={() => { setCalibState('point1'); setCalibPoint1(null); setCalibPoint2(null); }}
                  style={{ width: '100%', background: 'rgba(48,209,88,0.2)', border: '1px solid rgba(48,209,88,0.5)', color: '#30d158', padding: '8px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Tap to Set Wickets
                </button>
              ) : (
                <div style={{ background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.5)', color: '#f97316', padding: '8px', borderRadius: '6px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                  {calibState === 'point1' ? 'Tap Bowler\'s Wicket' : 'Tap Batsman\'s Wicket'}
                </div>
              )}
            </div>
          )}

          {/* Main speed display — IPL style */}
          {speedKmh ? (
            <div style={{
              background: tierCfg ? tierCfg.bg : 'rgba(30,30,30,0.95)',
              border: `1px solid ${tierCfg?.border ?? 'rgba(255,255,255,.1)'}`,
              borderRadius: '16px', padding: '14px 20px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '14px',
              boxShadow: tierCfg ? `0 0 32px ${tierCfg.border}` : 'none',
              animation: showFlash ? 'score-pop .4s cubic-bezier(0.34,1.56,.64,1)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                  ⚡ SPEED
                </div>
                <div style={{
                  fontSize: '56px', fontWeight: 900, lineHeight: 1, letterSpacing: '-2px',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  color: tierCfg?.color ?? '#fff',
                }}>
                  {Math.round(speedKmh)}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>km/h</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{tierCfg?.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: tierCfg?.color ?? '#fff', letterSpacing: '1px' }}>
                  {tierCfg?.label}
                </div>
                {/* Mini history */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {lastSpeeds.slice(1).map((s, i) => (
                    <div key={i} style={{
                      fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.5)',
                      background: 'rgba(255,255,255,.07)', borderRadius: '4px', padding: '2px 5px',
                    }}>{Math.round(s)}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,.07)',
              borderRadius: '16px', padding: '16px 20px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div>
                <div style={{ fontSize: '44px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'rgba(255,255,255,.15)', lineHeight: 1 }}>---</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>km/h</div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', lineHeight: 1.5 }}>
                {phase === 'tracking' ? 'Scanning for ball…\nBowl a delivery to measure speed' : 
                 phase === 'release' ? '📍 Release detected!\nTracking flight…' : 'Waiting for next delivery…'}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={resetBall}
              style={{ flex: 1, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ↺ Next Ball
            </button>
            <button
              onClick={stopCamera}
              style={{ flex: 1, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', borderRadius: '10px', padding: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              ■ Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
