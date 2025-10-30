import numpy as np
from PIL import Image
import os
import requests

# OpenCV is optional; some plotting code prefers it
try:
    import cv2
except Exception:
    cv2 = None

# Try to import TensorFlow, but don't fail if it's not available
try:
    import tensorflow as tf
    TF_AVAILABLE = True
    print("TensorFlow loaded successfully")
except Exception as e:
    print(f"Warning: TensorFlow not available: {e}")
    print("Will use fallback color-based detection")
    TF_AVAILABLE = False
    tf = None

# Try to import PyTorch / ultralytics for using the provided best.pt model
TORCH_AVAILABLE = False
ULTRALYTICS_AVAILABLE = False
pt_model = None
tf_model = None
model = None

try:
    import torch
    TORCH_AVAILABLE = True
    print(f"✓ PyTorch loaded successfully: {torch.__version__}")
    # Try ultralytics first (recommended for .pt YOLO/segmentation models)
    try:
        from ultralytics import YOLO
        ULTRALYTICS_AVAILABLE = True
        print("✓ Ultralytics YOLO package loaded successfully")
    except Exception as ue:
        print(f"✗ Ultralytics not available: {ue}")
        ULTRALYTICS_AVAILABLE = False
except Exception as e:
    print(f"✗ PyTorch not available: {e}")
    TORCH_AVAILABLE = False


def download_model():
    """Download the TensorFlow .h5 model if not present.

    This function is primarily for the vegetation (TF) model.
    """
    model_path = "vegetation_segmentation_model"
    model_file = os.path.join(model_path, "model.h5")

    if os.path.exists(model_file):
        return model_file

    print(f"Downloading model to {model_file}")
    os.makedirs(model_path, exist_ok=True)

    hf_token = os.environ.get('HUGGINGFACE_TOKEN')
    if not hf_token:
        raise Exception("HUGGINGFACE_TOKEN environment variable not set and no local model.h5 found")

    urls = [
        "https://huggingface.co/markrodrigo/vegetation-segmentation-model/resolve/main/model.h5",
        "https://huggingface.co/markrodrigo/vegetation-segmentation-model/raw/main/model.h5",
    ]

    headers = {'User-Agent': 'Mozilla/5.0', 'Authorization': f'Bearer {hf_token}'}
    for url in urls:
        try:
            resp = requests.get(url, allow_redirects=True, headers=headers)
            resp.raise_for_status()
            if not resp.content.startswith(b'\x89HDF'):
                continue
            with open(model_file, 'wb') as f:
                f.write(resp.content)
            return model_file
        except Exception:
            continue

    raise Exception("Failed to download TF model from known URLs")


