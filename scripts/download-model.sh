#!/bin/bash
# Downloads a pre-converted YOLOv8n ONNX model (COCO sports-ball)
# for the ball speed camera pipeline.
# 
# The model uses COCO class 32 (sports ball) which works for cricket balls
# in good lighting. For better cricket-specific accuracy, see the fine-tuning
# instructions below.

set -e

MODEL_DIR="$(dirname "$0")/../public/models"
mkdir -p "$MODEL_DIR"

echo "📦 Downloading YOLOv8n ONNX model (~6.3MB)..."

# Ultralytics provides official ONNX exports. We use yolov8n (nano) which is
# ~6MB, fast enough for 30fps on mobile WebGPU.
# Alternative: use the quantized INT8 version (~3MB) if bandwidth is a concern.

MODEL_URL="https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"

# Note: Ultralytics doesn't publish pre-exported .onnx directly on their releases.
# The recommended approach is to export it yourself:
#
#   pip install ultralytics
#   yolo export model=yolov8n.pt format=onnx imgsz=640 opset=12 simplify
#
# This creates yolov8n.onnx (6.3MB) which you then copy to public/models/
#
# OR: Download from ONNX Model Zoo / Hugging Face:

HF_URL="https://huggingface.co/Xenova/yolov8n/resolve/main/onnx/model.onnx"

if command -v curl &>/dev/null; then
  echo "Trying Hugging Face ONNX model..."
  curl -L --progress-bar -o "$MODEL_DIR/yolov8n-sports.onnx" "$HF_URL" || {
    echo "⚠️  Download failed. Please manually export and place yolov8n.onnx at:"
    echo "   $MODEL_DIR/yolov8n-sports.onnx"
    echo ""
    echo "   Quick export: pip install ultralytics && yolo export model=yolov8n.pt format=onnx imgsz=640 opset=12 simplify"
    exit 1
  }
elif command -v wget &>/dev/null; then
  wget -q --show-progress -O "$MODEL_DIR/yolov8n-sports.onnx" "$HF_URL"
else
  echo "⚠️  Neither curl nor wget found. Please manually place the model at:"
  echo "   $MODEL_DIR/yolov8n-sports.onnx"
  exit 1
fi

echo ""
echo "✅ Model downloaded: $MODEL_DIR/yolov8n-sports.onnx"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 For better cricket ball accuracy, fine-tune on cricket dataset:"
echo ""
echo "   1. Get dataset: https://www.kaggle.com/datasets/kushagra3204/cricket-ball-dataset-for-yolo"
echo "   2. Train: yolo train model=yolov8n.pt data=cricket_ball.yaml epochs=50 imgsz=640"
echo "   3. Export: yolo export model=runs/detect/train/weights/best.pt format=onnx imgsz=640 opset=12 simplify"
echo "   4. Copy best.onnx → public/models/yolov8n-sports.onnx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
