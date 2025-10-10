from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./agriculture_gcs.db"
    
    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30 * 24 * 60  # 30 days
    
    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # WebSocket
    websocket_heartbeat_interval: int = 30
    
    # Simulator
    simulator_url: str = "ws://localhost:8001"
    
    # AI
    anomaly_detection_threshold: float = 0.1
    battery_prediction_window: int = 300  # seconds
    
    class Config:
        env_file = ".env"


settings = Settings()