def load_model():
    """Load available models into global variables.

    Priority:
      - ultralytics .pt (weed detection) if available
      - TensorFlow .h5 (vegetation) if available
    """
    global model, pt_model, tf_model

    # If already loaded, do nothing
    if pt_model is not None or tf_model is not None:
        return

    # Try to load PyTorch/Ultralytics model first (weed)
    pt_path = os.path.join('vegetation_segmentation_model', 'best.pt')
    if TORCH_AVAILABLE and ULTRALYTICS_AVAILABLE and os.path.exists(pt_path):
        try:
            print(f"Loading PyTorch/Ultralytics model from {pt_path}")
            pt_model = YOLO(pt_path)
            model = pt_model
            print("PyTorch/Ultralytics model loaded successfully")
            # don't return; we still may load TF model later if needed
        except Exception as e:
            print(f"Failed to load PyTorch model: {e}")

    # Try to load TensorFlow model (vegetation)
    if TF_AVAILABLE:
        try:
            model_path = os.path.join('vegetation_segmentation_model', 'model.h5')
            if not os.path.exists(model_path):
                # attempt to download if env provided
                try:
                    downloaded = download_model()
                    model_path = downloaded
                except Exception:
                    print('No local TF model and download failed or HUGGINGFACE_TOKEN not set')
                    return

            print(f"Loading TensorFlow model from {model_path}")
            # Best-effort load with compile=False
            try:
                tf_model = tf.keras.models.load_model(model_path, compile=False)
                model = tf_model if model is None else model
                print('TensorFlow model loaded successfully')
            except Exception as e:
                print(f"TF load_model failed: {e}")
                # Try architecture + load_weights
                try:
                    tf_model = tf.keras.Sequential([
                        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(150, 150, 3)),
                        tf.keras.layers.BatchNormalization(),
                        tf.keras.layers.MaxPooling2D((2, 2)),
                        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
                        tf.keras.layers.BatchNormalization(),
                        tf.keras.layers.MaxPooling2D((2, 2)),
                        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
                        tf.keras.layers.BatchNormalization(),
                        tf.keras.layers.MaxPooling2D((2, 2)),
                        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
                        tf.keras.layers.BatchNormalization(),
                        tf.keras.layers.MaxPooling2D((2, 2)),
                        tf.keras.layers.Flatten(),
                        tf.keras.layers.Dropout(0.5),
                        tf.keras.layers.Dense(512, activation='relu'),
                        tf.keras.layers.BatchNormalization(),
                        tf.keras.layers.Dropout(0.5),
                        tf.keras.layers.Dense(256, activation='relu'),
                        tf.keras.layers.Dropout(0.5),
                        tf.keras.layers.Dense(1, activation='sigmoid')
                    ])
                    tf_model.load_weights(model_path)
                    model = tf_model if model is None else model
                    print('TF model weights loaded')
                except Exception as e2:
                    print(f'Failed to construct/load TF model: {e2}')
        except Exception as outer_e:
            print(f'Unexpected error while loading TF model: {outer_e}')


