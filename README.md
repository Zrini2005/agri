# 🌾 Agriculture Drone Ground Control Station with AI-Powered Analysis

A comprehensive web-based ground control station for agricultural drone operations, featuring real-time telemetry, mission planning, **dual AI-powered image analysis** (vegetation segmentation & weed detection), and field management.

## ✨ Key Features

### 🚁 Drone Operations
- **Field Management** - Create and visualize agricultural fields with GeoJSON polygons
- **Mission Planning** - Design autonomous drone missions with waypoints
- **Real-time Telemetry** - Live GPS, battery, altitude, and sensor monitoring via WebSocket
- **Mission Execution** - Start, pause, resume, and abort missions with live tracking

### 🤖 AI-Powered Image Analysis
- **Vegetation Segmentation** - ExG (Excess Green Index) algorithm for crop coverage analysis
- **YOLO Weed Detection** - PyTorch-based object detection with bounding boxes
  - Detects and counts weeds vs crops
  - Shows plotted images with detection boxes
  - Provides detailed statistics (weed count, crop count, total detections)
- **Dual Analysis Interface** - Two independent sections for different AI models
- **Real-time Results** - Instant analysis with visual overlays and downloadable results

### 🔐 User Management
- JWT-based authentication with secure login/registration
- Role-based access control (admin & regular users)
- User-specific data isolation

---

## 🏗️ Architecture

```
agri/
├── backend/                          # FastAPI REST API Server
│   ├── main.py                       # API routes & endpoints
│   ├── auth.py                       # JWT authentication
│   ├── database.py                   # SQLAlchemy ORM models
│   ├── inference.py                  # AI inference dispatcher
│   ├── run_yolo_detection.py         # YOLO subprocess script
│   ├── websocket_manager.py          # WebSocket connections
│   ├── vegetation_segmentation_model/
│   │   ├── best.pt                   # YOLO weights (148MB)
│   │   └── model.h5                  # TensorFlow model (148MB)
│   └── static/
│       ├── uploads/                  # User uploaded images
│       └── results/                  # AI analysis outputs
│
├── frontend/                         # React TypeScript SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Main overview
│   │   │   ├── Fields.tsx            # Field management
│   │   │   ├── Missions.tsx          # Mission planning
│   │   │   ├── MissionExecution.tsx  # Live mission control
│   │   │   ├── Inference.tsx         # AI analysis interface
│   │   │   └── Reports.tsx           # Data export & analytics
│   │   ├── services/
│   │   │   ├── api.ts                # Axios API client
│   │   │   └── websocket.ts          # WebSocket manager
│   │   └── contexts/
│   │       └── AuthContext.tsx       # Auth state management
│   └── public/
│
├── simulator/                        # Drone Flight Simulator
│   ├── simulator.py                  # Physics-based flight sim
│   └── run_demo.py                   # Demo mission runner
│
└── docs/                             # Documentation
    ├── architecture.md
    ├── database-schema.md
    ├── deployment.md
    └── inference-feature.md
```

---

## �️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (SQLAlchemy ORM)
- **Authentication**: JWT tokens (python-jose)
- **Real-time**: WebSockets (native FastAPI)
- **AI/ML**:
  - PyTorch 2.9.0+cpu (YOLO object detection)
  - Ultralytics YOLO (best.pt model)
  - OpenCV 4.11.0.86 (image processing)
  - NumPy 1.26.4 (array operations)
  - Pillow 12.0.0 (image manipulation)
- **Subprocess Isolation**: Separate Python process for YOLO to avoid DLL conflicts

