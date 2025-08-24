from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./proctoring.db"
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Model settings
    VOSK_MODEL_PATH: str = "./models/vosk-model-small-en-us-0.15"
    MEDIAPIPE_MODEL_PATH: str = "./models/face_landmarker.task"
    
    # Scoring thresholds
    LOW_RISK_THRESHOLD: int = 5
    MODERATE_RISK_THRESHOLD: int = 10
    HIGH_RISK_THRESHOLD: int = 15
    
    class Config:
        env_file = ".env"

settings = Settings()