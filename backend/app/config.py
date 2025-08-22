import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "AI Proctoring System"
    debug: bool = True
    cors_origins: list = ["http://localhost:5173", "http://127.0.0.1:5173"]
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "your-secret-key-change-this-in-production"
    
    # AI Model settings
    mediapipe_model_complexity: int = 1
    audio_sample_rate: int = 16000
    risk_threshold: float = 10.0
    
    # WebSocket settings
    websocket_ping_interval: int = 30
    websocket_ping_timeout: int = 10

settings = Settings()