# Agriculture Drone Ground Control Station

A comprehensive web-based ground control station for agricultural drone operations, featuring real-time telemetry, mission planning, AI-powered anomaly detection, and field management.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database:**
   ```bash
   python database.py
   ```

5. **Start the server:**
   ```bash
   python main.py
   ```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

Frontend will be available at `http://localhost:3000`

### Simulator Setup

1. **Navigate to simulator directory:**
   ```bash
   cd simulator
   ```

2. **Install dependencies:**
   ```bash
   pip install asyncio websockets numpy
   ```

3. **Start simulator:**
   ```bash
   python simulator.py
   ```

## 📋 Features

### ✅ Core Features
- **User Authentication** - JWT-based secure login/registration
- **Field Management** - Create, edit, and visualize agricultural fields
- **Mission Planning** - Design drone missions with waypoints and actions
- **Real-time Telemetry** - Live drone status, GPS, battery, and sensor data
- **AI Anomaly Detection** - Machine learning-powered alert system
- **Data Export** - Export telemetry and mission data (CSV, JSON)
- **Interactive Maps** - Leaflet-based field and mission visualization
- **WebSocket Communication** - Real-time updates and alerts

### 🔧 Technical Features
- **FastAPI Backend** - Modern, fast web API with automatic documentation
- **React Frontend** - Responsive TypeScript interface with Material-UI
- **SQLAlchemy ORM** - Robust database management with SQLite
- **Realistic Simulator** - Physics-based drone flight simulation
- **Comprehensive Testing** - Unit, integration, and E2E test suites
- **Documentation** - Complete API docs and deployment guides

## Architecture

```
├── backend/          # FastAPI REST API + WebSocket server
├── frontend/         # React web application
├── simulator/        # Drone flight simulator service  
└── docs/            # Architecture and API documentation
```

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, WebSockets, JWT Authentication
- **Frontend**: React, Leaflet maps, Material-UI, WebSocket client
- **Simulator**: Python asyncio service with realistic flight physics
- **AI/ML**: scikit-learn (Isolation Forest), numpy, pandas
- **Database**: SQLite (development), PostgreSQL (production ready)

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac  
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Simulator Setup
```bash
cd simulator
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python simulator.py
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile

### Field Management  
- `GET /fields` - List user fields
- `POST /fields` - Create new field
- `GET /fields/{id}` - Get field details
- `PUT /fields/{id}` - Update field
- `DELETE /fields/{id}` - Delete field

### Mission Management
- `GET /missions` - List user missions
- `POST /missions` - Create new mission
- `GET /missions/{id}` - Get mission details
- `PUT /missions/{id}` - Update mission
- `DELETE /missions/{id}` - Delete mission
- `POST /missions/{id}/start` - Start mission execution
- `POST /missions/{id}/pause` - Pause mission
- `POST /missions/{id}/resume` - Resume mission  
- `POST /missions/{id}/abort` - Abort mission

### Telemetry & Logs
- `GET /telemetry/{mission_id}` - Get mission telemetry history
- `GET /logs` - List flight logs with filters
- `GET /logs/{id}/export` - Export log as CSV/JSON

### AI Analytics
- `GET /ai/anomalies/{mission_id}` - Get anomaly detection results
- `POST /ai/predict-battery` - Battery drain prediction

### WebSocket
- `ws://localhost:8000/ws/telemetry/{mission_id}` - Real-time telemetry stream

## Database Schema

See `docs/database-schema.md` for detailed table structures.

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test
```

### Code Formatting
```bash
# Backend
cd backend
black . && isort .

# Frontend
cd frontend  
npm run format
```

## Deployment

See `docs/deployment.md` for production deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by QGroundControl (QGCS) for UI/UX patterns
- Uses open-source mapping libraries and ML models
- Built for agricultural technology advancement