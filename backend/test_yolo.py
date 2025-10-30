"""Test script to verify YOLO model loading"""
import os
import sys

print("=" * 60)
print("Testing YOLO Model Loading")
print("=" * 60)

# Check if PyTorch is available
try:
    import torch
    print(f"✓ PyTorch installed: {torch.__version__}")
    TORCH_AVAILABLE = True
except Exception as e:
    print(f"✗ PyTorch not available: {e}")
    TORCH_AVAILABLE = False
    sys.exit(1)

# Check if Ultralytics is available
try:
    from ultralytics import YOLO
    print(f"✓ Ultralytics installed")
    ULTRALYTICS_AVAILABLE = True
except Exception as e:
    print(f"✗ Ultralytics not available: {e}")
    ULTRALYTICS_AVAILABLE = False
    sys.exit(1)

# Check if best.pt exists
pt_path = os.path.join('vegetation_segmentation_model', 'best.pt')
if os.path.exists(pt_path):
    print(f"✓ Model file found: {pt_path}")
    file_size = os.path.getsize(pt_path) / (1024 * 1024)  # MB
    print(f"  File size: {file_size:.2f} MB")
else:
    print(f"✗ Model file NOT found: {pt_path}")
    sys.exit(1)

# Try to load the model
try:
    print(f"\nLoading YOLO model from {pt_path}...")
    model = YOLO(pt_path)
    print("✓ YOLO model loaded successfully!")
    
    # Print model info
    print("\nModel Information:")
    print(f"  Model type: {type(model)}")
    if hasattr(model, 'names'):
        print(f"  Classes: {model.names}")
    
except Exception as e:
    print(f"✗ Failed to load YOLO model: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("All checks passed! YOLO is ready to use.")
print("=" * 60)
