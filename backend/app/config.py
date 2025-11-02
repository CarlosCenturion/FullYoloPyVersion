"""Application configuration settings."""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Model settings
    model_cache_dir: str = "./models"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    supported_image_types: list = ["image/jpeg", "image/png", "image/jpg"]
    supported_video_types: list = ["video/mp4", "video/avi", "video/mov"]

    # YOLO models configuration
    available_models: dict = {
        "yolov8n": {
            "name": "YOLOv8 Nano",
            "size": "3.2MB",
            "description": "Fastest, least accurate - ideal for edge devices",
            "filename": "yolov8n.pt"
        },
        "yolov8s": {
            "name": "YOLOv8 Small",
            "size": "11.2MB",
            "description": "Good balance between speed and accuracy",
            "filename": "yolov8s.pt"
        },
        "yolov8m": {
            "name": "YOLOv8 Medium",
            "size": "25.9MB",
            "description": "Higher accuracy with moderate speed",
            "filename": "yolov8m.pt"
        },
        "yolov8l": {
            "name": "YOLOv8 Large",
            "size": "43.7MB",
            "description": "Maximum accuracy, slower processing",
            "filename": "yolov8l.pt"
        }
    }

    # Processing settings
    max_image_width: int = 1920
    max_image_height: int = 1080
    detection_confidence_threshold: float = 0.25
    max_video_duration: int = 300  # 5 minutes

    # Logging
    log_level: str = "INFO"
    log_file: str = "../logs/app.log"
    error_log_file: str = "../logs/error.log"

    # CORS settings
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()
