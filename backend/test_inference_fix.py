"""
Quick test to verify the inference fix works
"""

print("🧪 Testing Inference Module...")
print("="*60)

# Test 1: Import the module
print("\n1️⃣ Testing import...")
try:
    from inference import run_inference, TF_AVAILABLE
    print("✅ Import successful!")
    print(f"   TensorFlow available: {TF_AVAILABLE}")
except Exception as e:
    print(f"❌ Import failed: {e}")
    exit(1)

# Test 2: Check if we have a test image
print("\n2️⃣ Checking for test image...")
import os
test_images = []
if os.path.exists("static/uploads"):
    test_images = [f for f in os.listdir("static/uploads") if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

if test_images:
    test_image = os.path.join("static/uploads", test_images[0])
    print(f"✅ Found test image: {test_image}")
else:
    print("⚠️  No test images found in static/uploads/")
    print("   Creating a simple test image...")
    
    # Create a test image with green pixels
    from PIL import Image
    import numpy as np
    
    os.makedirs("static/uploads", exist_ok=True)
    
    # Create 100x100 image with green vegetation pattern
    img_array = np.zeros((100, 100, 3), dtype=np.uint8)
    # Make top half green (vegetation)
    img_array[:50, :, 1] = 150  # Green channel
    img_array[:50, :, 0] = 50   # Red channel
    img_array[:50, :, 2] = 30   # Blue channel
    # Make bottom half brown (soil)
    img_array[50:, :, 0] = 139
    img_array[50:, :, 1] = 90
    img_array[50:, :, 2] = 43
    
    img = Image.fromarray(img_array)
    test_image = "static/uploads/test_vegetation.jpg"
    img.save(test_image)
    print(f"✅ Created test image: {test_image}")

# Test 3: Run inference
print("\n3️⃣ Running inference...")
try:
    mask, vegetation_percentage = run_inference(test_image)
    print(f"✅ Inference successful!")
    print(f"   Vegetation detected: {vegetation_percentage:.2f}%")
    print(f"   Mask shape: {mask.shape}")
    print(f"   Mask min/max: {mask.min():.2f} / {mask.max():.2f}")
except Exception as e:
    print(f"❌ Inference failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test 4: Verify output files were created
print("\n4️⃣ Checking output files...")
if os.path.exists("static/results"):
    results = os.listdir("static/results")
    print(f"✅ Results directory exists with {len(results)} files")
else:
    print("ℹ️  No results directory yet (created on first API call)")

print("\n" + "="*60)
print("🎉 ALL TESTS PASSED!")
print("="*60)
print("\n✨ Inference system is working correctly!")
print("\nNext steps:")
print("1. Make sure backend is running: python main.py")
print("2. Access frontend: http://localhost:3000/inference")
print("3. Upload an image and click 'Analyze'")
print("\n" + "="*60)
