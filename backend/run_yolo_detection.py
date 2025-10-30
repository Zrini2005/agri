"""
Standalone YOLO weed detection script that can be called as a subprocess.
This avoids DLL loading issues in the main server process.
"""
import sys
import os
import json
import numpy as np
from PIL import Image

# Import YOLO
from ultralytics import YOLO
import cv2

def run_yolo_detection(image_path, output_dir="static/results"):
    """Run YOLO detection and return results as JSON"""
    
    print("="*80, file=sys.stderr)
    print("🤖 YOLO Detection Function Started", file=sys.stderr)
    print("="*80, file=sys.stderr)
    
    # Load YOLO model
    model_path = os.path.join('vegetation_segmentation_model', 'best.pt')
    print(f"🎯 Model path: {model_path}", file=sys.stderr)
    print(f"✅ Model exists: {os.path.exists(model_path)}", file=sys.stderr)
    print(f"📁 Image path: {image_path}", file=sys.stderr)
    print(f"✅ Image exists: {os.path.exists(image_path)}", file=sys.stderr)
    
    print(f"\n🔧 Loading YOLO model...", file=sys.stderr)
    # Suppress YOLO verbose output
    model = YOLO(model_path, verbose=False)
    print(f"✅ YOLO model loaded successfully", file=sys.stderr)
    
    # Read image
    print(f"\n📖 Reading image...", file=sys.stderr)
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Failed to read image!", file=sys.stderr)
        return {"success": False, "error": "Failed to read image"}
    print(f"✅ Image loaded: shape {img.shape}", file=sys.stderr)
    
    # Run inference with verbose=False to suppress output
    print(f"\n🔍 Running YOLO inference...", file=sys.stderr)
    results = model(img, verbose=False)
    res = results[0]
    print(f"✅ Inference completed", file=sys.stderr)
    
    # Generate plotted image
    print(f"\n🎨 Generating plotted image...", file=sys.stderr)
    plotted = res.plot()
    plotted_rgb = cv2.cvtColor(plotted, cv2.COLOR_BGR2RGB)
    print(f"✅ Plotted image generated: shape {plotted_rgb.shape}", file=sys.stderr)
    
    # Save plotted image
    os.makedirs(output_dir, exist_ok=True)
    basename = os.path.basename(image_path)
    name_without_ext = os.path.splitext(basename)[0]
    plotted_filename = f"yolo_plotted_{name_without_ext}.jpg"
    plotted_path = os.path.join(output_dir, plotted_filename)
    
    plotted_pil = Image.fromarray(plotted_rgb)
    plotted_pil.save(plotted_path, 'JPEG', quality=95)
    print(f"💾 Saved plotted image to: {plotted_path}", file=sys.stderr)
    
    # Create mask from detections
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.float32)
    print(f"\n📐 Mask initialized: {h}x{w}", file=sys.stderr)
    
    # Count detections by class
    weed_count = 0
    crop_count = 0
    
    if hasattr(res, 'boxes') and res.boxes is not None and len(res.boxes) > 0:
        boxes = res.boxes.xyxy.cpu().numpy()
        classes = res.boxes.cls.cpu().numpy()
        
        print(f"\n📦 Processing {len(boxes)} detections...", file=sys.stderr)
        for i, (box, cls) in enumerate(zip(boxes, classes)):
            x1, y1, x2, y2 = [int(round(v)) for v in box[:4]]
            x1 = max(0, min(x1, w - 1))
            x2 = max(0, min(x2, w - 1))
            y1 = max(0, min(y1, h - 1))
            y2 = max(0, min(y2, h - 1))
            
            # Mark area in mask
            mask[y1:y2, x1:x2] = 1.0
            
            # Count by class (0=crop, 1=weed)
            class_name = "weed" if int(cls) == 1 else "crop"
            if int(cls) == 1:
                weed_count += 1
            else:
                crop_count += 1
            
            print(f"  Detection {i+1}: class={class_name} ({int(cls)}), box=[{x1},{y1},{x2},{y2}]", file=sys.stderr)
    else:
        print("ℹ️ No detections found", file=sys.stderr)
    
    # Calculate coverage percentage
    coverage_pct = (np.sum(mask > 0.5) / mask.size) * 100
    print(f"\n📈 Detection Summary:", file=sys.stderr)
    print(f"  🦠 Weeds: {weed_count}", file=sys.stderr)
    print(f"  🌿 Crops: {crop_count}", file=sys.stderr)
    print(f"  📊 Total: {weed_count + crop_count}", file=sys.stderr)
    print(f"  📈 Coverage: {coverage_pct:.2f}%", file=sys.stderr)
    
    # Save mask
    mask_normalized = (mask * 255).astype(np.uint8)
    mask_filename = f"yolo_mask_{name_without_ext}.png"
    mask_path = os.path.join(output_dir, mask_filename)
    Image.fromarray(mask_normalized, mode='L').save(mask_path, 'PNG')
    print(f"💾 Saved mask to: {mask_path}", file=sys.stderr)
    
    # Return results as JSON
    result = {
        "success": True,
        "coverage_percentage": float(coverage_pct),
        "weed_count": int(weed_count),
        "crop_count": int(crop_count),
        "total_detections": int(weed_count + crop_count),
        "plotted_image_path": plotted_path,
        "mask_path": mask_path
    }
    
    print("="*80, file=sys.stderr)
    print("✅ YOLO Detection Completed Successfully", file=sys.stderr)
    print("="*80, file=sys.stderr)
    
    return result

if __name__ == "__main__":
    print("="*80, file=sys.stderr)
    print("🚀 YOLO Detection Script Main", file=sys.stderr)
    print("="*80, file=sys.stderr)
    print(f"📋 Arguments: {sys.argv}", file=sys.stderr)
    
    if len(sys.argv) < 2:
        error_msg = {"success": False, "error": "No image path provided"}
        print(f"❌ Error: No image path provided", file=sys.stderr)
        print(json.dumps(error_msg))
        sys.exit(1)
    
    image_path = sys.argv[1]
    print(f"📁 Image path: {image_path}", file=sys.stderr)
    
    if not os.path.exists(image_path):
        error_msg = {"success": False, "error": f"Image not found: {image_path}"}
        print(f"❌ Error: Image not found: {image_path}", file=sys.stderr)
        print(json.dumps(error_msg))
        sys.exit(1)
    
    print(f"✅ Image file exists", file=sys.stderr)
    
    try:
        print(f"\n🎬 Starting YOLO detection...", file=sys.stderr)
        result = run_yolo_detection(image_path)
        
        print(f"\n📤 Outputting JSON result to stdout...", file=sys.stderr)
        print(json.dumps(result))
        print(f"✅ Script completed successfully", file=sys.stderr)
        
    except Exception as e:
        import traceback
        error_msg = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(f"\n💥 Exception occurred:", file=sys.stderr)
        print(f"❌ Error: {str(e)}", file=sys.stderr)
        print(f"🔍 Traceback:", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        print(json.dumps(error_msg))
        sys.exit(1)
