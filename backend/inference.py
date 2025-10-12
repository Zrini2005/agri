import numpy as np
from PIL import Image
import os
import requests

# Try to import TensorFlow, but don't fail if it's not available
try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
    print("TensorFlow loaded successfully")
except Exception as e:
    print(f"Warning: TensorFlow not available: {e}")
    print("Will use fallback color-based detection")
    TF_AVAILABLE = False
    tf = None
    keras = None

model = None

def download_model():
    """Download the model file if not present"""
    model_path = "vegetation_segmentation_model"
    model_file = os.path.join(model_path, "model.h5")
    
    # If model exists locally and is valid, use it
    if os.path.exists(model_file):
        try:
            with open(model_file, 'rb') as f:
                # Check if it's a valid HDF5 file
                if f.read(4) == b'\x89HDF':
                    print("Using existing model file")
                    return model_file
                else:
                    print("Existing model file is invalid, will download")
                    os.remove(model_file)
        except Exception as e:
            print(f"Error checking existing model: {e}")
            os.remove(model_file)
    
    print(f"Downloading model to {model_file}")
    os.makedirs(model_path, exist_ok=True)
    
    # Get HuggingFace token from environment variable
    hf_token = os.environ.get('HUGGINGFACE_TOKEN')
    if not hf_token:
        raise Exception("HUGGINGFACE_TOKEN environment variable not set and no valid local model found. "
                      "Please either provide a local model at vegetation_segmentation_model/model.h5 "
                      "or set HUGGINGFACE_TOKEN with your access token.")
    
    # Try alternative URLs if the main one fails
    urls = [
        "https://huggingface.co/markrodrigo/vegetation-segmentation-model/resolve/main/model.h5",
        "https://huggingface.co/markrodrigo/vegetation-segmentation-model/raw/main/model.h5"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': f'Bearer {hf_token}'
    }
    
    for url in urls:
        try:
            print(f"Trying to download from: {url}")
            response = requests.get(url, allow_redirects=True, headers=headers)
            response.raise_for_status()
            
            # Check if the response is actually an H5 file (should start with '\x89HDF')
            if not response.content.startswith(b'\x89HDF'):
                print("Downloaded file is not a valid H5 file, trying next URL")
                continue
                
            with open(model_file, "wb") as f:
                f.write(response.content)
            print("Model downloaded successfully")
            return model_file
            
        except Exception as e:
            print(f"Error downloading from {url}: {str(e)}")
            continue
    
    raise Exception("Failed to download model from all URLs")

