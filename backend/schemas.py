from pydantic import BaseModel, EmailStr, Field as PydField
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MissionType(str, Enum):
    scouting = "scouting"
    spraying = "spraying"
    custom = "custom"


class MissionStatus(str, Enum):
    planned = "planned"
    running = "running"
    paused = "paused"
    completed = "completed"
    aborted = "aborted"


class LogLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


# User schemas
class UserBase(BaseModel):
    username: str = PydField(min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = PydField(min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfile(User):
    updated_at: Optional[datetime] = None


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


# Field schemas
class FieldBase(BaseModel):
    name: str = PydField(min_length=1, max_length=100)
    description: Optional[str] = None
    polygon_coordinates: Dict[str, Any]  # GeoJSON polygon
    area_hectares: Optional[float] = None
    crop_type: Optional[str] = None


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    polygon_coordinates: Optional[Dict[str, Any]] = None
    area_hectares: Optional[float] = None
    crop_type: Optional[str] = None


class Field(FieldBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Waypoint schemas
class WaypointBase(BaseModel):
    sequence: int
    latitude: float = PydField(ge=-90, le=90)
    longitude: float = PydField(ge=-180, le=180)
    altitude_m: float = PydField(ge=0, le=1000)
    action: Optional[str] = None
    duration_s: float = PydField(ge=0, default=0)


class WaypointCreate(WaypointBase):
    pass


class Waypoint(WaypointBase):
    id: int
    mission_id: int
    
    class Config:
        from_attributes = True


# Mission schemas
class MissionBase(BaseModel):
    name: str = PydField(min_length=1, max_length=100)
    mission_type: MissionType
    altitude_m: float = PydField(ge=5, le=150)
    speed_ms: float = PydField(ge=1, le=20)
    field_id: int


class MissionCreate(MissionBase):
    waypoints: List[WaypointCreate]


class MissionUpdate(BaseModel):
    name: Optional[str] = None
    mission_type: Optional[MissionType] = None
    altitude_m: Optional[float] = None
    speed_ms: Optional[float] = None


class Mission(MissionBase):
    id: int
    status: MissionStatus
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    waypoints: List[Waypoint] = []
    
    class Config:
        from_attributes = True


class MissionSummary(BaseModel):
    id: int
    name: str
    mission_type: MissionType
    status: MissionStatus
    field_name: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None


# Telemetry schemas
class TelemetryData(BaseModel):
    mission_id: int
    timestamp: datetime
    latitude: float = PydField(ge=-90, le=90)
    longitude: float = PydField(ge=-180, le=180)
    altitude_m: float = PydField(ge=0)
    speed_ms: float = PydField(ge=0)
    battery_percent: float = PydField(ge=0, le=100)
    heading_deg: float = PydField(ge=0, lt=360)
    roll_deg: float = PydField(ge=-180, le=180, default=0)
    pitch_deg: float = PydField(ge=-90, le=90, default=0)
    yaw_deg: float = PydField(ge=-180, le=180, default=0)
    gps_fix_type: int = PydField(ge=0, le=5, default=3)
    satellites_visible: int = PydField(ge=0, le=20, default=12)
    ground_speed_ms: Optional[float] = None
    vertical_speed_ms: Optional[float] = None


class TelemetryLog(TelemetryData):
    id: int
    
    class Config:
        from_attributes = True


# Mission Log schemas
class MissionLogCreate(BaseModel):
    mission_id: int
    log_level: LogLevel
    message: str
    data: Optional[Dict[str, Any]] = None


class MissionLogEntry(MissionLogCreate):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


# AI Insight schemas
class AIInsightCreate(BaseModel):
    mission_id: int
    insight_type: str
    confidence_score: float = PydField(ge=0, le=1)
    data: Dict[str, Any]
    is_alert: bool = False
    message: Optional[str] = None


class AIInsight(AIInsightCreate):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


# WebSocket message schemas
class WSMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: Optional[datetime] = None


class WSCommandMessage(BaseModel):
    action: str  # start, pause, resume, abort
    mission_id: int
    parameters: Optional[Dict[str, Any]] = None


# Export schemas
class ExportOptions(BaseModel):
    format: str = PydField(pattern="^(csv|json)$")
    include_telemetry: bool = True
    include_logs: bool = True
    include_ai_insights: bool = False


# Response schemas
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int = 1
    per_page: int = 50
    pages: int