def run_inference(image_path, mode='vegetation'):
    """Run inference for the given mode.

    Returns:
      vegetation mode -> (mask: np.ndarray, percentage: float)
      weed mode -> (mask: np.ndarray, percentage: float, plotted_rgb: np.ndarray|None)
    """
    print("\n" + "="*80)
    print("🎯 RUN_INFERENCE CALLED")
    print("="*80)
    print(f"📁 Image path: {image_path}")
    print(f"🔧 Mode: '{mode}'")
    print(f"📂 Current directory: {os.getcwd()}")
    print("="*80 + "\n")
    
    # Read image with PIL for array operations
    img = Image.open(image_path).convert('RGB')
    img_array = np.array(img)

    # Color-based vegetation detection (ExG algorithm)
    def color_based_vegetation_mask(arr: np.ndarray):
        """Enhanced vegetation detection using Excess Green Index (ExG)"""
        green = arr[:, :, 1].astype(float)
        red = arr[:, :, 0].astype(float)
        blue = arr[:, :, 2].astype(float)
        
        # Basic green mask
        basic_mask = ((green > red) & (green > blue) & (green > 50)).astype(np.float32)
        
        # ExG (Excess Green Index) - more sophisticated
        exg = 2 * green - red - blue
        exg_norm = (exg - exg.min()) / (exg.max() - exg.min() + 1e-8)
        
        # Combine both methods
        combined = ((basic_mask > 0) | (exg_norm > 0.5)).astype(np.float32)
        pct = (np.sum(combined > 0.5) / combined.size) * 100
        
        print(f"Color-based vegetation detection: {pct:.2f}%")
        return combined, pct

    # VEGETATION MODE: Use color-based ExG algorithm only
    if mode == 'vegetation':
        print("Using ExG (Excess Green Index) for vegetation segmentation...")
        mask, pct = color_based_vegetation_mask(img_array)
        return mask, pct

    # WEED MODE: Use YOLO model (best.pt) via subprocess to avoid DLL issues
    if mode == 'weed':
        # Use subprocess to run YOLO detection with working Python environment
        import subprocess
        import json
        
        # Path to the venv python and the YOLO script
        venv_python = os.path.join(os.path.dirname(__file__), 'venv', 'Scripts', 'python.exe')
        yolo_script = os.path.join(os.path.dirname(__file__), 'run_yolo_detection.py')
        
        print("="*80)
        print("🔍 WEED DETECTION STARTED")
        print("="*80)
        print(f"📁 Image path: {image_path}")
        print(f"🐍 Python executable: {venv_python}")
        print(f"📜 YOLO script: {yolo_script}")
        print(f"📂 Working directory: {os.path.dirname(__file__)}")
        print(f"✅ Python exists: {os.path.exists(venv_python)}")
        print(f"✅ Script exists: {os.path.exists(yolo_script)}")
        print(f"✅ Image exists: {os.path.exists(image_path)}")
        
        try:
            print(f"\n🚀 Running YOLO detection subprocess...")
            
            # Run the YOLO script as subprocess
            result = subprocess.run(
                [venv_python, yolo_script, image_path],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.path.dirname(__file__)
            )
            
            print(f"\n📊 Subprocess completed with return code: {result.returncode}")
            
            if result.stdout:
                print(f"📤 STDOUT:\n{result.stdout}")
            if result.stderr:
                print(f"⚠️ STDERR:\n{result.stderr}")
            
            if result.returncode == 0:
                # Parse JSON output
                print(f"\n🔄 Parsing JSON output...")
                try:
                    yolo_result = json.loads(result.stdout)
                    print(f"✅ JSON parsed successfully")
                    print(f"📋 Result keys: {list(yolo_result.keys())}")
                except json.JSONDecodeError as je:
                    print(f"❌ JSON parsing failed: {je}")
                    print(f"Raw stdout: {repr(result.stdout)}")
                    raise
                
                if yolo_result.get('success'):
                    print(f"\n✅ YOLO detection successful!")
                    print(f"📊 Total detections: {yolo_result['total_detections']}")
                    print(f"🌿 Crops detected: {yolo_result['crop_count']}")
                    print(f"🦠 Weeds detected: {yolo_result['weed_count']}")
                    print(f"📈 Coverage: {yolo_result['coverage_percentage']:.2f}%")
                    print(f"🖼️ Plotted image: {yolo_result['plotted_image_path']}")
                    print(f"🎭 Mask path: {yolo_result['mask_path']}")
                    
                    # Load the mask
                    print(f"\n📂 Loading mask image...")
                    mask_img = Image.open(yolo_result['mask_path']).convert('L')
                    mask = np.array(mask_img).astype(np.float32) / 255.0
                    print(f"✅ Mask loaded: shape {mask.shape}")
                    
                    # Load the plotted image
                    print(f"📂 Loading plotted image...")
                    plotted_img = Image.open(yolo_result['plotted_image_path']).convert('RGB')
                    plotted_rgb = np.array(plotted_img)
                    print(f"✅ Plotted image loaded: shape {plotted_rgb.shape}")
                    
                    print("="*80)
                    print("✅ WEED DETECTION COMPLETED SUCCESSFULLY")
                    print("="*80)
                    
                    # Return mask, percentage, plotted_rgb, and detection stats
                    return (
                        mask, 
                        yolo_result['coverage_percentage'], 
                        plotted_rgb,
                        {
                            'weed_count': yolo_result['weed_count'],
                            'crop_count': yolo_result['crop_count'],
                            'total_detections': yolo_result['total_detections']
                        }
                    )
                else:
                    print(f"❌ YOLO detection reported failure: {yolo_result.get('error', 'Unknown error')}")
                    if 'traceback' in yolo_result:
                        print(f"🔍 Traceback:\n{yolo_result['traceback']}")
            else:
                print(f"❌ YOLO script failed with return code {result.returncode}")
                print(f"⚠️ STDERR: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            print(f"⏱️ YOLO subprocess timed out after 30 seconds")
        except Exception as e:
            print(f"💥 Subprocess YOLO detection failed with exception: {e}")
            import traceback
            print(f"🔍 Full traceback:")
            traceback.print_exc()
        
        # If we reach here, YOLO failed - use fallback
        print("YOLO detection failed, using color-based fallback...")
        
        # OLD CODE (keeping for reference but won't execute if subprocess works)
        if False and TORCH_AVAILABLE and ULTRALYTICS_AVAILABLE and pt_model is not None:
            try:
                print("Using YOLO model (best.pt) for weed detection...")
                
                # Read with cv2 if available for better compatibility
                if cv2 is not None:
                    cv_img = cv2.imread(image_path)
                    if cv_img is None:
                        raise RuntimeError('cv2 failed to read image')
                    results = pt_model(cv_img)
                else:
                    # ultralytics can take numpy RGB arrays too
                    results = pt_model(img_array)

                res = results[0]

                # Try to get plotted overlay
                plotted_rgb = None
                try:
                    plotted = res.plot()
                    if cv2 is not None:
                        plotted_rgb = cv2.cvtColor(plotted, cv2.COLOR_BGR2RGB)
                    else:
                        plotted_rgb = plotted
                except Exception as e:
                    print(f"Could not generate plotted image: {e}")
                    plotted_rgb = None

                # Build mask from instance masks if present
                if hasattr(res, 'masks') and res.masks is not None:
                    try:
                        mask_tensor = res.masks.data.cpu().numpy()
                        combined = np.any(mask_tensor > 0.5, axis=0).astype(np.float32)
                    except Exception as e:
                        print(f"Error processing masks: {e}")
                        combined = np.zeros((img_array.shape[0], img_array.shape[1]), dtype=np.float32)
                else:
                    # Use bounding boxes to create mask
                    combined = np.zeros((img_array.shape[0], img_array.shape[1]), dtype=np.float32)
                    try:
                        boxes = res.boxes.xyxy.cpu().numpy()
                        for box in boxes:
                            x1, y1, x2, y2 = [int(round(v)) for v in box[:4]]
                            x1 = max(0, min(x1, img_array.shape[1] - 1))
                            x2 = max(0, min(x2, img_array.shape[1] - 1))
                            y1 = max(0, min(y1, img_array.shape[0] - 1))
                            y2 = max(0, min(y2, img_array.shape[0] - 1))
                            combined[y1:y2, x1:x2] = 1.0
                    except Exception as e:
                        print(f"Error processing bounding boxes: {e}")

                pct = (np.sum(combined > 0.5) / combined.size) * 100
                print(f"YOLO weed detection: {pct:.2f}% coverage")
                return combined, pct, plotted_rgb
                
            except Exception as e:
                print(f'YOLO weed inference failed: {e}')
                import traceback
                traceback.print_exc()
                # Fall through to color-based detection

        # Fallback: Color-based weed detection (look for brown/yellow spots)
        print("YOLO model not available, using color-based weed detection fallback...")
        
        # Detect potential weed areas (non-green vegetation, brown/yellow spots)
        green = img_array[:, :, 1].astype(float)
        red = img_array[:, :, 0].astype(float)
        blue = img_array[:, :, 2].astype(float)
        
        # Look for brownish/yellowish areas that might be weeds
        brown_yellow_mask = ((red > green * 0.8) & (green > blue) & (red > 80)).astype(np.float32)
        
        # Also detect sparse green areas that might be weeds among crops
        sparse_green = ((green > red) & (green > blue) & (green < 120)).astype(np.float32)
        
        # Combine both
        combined = np.maximum(brown_yellow_mask, sparse_green)
        pct = (np.sum(combined > 0.5) / combined.size) * 100
        
        print(f"Color-based weed detection: {pct:.2f}% coverage")
        return combined, pct, None

    # Unknown mode
    raise ValueError(f'Unknown inference mode: {mode}')