# Agriculture Drone GCS Architecture

## System Overview

The Agriculture Drone Ground Control Station (GCS) is a full-stack web application designed to manage agricultural drone operations. The system consists of four main components: Backend API, Frontend Web UI, Drone Simulator, and AI/ML Services.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Drone Sim     │    │  AI/ML Service  │
│   (React App)   │    │   (Python)      │    │   (scikit-learn)│
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          │ HTTP/WS             │ WebSocket             │ In-Process
          │                      │                       │
    ┌─────▼─────────────────────▼───────────────────────▼─────┐
    │                Backend API Server                      │
    │              (FastAPI + WebSocket)                     │
    └─────────────────────┬───────────────────────────────────┘
                          │
                          │ SQLAlchemy ORM
                          │
                    ┌─────▼─────┐
                    │  SQLite   │
                    │ Database  │
                    └───────────┘
```

## Component Architecture

### Backend (FastAPI)
**Location**: `/backend/`
**Technologies**: Python 3.9+, FastAPI, SQLAlchemy, WebSockets, JWT Authentication

#### Core Modules:
- **`main.py`**: Application entry point, API routes, WebSocket handlers
- **`database.py`**: SQLAlchemy models, database configuration
- **`schemas.py`**: Pydantic models for request/response validation
- **`auth.py`**: JWT authentication, password hashing
- **`config.py`**: Application settings and environment configuration
- **`ai_service.py`**: Machine learning integration for telemetry analysis
- **`websocket_manager.py`**: Real-time communication management

#### API Endpoints:
```
Authentication:
  POST /auth/register      - User registration
  POST /auth/login         - User login
  GET  /auth/me           - Get current user profile

Field Management:
  GET    /fields          - List user fields
  POST   /fields          - Create new field
  GET    /fields/{id}     - Get field details
  PUT    /fields/{id}     - Update field
  DELETE /fields/{id}     - Delete field

Mission Management:
  GET    /missions        - List user missions
  POST   /missions        - Create new mission
  GET    /missions/{id}   - Get mission details
  PUT    /missions/{id}   - Update mission
  DELETE /missions/{id}   - Delete mission

Mission Control:
  POST /missions/{id}/start  - Start mission execution
  POST /missions/{id}/pause  - Pause mission
  POST /missions/{id}/resume - Resume mission
  POST /missions/{id}/abort  - Abort mission

Telemetry & Logs:
  GET /telemetry/{mission_id}     - Get telemetry history
  GET /logs                       - Get mission logs
  GET /logs/{id}/export          - Export mission data

AI Analytics:
  GET  /ai/anomalies/{mission_id} - Get anomaly detection results
  POST /ai/predict-battery        - Battery drain prediction

WebSocket:
  WS /ws/telemetry/{mission_id}   - Real-time telemetry stream
  WS /ws/simulator               - Simulator communication
