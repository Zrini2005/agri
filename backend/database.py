from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
from config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    fields = relationship("Field", back_populates="owner", cascade="all, delete-orphan")
    missions = relationship("Mission", back_populates="owner", cascade="all, delete-orphan")


class Field(Base):
    __tablename__ = "fields"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    polygon_coordinates = Column(JSON, nullable=False)  # GeoJSON polygon
    area_hectares = Column(Float)
    crop_type = Column(String(50))
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="fields")
    missions = relationship("Mission", back_populates="field", cascade="all, delete-orphan")


class Mission(Base):
    __tablename__ = "missions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    mission_type = Column(String(20), nullable=False)  # scouting, spraying, custom
    status = Column(String(20), default="planned")  # planned, running, paused, completed, aborted
    altitude_m = Column(Float, nullable=False)
    speed_ms = Column(Float, nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    owner = relationship("User", back_populates="missions")
    field = relationship("Field", back_populates="missions")
    waypoints = relationship("Waypoint", back_populates="mission", cascade="all, delete-orphan")
    telemetry_logs = relationship("TelemetryLog", back_populates="mission", cascade="all, delete-orphan")
    mission_logs = relationship("MissionLog", back_populates="mission", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsight", back_populates="mission", cascade="all, delete-orphan")


class Waypoint(Base):
    __tablename__ = "waypoints"
    
    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude_m = Column(Float, nullable=False)
    action = Column(String(20))  # hover, photo, spray, etc.
    duration_s = Column(Float, default=0)
    
    # Relationships
    mission = relationship("Mission", back_populates="waypoints")


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude_m = Column(Float, nullable=False)
    speed_ms = Column(Float, nullable=False)
    battery_percent = Column(Float, nullable=False)
    heading_deg = Column(Float, nullable=False)
    roll_deg = Column(Float, default=0)
    pitch_deg = Column(Float, default=0)
    yaw_deg = Column(Float, default=0)
    gps_fix_type = Column(Integer, default=3)  # 3D fix
    satellites_visible = Column(Integer, default=12)
    ground_speed_ms = Column(Float)
    vertical_speed_ms = Column(Float)
    
    # Relationships
    mission = relationship("Mission", back_populates="telemetry_logs")


class MissionLog(Base):
    __tablename__ = "mission_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    log_level = Column(String(10), nullable=False)  # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    data = Column(JSON)  # Additional structured data
    
    # Relationships
    mission = relationship("Mission", back_populates="mission_logs")


class AIInsight(Base):
    __tablename__ = "ai_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    insight_type = Column(String(50), nullable=False)  # anomaly, battery_prediction, etc.
    confidence_score = Column(Float, nullable=False)
    data = Column(JSON, nullable=False)  # Model outputs, parameters, etc.
    is_alert = Column(Boolean, default=False)
    message = Column(Text)
    
    # Relationships
    mission = relationship("Mission", back_populates="ai_insights")


# Create all tables
def create_tables():
    Base.metadata.create_all(bind=engine)


# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()