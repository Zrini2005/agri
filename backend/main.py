from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json
import asyncio
import csv
import io
import tempfile
import os
import base64
import numpy as np
from PIL import Image
from database import (
    create_tables,
    get_db,
    SessionLocal,
    User as DBUser,
    Field as DBField,
    Mission as DBMission,
    Waypoint as DBWaypoint,
    TelemetryLog as DBTelemetryLog,
    MissionLog as DBMissionLog,
    AIInsight as DBAIInsight,
    InferenceImage,
)
import schemas
from auth import (
    authenticate_user, create_access_token, get_current_active_user, 
    get_password_hash, get_admin_user
)
from config import settings
try:
    from ai_service import AIService
except Exception:
    # Provide a lightweight fallback AIService when heavy ML deps are missing
    class AIService:
        def __init__(self):
            self.is_trained = False

        async def predict_battery_drain(self, telemetry_history):
            return {"error": "ML dependencies not installed", "confidence": 0.0}

        async def detect_anomaly(self, telemetry_data):
            # Simple rule-based fallback
            return {
                "is_anomaly": False,
                "confidence": 0.0,
                "message": "Fallback AI - no ML available",
                "timestamp": datetime.utcnow().isoformat()
            }
from websocket_manager import WebSocketManager

# Create FastAPI app
app = FastAPI(
    title="Agriculture Drone GCS API",
    description="Ground Control Station API for agricultural drones",
    version="1.0.0"
)

# Endpoint to fetch inference images for a user (optionally filtered by user or all)
@app.get("/inference/images")
async def get_inference_images(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_active_user)
):
    query = db.query(InferenceImage)
    if user_id:
        query = query.filter(InferenceImage.user_id == user_id)
    images = query.order_by(InferenceImage.timestamp.desc()).all()
    return [
        {
            "id": img.id,
            "user_id": img.user_id,
            "mission_id": img.mission_id,
            "timestamp": img.timestamp,
            "vegetation_percentage": img.vegetation_percentage,
            "original_path": img.original_path,
            "mask_path": img.mask_path,
            "overlay_path": img.overlay_path,
        }
        for img in images
    ]
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json
import asyncio
import csv
import io
import tempfile
import os
import base64
import numpy as np
from PIL import Image

from database import (
    create_tables,
    get_db,
    SessionLocal,
    User as DBUser,
    Field as DBField,
    Mission as DBMission,
    Waypoint as DBWaypoint,
    TelemetryLog as DBTelemetryLog,
    MissionLog as DBMissionLog,
    AIInsight as DBAIInsight,
    InferenceImage,
)
import schemas
from auth import (
    authenticate_user, create_access_token, get_current_active_user, 
    get_password_hash, get_admin_user
)
from config import settings
try:
    from ai_service import AIService
except Exception:
    # Provide a lightweight fallback AIService when heavy ML deps are missing
    class AIService:
        def __init__(self):
            self.is_trained = False

        async def predict_battery_drain(self, telemetry_history):
            return {"error": "ML dependencies not installed", "confidence": 0.0}

        async def detect_anomaly(self, telemetry_data):
            # Simple rule-based fallback
            return {
                "is_anomaly": False,
                "confidence": 0.0,
                "message": "Fallback AI - no ML available",
                "timestamp": datetime.utcnow().isoformat()
            }

from websocket_manager import WebSocketManager

# Create FastAPI app
app = FastAPI(
    title="Agriculture Drone GCS API",
    description="Ground Control Station API for agricultural drones",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_service = AIService()
websocket_manager = WebSocketManager()

# Create backwards-compatible aliases so existing code referencing
# User, Field, Mission, etc. continues to work without rewriting every occurrence.
User = DBUser
Field = DBField
Mission = DBMission
Waypoint = DBWaypoint
TelemetryLog = DBTelemetryLog
MissionLog = DBMissionLog
AIInsight = DBAIInsight

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()
    print("Database tables created successfully")
    print(f"Server starting on {settings.database_url}")


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}


# Authentication endpoints
@app.post("/auth/register", response_model=schemas.User)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/auth/login", response_model=schemas.Token)
async def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token."""
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.UserProfile)
async def get_user_profile(current_user: DBUser = Depends(get_current_active_user)):
    """Get current user profile."""
    return current_user


# Field management endpoints
@app.get("/fields", response_model=List[schemas.Field])
async def get_fields(
    skip: int = 0, 
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's fields."""
    return db.query(Field).filter(Field.owner_id == current_user.id).offset(skip).limit(limit).all()