```

### Frontend (React + TypeScript)
**Location**: `/frontend/`
**Technologies**: React 18, TypeScript, Material-UI, Leaflet Maps, Axios

#### Component Structure:
```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main app layout with navigation
│   └── ...
├── pages/              # Route components
│   ├── Dashboard.tsx   # System overview and quick stats
│   ├── Fields.tsx      # Field management with map
│   ├── Missions.tsx    # Mission planning and management
│   ├── MissionExecution.tsx  # Real-time mission control
│   ├── Reports.tsx     # Analytics and data export
│   ├── Login.tsx       # User authentication
│   └── Register.tsx    # User registration
├── services/           # API and WebSocket services
│   ├── api.ts         # REST API client
│   └── websocket.ts   # WebSocket client
├── contexts/          # React context providers
│   └── AuthContext.tsx # Authentication state management
├── types/             # TypeScript type definitions
│   └── index.ts       # Shared interfaces and types
└── utils/             # Utility functions
```

#### Key Features:
- **Responsive Design**: Works on desktop and tablet devices
- **Real-time Updates**: WebSocket integration for live telemetry
- **Interactive Maps**: Leaflet.js for field drawing and mission visualization
- **State Management**: React Context for authentication and app state
- **Type Safety**: Full TypeScript implementation with strict typing

### Drone Simulator (Python)
**Location**: `/simulator/`
**Technologies**: Python 3.9+, asyncio, WebSockets, NumPy

#### Core Features:
- **Realistic Flight Physics**: Simulates drone movement with acceleration, wind effects
- **Waypoint Navigation**: Follows mission waypoints with configurable tolerance
- **Telemetry Generation**: Emits realistic sensor data at 10Hz
- **Command Interface**: Responds to start/pause/resume/abort commands
- **Battery Simulation**: Models battery drain based on flight conditions
- **GPS Noise**: Adds realistic GPS and sensor noise for testing

#### Simulator Components:
- **`DroneState`**: Current position, attitude, and system status
- **`DroneSimulator`**: Main simulation engine with physics
- **Movement Model**: Realistic acceleration and deceleration
- **Environmental Effects**: Wind simulation and GPS noise
- **WebSocket Client**: Bi-directional communication with backend

### AI/ML Service
**Location**: `/backend/ai_service.py`
**Technologies**: scikit-learn, NumPy, Pandas

#### ML Capabilities:
1. **Anomaly Detection**: Isolation Forest algorithm for telemetry analysis
2. **Battery Prediction**: Linear regression for drain rate estimation
3. **Flight Efficiency**: Path optimization analysis
4. **Real-time Processing**: Streaming data analysis

#### AI Features:
- **Rule-based Fallback**: When ML models aren't trained
- **Confidence Scoring**: All predictions include confidence levels
- **Alert Generation**: Automated warnings for anomalous conditions
- **Model Persistence**: Save/load trained models for consistency

## Data Flow

### Mission Execution Flow:
```
1. User creates field polygon via map interface
2. User plans mission with waypoints and parameters
3. Frontend sends mission to backend API
4. User starts mission via UI
5. Backend sends start command to simulator via WebSocket
6. Simulator begins following waypoints
7. Simulator sends telemetry to backend every 100ms
8. Backend processes telemetry through AI service
9. AI service detects anomalies and generates insights
10. Backend broadcasts telemetry to connected frontend clients
11. Frontend updates real-time dashboard and map
12. Mission completes or is manually stopped
```

### WebSocket Communication:
```
Frontend ←─── HTTP API ───→ Backend ←─── WebSocket ───→ Simulator
    │                          │
    └─── WebSocket Telemetry ───┘
```

## Security Architecture

### Authentication:
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Password Hashing**: Bcrypt with salt for secure password storage
- **Role-based Access**: Admin and regular user roles (extensible)
- **API Protection**: All endpoints except login/register require authentication

### Data Security:
- **Input Validation**: Pydantic schemas validate all API inputs
- **SQL Injection Protection**: SQLAlchemy ORM prevents injection attacks
- **CORS Configuration**: Controlled cross-origin resource sharing
- **Environment Variables**: Sensitive configuration via environment files

## Deployment Architecture

### Development Setup:
```
├── Backend Server (localhost:8000)
│   ├── FastAPI application with auto-reload
│   ├── SQLite database (./agriculture_gcs.db)
│   └── WebSocket endpoints
├── Frontend Dev Server (localhost:3000)
│   ├── React development server with hot reload
│   └── Proxy to backend API
└── Simulator (localhost:8001)
    └── Standalone Python WebSocket client
```

### Production Deployment (Recommended):
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Nginx     │    │  Docker      │    │ PostgreSQL  │
│ (Reverse    │    │ Container    │    │ Database    │
│  Proxy)     │    │ (FastAPI)    │    │             │
└──────┬──────┘    └──────┬───────┘    └─────────────┘
       │                  │
    ┌──▼────────────────▼──┐
    │   React Build        │
    │   (Static Files)     │
    └─────────────────────┘
```

## Performance Considerations

### Backend Optimization:
- **Database Indexing**: Optimized queries for telemetry and user data
- **WebSocket Management**: Efficient connection handling and broadcasting
- **AI Processing**: Asynchronous ML inference to avoid blocking
- **Caching**: Redis integration for session management (future)

### Frontend Optimization:
- **Code Splitting**: Lazy loading of route components
- **Virtual Scrolling**: Efficient rendering of large telemetry datasets
- **WebSocket Reconnection**: Automatic reconnection with exponential backoff
- **State Optimization**: Minimal re-renders with React.memo and useCallback

### Scalability:
- **Horizontal Scaling**: Multiple backend instances behind load balancer
- **Database Scaling**: PostgreSQL with read replicas
- **WebSocket Scaling**: Redis pub/sub for multi-instance WebSocket support
- **CDN Integration**: Static asset delivery optimization

## Monitoring and Logging

### Application Monitoring:
- **Health Checks**: `/health` endpoint for load balancer monitoring
- **Error Tracking**: Structured logging with correlation IDs
- **Performance Metrics**: Response time and throughput monitoring
- **WebSocket Metrics**: Connection count and message throughput

### AI/ML Monitoring:
- **Model Performance**: Accuracy and confidence score tracking
- **Anomaly Detection Rate**: False positive/negative analysis
- **Processing Time**: ML inference performance monitoring
- **Data Quality**: Input validation and outlier detection