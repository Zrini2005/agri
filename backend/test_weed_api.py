"""Quick test to trigger weed detection endpoint"""
import requests
import os

# Find a test image
test_images = []
for root, dirs, files in os.walk('static/uploads'):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            test_images.append(os.path.join(root, file))
            break
    if test_images:
        break

if not test_images:
    print("No test images found in static/uploads")
    exit(1)

test_image = test_images[0]
print(f"Using test image: {test_image}")

# Test weed detection
url = "http://localhost:8000/inference/analyze"
files = {'file': open(test_image, 'rb')}
data = {'mode': 'weed'}

print("\nSending weed detection request...")
response = requests.post(url, files=files, data=data)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print(f"Weed Coverage: {result.get('vegetation_percentage', 'N/A')}%")
    print(f"Has plotted image: {'plotted_image' in result}")
else:
    print(f"Error: {response.text}")