@app.post("/fields", response_model=schemas.Field)
async def create_field(
    field_data: schemas.FieldCreate,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new field."""
    db_field = Field(**field_data.dict(), owner_id=current_user.id)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field


@app.get("/fields/{field_id}", response_model=schemas.Field)
async def get_field(
    field_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get field by ID."""
    field = db.query(Field).filter(
        Field.id == field_id, Field.owner_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field


@app.put("/fields/{field_id}", response_model=schemas.Field)
async def update_field(
    field_id: int,
    field_update: schemas.FieldUpdate,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update field."""
    field = db.query(Field).filter(
        Field.id == field_id, Field.owner_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    update_data = field_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)
    
    db.commit()
    db.refresh(field)
    return field


@app.delete("/fields/{field_id}")
async def delete_field(
    field_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete field."""
    field = db.query(Field).filter(
        Field.id == field_id, Field.owner_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully"}


# Mission management endpoints
@app.get("/missions", response_model=List[schemas.MissionSummary])
async def get_missions(
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's missions."""
    missions = db.query(Mission).filter(Mission.owner_id == current_user.id).offset(skip).limit(limit).all()
    
    result = []
    for mission in missions:
        field = db.query(Field).filter(Field.id == mission.field_id).first()
        duration_minutes = None
        if mission.started_at and mission.completed_at:
            duration = mission.completed_at - mission.started_at
            duration_minutes = duration.total_seconds() / 60
        
        result.append(schemas.MissionSummary(
            id=mission.id,
            name=mission.name,
            mission_type=mission.mission_type,
            status=mission.status,
            field_name=field.name if field else "Unknown",
            created_at=mission.created_at,
            started_at=mission.started_at,
            completed_at=mission.completed_at,
            duration_minutes=duration_minutes
        ))
    
    return result


@app.post("/missions", response_model=schemas.Mission)
async def create_mission(
    mission_data: schemas.MissionCreate,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new mission."""
    # Verify field ownership
    field = db.query(Field).filter(
        Field.id == mission_data.field_id, Field.owner_id == current_user.id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    # Create mission
    db_mission = Mission(
        name=mission_data.name,
        mission_type=mission_data.mission_type,
        altitude_m=mission_data.altitude_m,
        speed_ms=mission_data.speed_ms,
        field_id=mission_data.field_id,
        owner_id=current_user.id
    )
    db.add(db_mission)
    db.commit()
    db.refresh(db_mission)
    
    # Create waypoints
    for waypoint_data in mission_data.waypoints:
        db_waypoint = Waypoint(**waypoint_data.dict(), mission_id=db_mission.id)
        db.add(db_waypoint)
    
    db.commit()
    
    # Reload mission with waypoints
    db.refresh(db_mission)
    return db_mission



@app.get("/missions/{mission_id}", response_model=schemas.Mission)
async def get_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get mission by ID, including simulation state."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    # Simulation state fields are now included in the Mission model
    return mission

@app.patch("/missions/{mission_id}/state", response_model=schemas.Mission)
async def update_mission_state(
    mission_id: int,
    state_update: dict,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update simulation state for a mission (pause/resume persistence)."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Update simulation state fields
    for key in ["current_waypoint_index", "distance_traveled", "progress", "simulation_state"]:
        if key in state_update:
            setattr(mission, key, state_update[key])
    
    # 🎯 AUTO-COMPLETE MISSION WHEN PROGRESS REACHES 100%
    if (mission.progress is not None and 
        mission.progress >= 100.0 and 
        mission.status == "running"):
        
        mission.status = "completed"
        if not mission.completed_at:
            mission.completed_at = datetime.utcnow()
        
        # Log completion
        log_entry = MissionLog(
            mission_id=mission.id,
            log_level="INFO",
            message=f"Mission completed automatically (progress reached {mission.progress}%)",
            data={"progress": mission.progress, "auto_completed": True, "triggered_by": "state_update"}
        )
        db.add(log_entry)
        print(f"🎉 MISSION {mission_id} AUTO-COMPLETED! Progress: {mission.progress}%")
    
    # Alternative check: if all waypoints completed
    total_waypoints = db.query(Waypoint).filter(Waypoint.mission_id == mission_id).count()
    if (mission.current_waypoint_index is not None and 
        total_waypoints > 0 and 
        mission.current_waypoint_index >= total_waypoints and
        mission.status == "running"):
        
        mission.status = "completed"
        if not mission.completed_at:
            mission.completed_at = datetime.utcnow()
        
        # Log completion
        log_entry = MissionLog(
            mission_id=mission.id,
            log_level="INFO",
            message=f"Mission completed automatically (waypoint {mission.current_waypoint_index}/{total_waypoints} reached)",
            data={"current_waypoint": mission.current_waypoint_index, "total_waypoints": total_waypoints, "auto_completed": True, "triggered_by": "state_update"}
        )
        db.add(log_entry)
        print(f"🎉 MISSION {mission_id} AUTO-COMPLETED! Waypoints: {mission.current_waypoint_index}/{total_waypoints}")
    
    db.commit()
    db.refresh(mission)
    return mission


@app.put("/missions/{mission_id}", response_model=schemas.Mission)
async def update_mission(
    mission_id: int,
    mission_update: schemas.MissionUpdate,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update mission."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status in ["running", "completed"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot update mission that is running or completed"
        )
    
    update_data = mission_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mission, key, value)
    
    db.commit()
    db.refresh(mission)
    return mission


@app.delete("/missions/{mission_id}")
async def delete_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete mission."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Allow deletion of running missions
    
    db.delete(mission)
    db.commit()
    return {"message": "Mission deleted successfully"}


# Mission control endpoints
@app.post("/missions/{mission_id}/force-complete")
async def force_complete_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Force complete a mission that has 100% progress but wrong status."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Force complete regardless of current status
    old_status = mission.status
    mission.status = "completed"
    mission.completed_at = datetime.utcnow()
    if mission.progress is None:
        mission.progress = 100.0
    
    # Log forced completion
    log_entry = MissionLog(
        mission_id=mission.id,
        log_level="INFO",
        message=f"Mission force-completed (was {old_status}, progress: {mission.progress}%)",
        data={"old_status": old_status, "progress": mission.progress, "force_completed": True}
    )
    db.add(log_entry)
    db.commit()
    
    return {"message": f"Mission {mission_id} force-completed (was {old_status})"}


@app.post("/missions/{mission_id}/complete")
async def complete_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually complete a mission (for testing)."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status not in ["running", "paused"]:
        raise HTTPException(status_code=400, detail="Mission is not running or paused")
    
    mission.status = "completed"
    mission.completed_at = datetime.utcnow()
    mission.progress = 100.0
    db.commit()
    
    # Log completion
    log_entry = MissionLog(
        mission_id=mission.id,
        log_level="INFO",
        message="Mission completed manually",
        data={"manual_completion": True}
    )
    db.add(log_entry)
    db.commit()
    
    return {"message": "Mission completed successfully"}


@app.post("/missions/{mission_id}/start")
async def start_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Start mission execution."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status != "planned":
        raise HTTPException(status_code=400, detail="Mission is not in planned state")
    
    mission.status = "running"
    mission.started_at = datetime.utcnow()
    db.commit()
    
    # Notify simulator via WebSocket
    await websocket_manager.send_command({
        "action": "start",
        "mission_id": mission_id,
        "waypoints": [{"lat": wp.latitude, "lng": wp.longitude, "alt": wp.altitude_m} 
                     for wp in mission.waypoints]
    })
    
    return {"message": "Mission started successfully"}


@app.post("/missions/{mission_id}/pause")
async def pause_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Pause mission execution."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status != "running":
        raise HTTPException(status_code=400, detail="Mission is not running")
    
    mission.status = "paused"
    db.commit()
    
    await websocket_manager.send_command({"action": "pause", "mission_id": mission_id})
    return {"message": "Mission paused successfully"}


@app.post("/missions/{mission_id}/resume")
async def resume_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Resume mission execution."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status != "paused":
        raise HTTPException(status_code=400, detail="Mission is not paused")
    
    mission.status = "running"
    db.commit()
    
    await websocket_manager.send_command({"action": "resume", "mission_id": mission_id})
    return {"message": "Mission resumed successfully"}


@app.post("/missions/{mission_id}/abort")
async def abort_mission(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Abort mission execution."""
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    if mission.status not in ["running", "paused"]:
        raise HTTPException(status_code=400, detail="Mission is not active")
    
    mission.status = "aborted"
    mission.completed_at = datetime.utcnow()
    db.commit()
    
    await websocket_manager.send_command({"action": "abort", "mission_id": mission_id})
    return {"message": "Mission aborted successfully"}


# Telemetry and logging endpoints
@app.get("/telemetry/{mission_id}", response_model=List[schemas.TelemetryLog])
async def get_telemetry(
    mission_id: int,
    skip: int = 0,
    limit: int = 1000,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get mission telemetry history."""
    # Verify mission ownership
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    return db.query(TelemetryLog).filter(
        TelemetryLog.mission_id == mission_id
    ).order_by(TelemetryLog.timestamp).offset(skip).limit(limit).all()


@app.get("/logs", response_model=List[schemas.MissionLogEntry])
async def get_mission_logs(
    mission_id: Optional[int] = None,
    log_level: Optional[schemas.LogLevel] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get mission logs with filters."""
    query = db.query(MissionLog).join(Mission).filter(Mission.owner_id == current_user.id)
    
    if mission_id:
        query = query.filter(MissionLog.mission_id == mission_id)
    if log_level:
        query = query.filter(MissionLog.log_level == log_level)
    
    return query.order_by(MissionLog.timestamp.desc()).offset(skip).limit(limit).all()


@app.get("/logs/{mission_id}/export")
async def export_mission_data(
    mission_id: int,
    format: str = "csv",
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export mission data as CSV or JSON."""
    # Verify mission ownership
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Get data
    telemetry = db.query(TelemetryLog).filter(TelemetryLog.mission_id == mission_id).all()
    logs = db.query(MissionLog).filter(MissionLog.mission_id == mission_id).all()
    
    if format == "csv":
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Telemetry data
        writer.writerow(["Type", "Timestamp", "Latitude", "Longitude", "Altitude", "Speed", "Battery", "Message"])
        for t in telemetry:
            writer.writerow([
                "telemetry", t.timestamp, t.latitude, t.longitude, 
                t.altitude_m, t.speed_ms, t.battery_percent, ""
            ])
        
        # Log data
        for log in logs:
            writer.writerow([
                "log", log.timestamp, "", "", "", "", "", f"[{log.log_level}] {log.message}"
            ])
        
        # Save to temp file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        temp_file.write(output.getvalue())
        temp_file.close()
        
        return FileResponse(
            temp_file.name,
            media_type='text/csv',
            filename=f"mission_{mission_id}_data.csv"
        )
    
    else:  # JSON format
        data = {
            "mission": {
                "id": mission.id,
                "name": mission.name,
                "mission_type": mission.mission_type,
                "status": mission.status,
                "created_at": mission.created_at.isoformat(),
                "started_at": mission.started_at.isoformat() if mission.started_at else None,
                "completed_at": mission.completed_at.isoformat() if mission.completed_at else None
            },
            "telemetry": [
                {
                    "timestamp": t.timestamp.isoformat(),
                    "latitude": t.latitude,
                    "longitude": t.longitude,
                    "altitude_m": t.altitude_m,
                    "speed_ms": t.speed_ms,
                    "battery_percent": t.battery_percent,
                    "heading_deg": t.heading_deg
                } for t in telemetry
            ],
            "logs": [
                {
                    "timestamp": log.timestamp.isoformat(),
                    "level": log.log_level,
                    "message": log.message,
                    "data": log.data
                } for log in logs
            ]
        }
        
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(data, temp_file, indent=2)
        temp_file.close()
        
        return FileResponse(
            temp_file.name,
            media_type='application/json',
            filename=f"mission_{mission_id}_data.json"
        )


# AI endpoints
@app.get("/ai/anomalies/{mission_id}", response_model=List[schemas.AIInsight])
async def get_anomalies(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get AI anomaly detection results."""
    # Verify mission ownership
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    return db.query(AIInsight).filter(
        AIInsight.mission_id == mission_id,
        AIInsight.insight_type == "anomaly"
    ).order_by(AIInsight.timestamp.desc()).all()


@app.post("/ai/predict-battery")
async def predict_battery_drain(
    mission_id: int,
    current_user: DBUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Predict battery drain for mission."""
    # Verify mission ownership
    mission = db.query(Mission).filter(
        Mission.id == mission_id, Mission.owner_id == current_user.id
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Get recent telemetry
    recent_telemetry = db.query(TelemetryLog).filter(
        TelemetryLog.mission_id == mission_id
    ).order_by(TelemetryLog.timestamp.desc()).limit(50).all()
    
    if not recent_telemetry:
        raise HTTPException(status_code=400, detail="No telemetry data available")
    
    # Predict using AI service
    prediction = await ai_service.predict_battery_drain(recent_telemetry)
    
    # Save insight
    insight = AIInsight(
        mission_id=mission_id,
        insight_type="battery_prediction",
        confidence_score=prediction["confidence"],
        data=prediction,
        message=f"Predicted battery drain: {prediction['drain_rate']:.2f}%/min"
    )
    db.add(insight)
    db.commit()
    
    return prediction


# WebSocket endpoint for real-time telemetry
@app.websocket("/ws/telemetry/{mission_id}")
async def websocket_telemetry(websocket: WebSocket, mission_id: int):
    """WebSocket endpoint for real-time telemetry."""
    import logging
    logger = logging.getLogger("telemetry_ws")
    
    await websocket_manager.connect_telemetry(websocket, mission_id)
    try:
        while True:
            try:
                # Receive messages from client
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                message = json.loads(data)
                
                # Handle telemetry data from client
                if message.get("type") == "telemetry":
                    telemetry_data = message.get("data", {})
                    
                    # Ensure mission_id is set
                    telemetry_data["mission_id"] = mission_id
                    
                    # Store telemetry using existing handler
                    await handle_telemetry_update(telemetry_data)
                    
                    # Broadcast to other connected clients
                    await websocket_manager.broadcast_telemetry(mission_id, telemetry_data)
                    
            except asyncio.TimeoutError:
                # No message received, keep connection alive
                continue
            except Exception as e:
                logger.error(f"Error processing telemetry message: {e}")
                break
    except WebSocketDisconnect:
        websocket_manager.disconnect_telemetry(websocket, mission_id)



# WebSocket endpoint for simulator commands
@app.websocket("/ws/simulator")
async def websocket_simulator(websocket: WebSocket):
    """WebSocket endpoint for simulator communication."""
    import logging
    logger = logging.getLogger("simulator_ws")
    logger.info("Simulator WebSocket connection attempt")
    await websocket_manager.connect_simulator(websocket)
    logger.info("Simulator WebSocket connected")
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received from simulator: {data}")
            message = json.loads(data)
            # Process telemetry data
            if message.get("type") == "telemetry":
                logger.info(f"Telemetry message received: {message['data']}")
                await handle_telemetry_update(message["data"])
            elif message.get("type") == "mission_complete":
                logger.info(f"Mission complete message received: {message['data']}")
                await handle_mission_complete(message["data"])
            elif message.get("type") == "mission_status":
                logger.info(f"Mission status message received: {message['data']}")
                await handle_mission_status_update(message["data"])
    except WebSocketDisconnect:
        logger.warning("Simulator WebSocket disconnected")
        websocket_manager.disconnect_simulator(websocket)


async def handle_telemetry_update(telemetry_data: dict):
    """Handle incoming telemetry data."""
    import logging
    logger = logging.getLogger("telemetry")
    logger.info(f"Received telemetry data: {telemetry_data}")
    db = SessionLocal()
    try:
        # Parse timestamp if present and is a string
        import datetime
        td = telemetry_data.copy()
        ts = td.get("timestamp")
        if isinstance(ts, str):
            try:
                td["timestamp"] = datetime.datetime.fromisoformat(ts)
            except Exception as e:
                logger.error(f"Failed to parse timestamp: {ts}, error: {e}")
                td["timestamp"] = datetime.datetime.utcnow()
        try:
            telemetry = TelemetryLog(**td)
            db.add(telemetry)
            db.commit()
            logger.info(f"Telemetry stored in DB: {td}")
        except Exception as e:
            logger.error(f"Failed to store telemetry in DB: {td}, error: {e}")
        # Check for anomalies
        anomaly_result = await ai_service.detect_anomaly(telemetry_data)
        if anomaly_result["is_anomaly"]:
            insight = AIInsight(
                mission_id=telemetry_data["mission_id"],
                insight_type="anomaly",
                confidence_score=anomaly_result["confidence"],
                data=anomaly_result,
                is_alert=True,
                message=anomaly_result["message"]
            )
            db.add(insight)
            db.commit()
        
        # AUTO-COMPLETE MISSION WHEN PROGRESS REACHES 100%
        mission_id = telemetry_data.get("mission_id")
        if mission_id:
            mission = db.query(Mission).filter(Mission.id == mission_id).first()
            if mission and mission.status == "running":
                # Check if progress reaches 100%
                if mission.progress is not None and mission.progress >= 100.0:
                    mission.status = "completed"
                    if not mission.completed_at:
                        mission.completed_at = datetime.datetime.utcnow()
                    
                    # Log completion
                    log_entry = MissionLog(
                        mission_id=mission.id,
                        log_level="INFO",
                        message="Mission completed automatically (progress reached 100%)",
                        data={"progress": mission.progress, "auto_completed": True}
                    )
                    db.add(log_entry)
                    db.commit()
                    logger.info(f"🎉 Mission {mission_id} AUTO-COMPLETED! Progress: {mission.progress}%")
                
                # Alternative: Check if all waypoints completed
                total_waypoints = db.query(Waypoint).filter(Waypoint.mission_id == mission_id).count()
                if (mission.current_waypoint_index is not None and 
                    total_waypoints > 0 and 
                    mission.current_waypoint_index >= total_waypoints):
                    
                    mission.status = "completed"
                    if not mission.completed_at:
                        mission.completed_at = datetime.datetime.utcnow()
                    
                    # Log completion
                    log_entry = MissionLog(
                        mission_id=mission.id,
                        log_level="INFO",
                        message=f"Mission completed automatically (all waypoints reached: {mission.current_waypoint_index}/{total_waypoints})",
                        data={"current_waypoint": mission.current_waypoint_index, "total_waypoints": total_waypoints, "auto_completed": True}
                    )
                    db.add(log_entry)
                    db.commit()
                    logger.info(f"🎉 Mission {mission_id} AUTO-COMPLETED! Waypoints: {mission.current_waypoint_index}/{total_waypoints}")
        
        # Broadcast to connected clients
        await websocket_manager.broadcast_telemetry(telemetry_data["mission_id"], telemetry_data)
    finally:
        db.close()


async def handle_mission_complete(data: dict):
    """Handle mission completion."""
    db = SessionLocal()
    try:
        mission = db.query(Mission).filter(Mission.id == data["mission_id"]).first()
        if mission:
            mission.status = "completed"
            mission.completed_at = datetime.utcnow()
            db.commit()
            
            # Log completion
            log_entry = MissionLog(
                mission_id=mission.id,
                log_level="INFO",
                message="Mission completed successfully",
                data=data
            )
            db.add(log_entry)
            db.commit()
    finally:
        db.close()


async def handle_mission_status_update(data: dict):
    """Handle mission status updates from simulator."""
    import logging
    logger = logging.getLogger("mission_status")
    db = SessionLocal()
    try:
        mission_id = data.get("mission_id")
        status = data.get("status")
        message = data.get("message", "")
        
        logger.info(f"Processing mission status update: mission_id={mission_id}, status={status}")
        
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            logger.warning(f"Mission {mission_id} not found")
            return
        
        # Update mission status based on simulator status
        if status == "completed":
            mission.status = "completed"
            if not mission.completed_at:
                mission.completed_at = datetime.utcnow()
            logger.info(f"Mission {mission_id} marked as completed")
            
            # Log completion
            log_entry = MissionLog(
                mission_id=mission.id,
                log_level="INFO",
                message=f"Mission completed: {message}",
                data=data
            )
            db.add(log_entry)
            
        elif status == "started":
            if not mission.started_at:
                mission.started_at = datetime.utcnow()
            logger.info(f"Mission {mission_id} started")
            
        elif status == "waypoint_reached":
            # Log waypoint progress
            log_entry = MissionLog(
                mission_id=mission.id,
                log_level="INFO",
                message=message,
                data=data
            )
            db.add(log_entry)
            
        db.commit()
        logger.info(f"Mission status updated successfully")
        
    except Exception as e:
        logger.error(f"Error updating mission status: {e}")
        db.rollback()
    finally:
        db.close()


# ========================================
# INFERENCE ENDPOINTS
# ========================================

@app.post("/inference/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    mode: str = Form("vegetation"),  # 'vegetation' or 'weed'
    current_user: schemas.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload an image and run AI inference (vegetation segmentation or weed detection).
    
    Parameters:
    - file: Image file to analyze
    - mode: 'vegetation' for vegetation segmentation or 'weed' for weed detection
    
    Returns the mask, percentage, and optionally plotted image for weed mode.
    """
    print(f"🔥 ENDPOINT CALLED WITH MODE: '{mode}'")
    print(f"🔥 MODE TYPE: {type(mode)}")
    
    try:
        # Import numpy explicitly to ensure it's available in function scope
        import numpy as np
        from PIL import Image as PILImage
        
        # Ensure upload directory exists
        os.makedirs("static/uploads", exist_ok=True)
        os.makedirs("static/results", exist_ok=True)
        
        # Save uploaded file
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join("static/uploads", filename)
        
        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        
        print(f"Image saved to: {filepath}")
        
        # Validate mode
        if mode not in ['vegetation', 'weed']:
            raise HTTPException(status_code=400, detail="Mode must be 'vegetation' or 'weed'")
        
        # Initialize variables
        mask = None
        vegetation_percentage = 0.0
        plotted_rgb = None
        has_plotted = False
        detection_stats = None
        
        # Try to run inference with the new inference module
        try:
            from inference import run_inference
            
            # Run inference based on mode
            result = run_inference(filepath, mode=mode)
            
            # Handle different return formats
            if mode == 'weed':
                # Weed mode returns: (mask, percentage, plotted_rgb, detection_stats)
                if len(result) == 4:
                    mask, vegetation_percentage, plotted_rgb, detection_stats = result
                else:
                    # Fallback format without stats
                    mask, vegetation_percentage, plotted_rgb = result
                has_plotted = plotted_rgb is not None
            else:
                # Vegetation mode returns: (mask, percentage)
                mask, vegetation_percentage = result
                plotted_rgb = None
                has_plotted = False
                
        except Exception as inference_error:
            print(f"Inference error: {str(inference_error)}")
            import traceback
            traceback.print_exc()
            print("Falling back to simple green color detection...")
            
            # Fallback: Simple green color detection using already imported modules
            from PIL import Image as PILImage
            
            img = PILImage.open(filepath).convert('RGB')
            img_array = np.array(img)
            
            # Simple green detection: pixels where green > red and green > blue
            green_mask = (img_array[:, :, 1] > img_array[:, :, 0]) & \
                        (img_array[:, :, 1] > img_array[:, :, 2]) & \
                        (img_array[:, :, 1] > 50)  # Some threshold
            
            mask = green_mask.astype(np.float32)
            vegetation_percentage = (np.sum(mask) / mask.size) * 100
            plotted_rgb = None
            has_plotted = False
            
            print(f"Fallback detection: {vegetation_percentage:.2f}% vegetation")
        
        # Convert mask to base64 image
        mask_normalized = (mask * 255).astype(np.uint8)
        mask_img = Image.fromarray(mask_normalized, mode='L')
        
        # Save mask image
        mask_filename = f"mask_{mode}_{filename}"
        mask_filepath = os.path.join("static/results", mask_filename)
        mask_img.save(mask_filepath)
        
        # For weed mode, save the plotted image if available
        plotted_filename = None
        plotted_filepath = None
        plotted_base64 = None
        
        if mode == 'weed' and has_plotted:
            from PIL import Image as PILImage
            plotted_filename = f"plotted_{filename}"
            plotted_filepath = os.path.join("static/results", plotted_filename)
            plotted_pil = PILImage.fromarray(plotted_rgb)
            plotted_pil.save(plotted_filepath)
            
            # Convert to base64
            with open(plotted_filepath, "rb") as img_file:
                plotted_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Create overlay image
        original_img = Image.open(filepath).convert('RGBA')
        mask_rgba = Image.new('RGBA', original_img.size, (0, 0, 0, 0))
        
        # Resize mask to match original image size
        mask_resized = mask_img.resize(original_img.size, Image.Resampling.LANCZOS)
        mask_array = np.array(mask_resized)
        
        # Create colored overlay based on mode
        overlay_array = np.array(mask_rgba)
        if mode == 'weed':
            # Red overlay for weed detection
            overlay_array[mask_array > 128] = [255, 0, 0, 120]  # Red with transparency
        else:
            # Green overlay for vegetation
            overlay_array[mask_array > 128] = [0, 255, 0, 100]  # Green with transparency
        
        overlay_img = Image.fromarray(overlay_array, 'RGBA')
        
        # Composite images
        result_img = Image.alpha_composite(original_img, overlay_img)
        
        # Save overlay image
        overlay_filename = f"overlay_{mode}_{filename.rsplit('.', 1)[0]}.png"
        overlay_filepath = os.path.join("static/results", overlay_filename)
        result_img.save(overlay_filepath)
        
        # Convert images to base64 for response
        def image_to_base64(img_path):
            with open(img_path, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        
        original_base64 = image_to_base64(filepath)
        mask_base64 = image_to_base64(mask_filepath)
        overlay_base64 = image_to_base64(overlay_filepath)
        
        # Save inference image metadata to database
        inference_image = InferenceImage(
            user_id=current_user.id if current_user else None,
            vegetation_percentage=round(vegetation_percentage, 2),
            original_path=f"/static/uploads/{filename}",
            mask_path=f"/static/results/{mask_filename}",
            overlay_path=f"/static/results/{overlay_filename}",
        )
        db.add(inference_image)
        db.commit()
        db.refresh(inference_image)

        # Build response
        response = {
            "success": True,
            "mode": mode,
            "vegetation_percentage": round(vegetation_percentage, 2),
            "original_image": f"data:image/jpeg;base64,{original_base64}",
            "mask_image": f"data:image/png;base64,{mask_base64}",
            "overlay_image": f"data:image/png;base64,{overlay_base64}",
            "original_path": f"/static/uploads/{filename}",
            "mask_path": f"/static/results/{mask_filename}",
            "overlay_path": f"/static/results/{overlay_filename}",
            "timestamp": datetime.utcnow().isoformat(),
            "inference_id": inference_image.id
        }
        
        # Add plotted image for weed mode if available
        if mode == 'weed' and plotted_base64:
            response["plotted_image"] = f"data:image/png;base64,{plotted_base64}"
            response["plotted_path"] = f"/static/results/{plotted_filename}"
            
            # Add detection statistics if available
            if detection_stats:
                response["weed_count"] = detection_stats.get('weed_count', 0)
                response["crop_count"] = detection_stats.get('crop_count', 0)
                response["total_detections"] = detection_stats.get('total_detections', 0)
        
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error during inference: {str(e)}"
        )


@app.post("/inference/detect-weeds")
async def detect_weeds(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Dedicated endpoint for YOLO-based weed detection.
    
    Returns:
    - Plotted image with bounding boxes
    - Detection statistics (weed_count, crop_count, total_detections)
    - Coverage percentage
    """
    print("\n" + "="*80)
    print("🦠 WEED DETECTION ENDPOINT CALLED")
    print("="*80)
    
    try:
        import numpy as np
        from PIL import Image as PILImage
        
        # Ensure directories exist
        os.makedirs("static/uploads", exist_ok=True)
        os.makedirs("static/results", exist_ok=True)
        
        # Save uploaded file
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join("static/uploads", filename)
        
        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        
        print(f"📁 Image saved to: {filepath}")
        
        # Run YOLO weed detection
        print("🚀 Calling run_inference with mode='weed'")
        from inference import run_inference
        
        result = run_inference(filepath, mode='weed')
        
        # Unpack results
        if len(result) == 4:
            mask, vegetation_percentage, plotted_rgb, detection_stats = result
            print(f"✅ Got 4-element result with detection stats")
        else:
            mask, vegetation_percentage, plotted_rgb = result
            detection_stats = None
            print(f"⚠️ Got 3-element result, no detection stats")
        
        # Convert mask to base64 image
        mask_normalized = (mask * 255).astype(np.uint8)
        mask_img = PILImage.fromarray(mask_normalized, mode='L')
        
        # Save mask image
        mask_filename = f"mask_weed_{filename}"
        mask_filepath = os.path.join("static/results", mask_filename)
        mask_img.save(mask_filepath)
        
        # Save plotted image
        plotted_filename = f"plotted_{filename}"
        plotted_filepath = os.path.join("static/results", plotted_filename)
        plotted_pil = PILImage.fromarray(plotted_rgb)
        plotted_pil.save(plotted_filepath)
        print(f"💾 Plotted image saved to: {plotted_filepath}")
        
        # Create overlay image with red color for weeds
        original_img = PILImage.open(filepath).convert('RGBA')
        mask_rgba = PILImage.new('RGBA', original_img.size, (0, 0, 0, 0))
        
        # Resize mask to match original image size
        mask_resized = mask_img.resize(original_img.size, PILImage.Resampling.LANCZOS)
        mask_array = np.array(mask_resized)
        
        # Create red overlay for weed detection
        overlay_array = np.array(mask_rgba)
        overlay_array[mask_array > 128] = [255, 0, 0, 120]  # Red with transparency
        overlay_img = PILImage.fromarray(overlay_array, 'RGBA')
        
        # Composite images
        result_img = PILImage.alpha_composite(original_img, overlay_img)
        
        # Save overlay image
        overlay_filename = f"overlay_weed_{filename.rsplit('.', 1)[0]}.png"
        overlay_filepath = os.path.join("static/results", overlay_filename)
        result_img.save(overlay_filepath)
        
        # Convert images to base64
        def image_to_base64(img_path):
            with open(img_path, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        
        original_base64 = image_to_base64(filepath)
        mask_base64 = image_to_base64(mask_filepath)
        overlay_base64 = image_to_base64(overlay_filepath)
        plotted_base64 = image_to_base64(plotted_filepath)
        
        # Save to database
        inference_image = InferenceImage(
            user_id=current_user.id if current_user else None,
            vegetation_percentage=round(vegetation_percentage, 2),
            original_path=f"/static/uploads/{filename}",
            mask_path=f"/static/results/{mask_filename}",
            overlay_path=f"/static/results/{overlay_filename}",
        )
        db.add(inference_image)
        db.commit()
        db.refresh(inference_image)
        
        print(f"📊 Detection stats: {detection_stats}")
        
        # Build response
        response = {
            "success": True,
            "mode": "weed",
            "vegetation_percentage": round(vegetation_percentage, 2),
            "original_image": f"data:image/jpeg;base64,{original_base64}",
            "mask_image": f"data:image/png;base64,{mask_base64}",
            "overlay_image": f"data:image/png;base64,{overlay_base64}",
            "plotted_image": f"data:image/png;base64,{plotted_base64}",
            "original_path": f"/static/uploads/{filename}",
            "mask_path": f"/static/results/{mask_filename}",
            "overlay_path": f"/static/results/{overlay_filename}",
            "plotted_path": f"/static/results/{plotted_filename}",
            "timestamp": datetime.utcnow().isoformat(),
            "inference_id": inference_image.id,
            "weed_count": detection_stats.get('weed_count', 0) if detection_stats else 0,
            "crop_count": detection_stats.get('crop_count', 0) if detection_stats else 0,
            "total_detections": detection_stats.get('total_detections', 0) if detection_stats else 0,
        }
        
        print("="*80)
        print("✅ WEED DETECTION COMPLETED")
        print("="*80 + "\n")
        
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error during weed detection: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)