# AI Inference Feature Documentation

## Overview
The AI Inference feature allows users to upload aerial or drone images and analyze vegetation coverage using a deep learning model. The system provides vegetation segmentation masks and precise coverage percentages.

## Features

### 🎯 Core Functionality
- **Image Upload**: Drag-and-drop or browse to upload images (JPG, PNG, JPEG)
- **AI Analysis**: Runs vegetation segmentation using TensorFlow model
- **Visual Results**: 
  - Original image
  - Vegetation mask (grayscale)
  - Color overlay (green vegetation highlighted)
- **Metrics**: Precise vegetation coverage percentage
- **Download**: Save all result images

### 🎨 User Interface
- Clean, modern Material-UI design
- Real-time preview of uploaded images
- Progress indicators during analysis
- Color-coded vegetation percentage (green/orange/red)
- Responsive layout for desktop and mobile

## Technical Architecture

### Backend Endpoint
**POST** `/inference/analyze`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "vegetation_percentage": 78.45,
  "original_image": "data:image/jpeg;base64,...",
  "mask_image": "data:image/png;base64,...",
  "overlay_image": "data:image/png;base64,...",
  "original_path": "/static/uploads/20251012_123456_image.jpg",
  "mask_path": "/static/results/mask_20251012_123456_image.jpg",
  "overlay_path": "/static/results/overlay_20251012_123456.png",
  "timestamp": "2025-10-12T12:34:56.789Z"
}
```

### Frontend Component
**Location:** `frontend/src/pages/Inference.tsx`

**Key Features:**
- File upload with drag-and-drop
- Image preview
- Loading states
- Error handling
- Result visualization
- Download functionality

### AI Model
**Location:** `backend/vegetation_segmentation_model/model.h5`

**Specifications:**
- Input size: 150x150 RGB images
- Architecture: CNN with BatchNormalization and Dropout
- Output: Binary classification (vegetation/non-vegetation)
- Framework: TensorFlow/Keras

## File Structure

```
backend/
├── main.py                    # Added /inference/analyze endpoint
├── inference.py               # AI model loading and inference logic
├── static/
│   ├── uploads/              # Uploaded images
│   └── results/              # Generated masks and overlays
└── vegetation_segmentation_model/
    └── model.h5              # Pre-trained model

frontend/
├── src/
│   ├── pages/
│   │   └── Inference.tsx     # Main inference page
│   ├── components/
│   │   └── Layout.tsx        # Updated with "AI Inference" menu
│   └── App.tsx               # Added /inference route
```

## Setup Instructions

### 1. Backend Setup

**Install Dependencies:**
```bash
cd backend
pip install tensorflow pillow numpy
```

**Download Model (if not present):**
```bash
# Set HuggingFace token (if downloading from HuggingFace)
export HUGGINGFACE_TOKEN="your_token_here"

# Run download
python -c "from inference import download_model; download_model()"
```

**Or Place Model Manually:**
- Download `model.h5`
- Place in `backend/vegetation_segmentation_model/model.h5`

### 2. Frontend Setup

No additional setup needed - dependencies already in package.json.

### 3. Start Services

**Backend:**
```bash
cd backend
python main.py
# Server runs on http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

## Usage Guide

### For End Users

1. **Login** to the application
2. Navigate to **"AI Inference"** from the sidebar
3. **Upload Image**:
   - Click the upload area or drag and drop an image
   - Supported formats: JPG, PNG, JPEG
4. **Analyze**:
   - Click "Analyze Image" button
   - Wait for processing (usually 2-5 seconds)
5. **View Results**:
   - Vegetation percentage displayed prominently
   - Three visualizations: Original, Mask, Overlay
   - Download any result image using download buttons
6. **Analyze Another**:
   - Click "Analyze Another Image" or "Clear" to reset

### Color Coding
- **Green (≥70%)**: High vegetation coverage
- **Orange (40-69%)**: Medium vegetation coverage
- **Red (<40%)**: Low vegetation coverage

## Testing

### Manual Testing

1. **Test with Sample Image:**
```bash
cd backend
python -c "from inference import run_inference; run_inference('static/uploads/weed.jpg')"
```

2. **Test API Endpoint:**
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.access_token')

# Upload and analyze image
curl -X POST http://localhost:8000/inference/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_image.jpg"
```

3. **Test Frontend:**
- Navigate to http://localhost:3000/inference
- Upload a test image
- Verify all three result images display correctly
- Check vegetation percentage accuracy

### Sample Test Images

Good test images should have:
- Clear aerial/drone perspective
- Visible vegetation areas
- Good lighting and contrast
- Resolution: at least 150x150 pixels

## Troubleshooting

### Common Issues

**1. Model Not Found Error**
```
FileNotFoundError: Model file not found at vegetation_segmentation_model/model.h5
```
**Solution:** Download or place the model file in the correct location.

**2. TensorFlow Import Error**
```
ModuleNotFoundError: No module named 'tensorflow'
```
**Solution:** Install TensorFlow: `pip install tensorflow`

**3. Upload Fails (401 Unauthorized)**
**Solution:** Ensure you're logged in and token is valid.

**4. Memory Error During Inference**
**Solution:** Reduce image size or increase available RAM.

**5. CORS Error in Browser**
**Solution:** Verify backend CORS settings allow frontend origin.

## Performance Considerations

- **Image Size**: Large images are automatically resized to 150x150 for inference
- **Processing Time**: ~2-5 seconds per image on CPU, <1s on GPU
- **Memory Usage**: ~500MB for model loading, ~100MB per inference
- **Storage**: Uploaded and result images stored in `static/` directory

## Future Enhancements

- [ ] Batch processing for multiple images
- [ ] History of previous analyses
- [ ] Export results to PDF/CSV
- [ ] Advanced segmentation with multiple vegetation classes
- [ ] Real-time processing from drone video feed
- [ ] Integration with mission planning for automated analysis
- [ ] Model fine-tuning interface
- [ ] Comparison view for before/after images

## API Reference

### Inference Endpoint

```typescript
POST /inference/analyze

Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Body:
  file: File (image file)

Response: {
  success: boolean;
  vegetation_percentage: number;
  original_image: string;      // base64 encoded
  mask_image: string;           // base64 encoded
  overlay_image: string;        // base64 encoded
  original_path: string;        // file path
  mask_path: string;            // file path
  overlay_path: string;         // file path
  timestamp: string;            // ISO 8601
}

Errors:
  401: Unauthorized (invalid/missing token)
  500: Inference error (model/processing failure)
```

## Security Notes

- All endpoints require authentication
- Uploaded files are stored with unique timestamps
- File type validation enforced (images only)
- File size limits recommended (implement if needed)

## Credits

- Model: Vegetation Segmentation CNN
- Framework: TensorFlow/Keras
- UI: Material-UI React Components
- Image Processing: Pillow (PIL)

---

**Last Updated:** October 12, 2025
**Version:** 1.0.0
