"""Logging configuration for the application."""

import os
import sys
from loguru import logger
from app.config import settings


def setup_logging():
    """Configure logging with file rotation and console output."""

    # Remove default logger
    logger.remove()

    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(settings.log_file)
    os.makedirs(log_dir, exist_ok=True)

    # Add console handler for development
    logger.add(
        sys.stdout,
        level=settings.log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True
    )

    # Add file handler with rotation
    logger.add(
        settings.log_file,
        level="INFO",
        rotation="10 MB",  # Rotate when file reaches 10MB
        retention="30 days",  # Keep logs for 30 days
        encoding="utf-8",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        compression="gz"  # Compress rotated files
    )

    # Add error-only file handler
    logger.add(
        settings.error_log_file,
        level="ERROR",
        rotation="10 MB",
        retention="30 days",
        encoding="utf-8",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        compression="gz"
    )

    # Log application startup
    logger.info("YOLO Object Detection API starting up")
    logger.info(f"Log level: {settings.log_level}")
    logger.info(f"Model cache directory: {settings.model_cache_dir}")

    return logger


# Global logger instance
app_logger = setup_logging()
