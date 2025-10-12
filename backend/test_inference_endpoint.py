"""
Test script for the inference endpoint
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "admin"  # Change to your username
PASSWORD = "admin"  # Change to your password
IMAGE_PATH = "static/uploads/weed.jpg"  # Change to your test image path

def test_inference_endpoint():
    print("🧪 Testing Inference Endpoint\n")
    print("="*60)
    
    # Step 1: Login to get token
    print("\n1️⃣ Logging in...")
    try:
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": USERNAME,
                "password": PASSWORD
            }
        )
        login_response.raise_for_status()
        token = login_response.json()["access_token"]
        print(f"✅ Login successful! Token: {token[:20]}...")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return
    
    # Step 2: Check if endpoint exists
    print("\n2️⃣ Checking endpoint availability...")
    try:
        # Try to access docs to see if server is running
        docs_response = requests.get(f"{BASE_URL}/docs")
        if docs_response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"⚠️  Server responded with status: {docs_response.status_code}")
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        return
    
    # Step 3: Upload and analyze image
    print("\n3️⃣ Uploading image for analysis...")
    try:
        with open(IMAGE_PATH, 'rb') as img_file:
            files = {'file': (IMAGE_PATH.split('/')[-1], img_file, 'image/jpeg')}
            headers = {'Authorization': f'Bearer {token}'}
            
            print(f"   Uploading: {IMAGE_PATH}")
            response = requests.post(
                f"{BASE_URL}/inference/analyze",
                files=files,
                headers=headers
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("\n✅ SUCCESS! Analysis Results:")
                print("="*60)
                print(f"🌿 Vegetation Percentage: {result['vegetation_percentage']}%")
                print(f"📅 Timestamp: {result['timestamp']}")
                print(f"📁 Original Path: {result['original_path']}")
                print(f"📁 Mask Path: {result['mask_path']}")
                print(f"📁 Overlay Path: {result['overlay_path']}")
                print("\n✨ Image data received:")
                print(f"   Original: {len(result['original_image'])} bytes (base64)")
                print(f"   Mask: {len(result['mask_image'])} bytes (base64)")
                print(f"   Overlay: {len(result['overlay_image'])} bytes (base64)")
            elif response.status_code == 404:
                print("\n❌ ERROR: Endpoint not found (404)")
                print("   The /inference/analyze endpoint doesn't exist.")
                print("\n🔧 Solution:")
                print("   1. Make sure main.py has the endpoint")
                print("   2. RESTART the backend server:")
                print("      - Stop the current server (Ctrl+C)")
                print("      - Run: python main.py")
            elif response.status_code == 401:
                print("\n❌ ERROR: Unauthorized (401)")
                print("   Token is invalid or expired.")
            else:
                print(f"\n❌ ERROR: {response.status_code}")
                print(f"   Response: {response.text}")
                
    except FileNotFoundError:
        print(f"\n❌ ERROR: Image file not found: {IMAGE_PATH}")
        print("   Please update IMAGE_PATH in this script to point to a valid image.")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*60)

if __name__ == "__main__":
    test_inference_endpoint()