def load_model():
    global model
    if model is not None:
        return
    
    if not TF_AVAILABLE:
        print("TensorFlow not available, will use fallback detection")
        return
        
    print("Loading model...")
    try:
        model_path = "vegetation_segmentation_model/model.h5"
        print(f"Loading model from {model_path}")
        
        if not os.path.exists(model_path):
            print("Error: Model file not found at", model_path)
            raise FileNotFoundError(f"Model file not found at {model_path}")
        else:
            print("Loading pre-trained model...")
            # Try to load the model with custom object scope
            with tf.keras.utils.custom_object_scope({
                'InputLayer': tf.keras.layers.InputLayer,
                'Dense': tf.keras.layers.Dense,
                'BatchNormalization': tf.keras.layers.BatchNormalization,
                'Dropout': tf.keras.layers.Dropout,
                'input_layer': tf.keras.layers.InputLayer
            }):
                try:
                    config = {
                        'custom_objects': {
                            'BatchNormalization': tf.keras.layers.BatchNormalization,
                            'Dense': tf.keras.layers.Dense,
                            'Dropout': tf.keras.layers.Dropout
                        },
                        'compile': False
                    }
                    model = tf.keras.models.load_model(model_path, **config)
                    print("Model loaded successfully")
                except Exception as e1:
                    print(f"First loading attempt failed: {e1}")
                    try:
                        # Create the exact model architecture that was used for training
                        model = tf.keras.Sequential([
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
                        
                        print("Model architecture created, trying to load weights...")
                        model.load_weights(model_path)
                        print("Model weights loaded successfully")
                    except Exception as e2:
                        print(f"Second loading attempt failed: {e2}")
                        raise e2
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise

def run_inference(image_path):
    """
    Run inference on an image. Uses TensorFlow model if available,
    otherwise falls back to simple color-based vegetation detection.
    """
    try:
        # Try to use TensorFlow model if available
        if TF_AVAILABLE:
            load_model()
        
        print(f"Processing image: {image_path}")
        
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_array = np.array(img)
        print(f"Image loaded, shape: {img_array.shape}")
        
        # If TensorFlow is available and model loaded, use it
        if TF_AVAILABLE and model is not None:
            try:
                # Resize image to model's expected size (150x150)
                input_size = (150, 150)
                img_resized = tf.image.resize(img_array, input_size)
                img_normalized = img_resized / 255.0  # Normalize to [0,1]
                print(f"Image preprocessed, shape: {img_normalized.shape}")
                
                # Add batch dimension
                img_batch = np.expand_dims(img_normalized, axis=0)
                
                print(f"Original size: {img_array.shape}")
                print(f"Resized to: {img_resized.shape}")
                
                # Run prediction
                prediction = model.predict(img_batch)[0]
                print(f"Prediction shape: {prediction.shape}, value: {prediction[0]}")
                
                # Create a binary mask based on the prediction
                mask = np.ones((img_array.shape[0], img_array.shape[1])) if prediction[0] > 0.5 else np.zeros((img_array.shape[0], img_array.shape[1]))
                
                # Calculate vegetation percentage
                total_pixels = mask.shape[0] * mask.shape[1]
                vegetation_pixels = np.sum(mask > 0.5)
                vegetation_percentage = (vegetation_pixels / total_pixels) * 100
                
                print(f"\nTensorFlow Model Results:")
                print(f"Total pixels: {total_pixels}")
                print(f"Vegetation pixels: {vegetation_pixels}")
                print(f"Vegetation percentage: {vegetation_percentage:.2f}%")
                
                return mask, vegetation_percentage
                
            except Exception as model_error:
                print(f"TensorFlow model failed: {str(model_error)}")
                print("Falling back to color-based detection...")
        
        # Fallback: Simple color-based vegetation detection
        print("Using color-based vegetation detection...")
        
        # Convert to HSV for better color detection
        from PIL import ImageOps
        
        # Method 1: Simple green detection
        # Vegetation typically has: Green > Red, Green > Blue, and sufficient green intensity
        green_channel = img_array[:, :, 1].astype(float)
        red_channel = img_array[:, :, 0].astype(float)
        blue_channel = img_array[:, :, 2].astype(float)
        
        # Create vegetation mask
        # Conditions: green > red, green > blue, green intensity > threshold
        mask = ((green_channel > red_channel) & 
                (green_channel > blue_channel) & 
                (green_channel > 50)).astype(np.float32)
        
        # Optional: Add additional greenness metric
        # ExG (Excess Green Index) = 2*G - R - B
        exg = 2 * green_channel - red_channel - blue_channel
        exg_normalized = (exg - exg.min()) / (exg.max() - exg.min() + 1e-8)
        
        # Combine both methods
        combined_mask = ((mask > 0) | (exg_normalized > 0.5)).astype(np.float32)
        
        # Calculate vegetation percentage
        total_pixels = combined_mask.shape[0] * combined_mask.shape[1]
        vegetation_pixels = np.sum(combined_mask > 0.5)
        vegetation_percentage = (vegetation_pixels / total_pixels) * 100
        
        print(f"\nColor-based Detection Results:")
        print(f"Total pixels: {total_pixels}")
        print(f"Vegetation pixels: {vegetation_pixels}")
        print(f"Vegetation percentage: {vegetation_percentage:.2f}%")
        
        return combined_mask, vegetation_percentage
        
    except Exception as e:
        print(f"Error during inference: {str(e)}")
        import traceback
        traceback.print_exc()
        raise