### Frontend
- **Framework**: React 18.3 with TypeScript
- **UI Library**: Material-UI v5 (MUI)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Maps**: Leaflet.js with React-Leaflet
- **WebSocket**: Native WebSocket API
- **Styling**: CSS-in-JS (MUI styled components)
- **Theme**: Dark mode with custom color palette
  - Primary: Green (#22c55e) for vegetation
  - Secondary: Red (#ef4444) for weeds
  - Background: Dark (#0a0a0a)

### Simulator
- **Runtime**: Python asyncio
- **Physics**: Custom flight dynamics model
- **Communication**: WebSocket client for telemetry streaming

---

## 🚀 Getting Started

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 16+ (with npm)
- **Git**: For cloning the repository
- **Storage**: ~500MB for dependencies and models

### 1. Clone Repository
```bash
git clone https://github.com/Zrini2005/agri.git
cd agri
```

### 2. Backend Setup

#### Windows (PowerShell)
```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Linux/Mac
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend runs at**: http://localhost:8000  
**API Docs**: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend runs at**: http://localhost:3000

### 4. Simulator Setup (Optional)

```bash
cd simulator

# Install dependencies (in separate venv or backend venv)
pip install -r requirements.txt

# Run simulator
python simulator.py
```

### 5. AI Models

The AI models are already included in `backend/vegetation_segmentation_model/`:
- ✅ `best.pt` (148MB) - YOLO weed detection model
- ✅ `model.h5` (148MB) - TensorFlow vegetation model (currently unused)

---

## 📱 User Flow

### 1. **Registration & Login**
1. Navigate to http://localhost:3000
2. Click "Register" to create account
3. Login with username/password
4. JWT token stored in localStorage

### 2. **Field Management**
1. Go to "Fields" page
2. Click "Create Field"
3. Draw polygon on map or enter GeoJSON coordinates
4. Add field details (name, crop type, area)
5. Save field

### 3. **Mission Planning**
1. Go to "Missions" page
2. Click "Create Mission"
3. Select field from dropdown
4. Add waypoints (lat, lng, altitude)
5. Configure mission parameters (altitude, speed)
6. Save mission

### 4. **Mission Execution**
1. Go to "Mission Execution" page
2. Select mission from list
3. Click "Start Mission"
4. Monitor real-time telemetry:
   - GPS position on map
   - Battery level
   - Speed & altitude
   - Mission progress
5. Pause/Resume/Abort as needed
6. View AI anomaly alerts

### 5. **AI Image Analysis**

#### Vegetation Segmentation (Left Section - Green)
1. Go to "Inference" page
2. **Left section**: Vegetation Segmentation
3. Click upload box or drag & drop image
4. Click "Analyze Vegetation"
5. View results:
   - Coverage percentage
   - Green overlay mask
   - Original image comparison
6. Download results

#### Weed Detection (Right Section - Red)
1. **Right section**: Weed Detection
2. Click upload box or drag & drop image
3. Click "Detect Weeds"
4. View results:
   - **YOLO plotted image** with bounding boxes (red for weeds, blue for crops)
   - **Detection statistics**:
     - 🦠 Weeds detected
     - 🌿 Crops detected
     - 📊 Total detections
   - Coverage percentage
   - Red overlay mask
5. Click image to open in new tab
6. Download results

### 6. **Reports & Export**
1. Go to "Reports" page
2. View inference history
3. Export data as CSV/JSON
4. Filter by date range
5. Download telemetry logs

---

## 🔌 API Endpoints

### Authentication
```
POST   /auth/register          # Create new user
POST   /auth/login             # Login (returns JWT)
GET    /auth/me                # Get current user info
```

### Fields
```
GET    /fields                 # List all user fields
POST   /fields                 # Create new field
GET    /fields/{id}            # Get field details
PUT    /fields/{id}            # Update field
DELETE /fields/{id}            # Delete field
```

### Missions
```
GET    /missions               # List user missions
POST   /missions               # Create mission
GET    /missions/{id}          # Get mission details
PUT    /missions/{id}          # Update mission
DELETE /missions/{id}          # Delete mission
POST   /missions/{id}/start    # Start mission
POST   /missions/{id}/pause    # Pause mission
POST   /missions/{id}/resume   # Resume mission
POST   /missions/{id}/abort    # Abort mission
```

### AI Inference
```
POST   /inference/analyze      # Vegetation segmentation (mode=vegetation)
POST   /inference/detect-weeds # YOLO weed detection (dedicated endpoint)
GET    /inference/history      # Get analysis history
```

### WebSocket
```
WS     /ws/telemetry/{mission_id}  # Real-time telemetry stream
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

Test coverage:
- ✅ Authentication (login, register, JWT)
- ✅ Field CRUD operations
- ✅ Mission management
- ✅ WebSocket connections
- ✅ Inference endpoints

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 🐛 Troubleshooting

### PyTorch DLL Errors
**Solution**: YOLO runs in a subprocess to avoid DLL conflicts with the main FastAPI process.

### JSON Parsing Errors
**Solution**: YOLO model uses `verbose=False` to prevent stdout pollution.

### Mode Parameter Not Working
**Solution**: Use dedicated `/inference/detect-weeds` endpoint instead of mode parameter.

### Frontend Compilation Errors
**Solution**: `InferenceResult` interface includes `plotted_image`, `weed_count`, etc.

### Server Not Reloading
**Solution**: Use `uvicorn main:app --reload` instead of `python main.py`

---

## 📊 Database Schema

### Users
- id, username, email, hashed_password
- full_name, is_active, is_admin
- created_at, updated_at

### Fields
- id, name, description, polygon_coordinates (GeoJSON)
- area_hectares, crop_type, owner_id
- created_at, updated_at

### Missions
- id, name, mission_type, status
- altitude_m, speed_ms, field_id, owner_id
- waypoints (JSON), current_waypoint_index
- started_at, completed_at

### InferenceImages
- id, user_id, mission_id
- vegetation_percentage
- original_path, mask_path, overlay_path
- timestamp

See `docs/database-schema.md` for complete schema.

---

## 🚢 Deployment

### Production Checklist
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set `SECRET_KEY` environment variable
- [ ] Enable HTTPS (SSL certificates)
- [ ] Configure CORS for production domain
- [ ] Use Gunicorn + Uvicorn workers
- [ ] Set up reverse proxy (Nginx)
- [ ] Enable database backups
- [ ] Configure logging and monitoring

See `docs/deployment.md` for detailed instructions.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 👨‍💻 Authors

- **Zrini2005** - Initial development

---

## 🙏 Acknowledgments

- Ultralytics YOLO team for object detection framework
- FastAPI community for excellent documentation
- Material-UI team for React components
- Agriculture technology researchers for domain knowledge

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review API documentation at `/docs` endpoint

---

**Built with ❤️ for precision agriculture**