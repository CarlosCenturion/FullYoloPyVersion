#!/usr/bin/env python3
"""Entry point for the YOLO Object Detection backend."""

import uvicorn
from app.main import app
from app.config import settings
from app.utils.logger import app_logger as logger

if __name__ == "__main__":
    logger.info("Starting YOLO Object Detection Backend")
    logger.info(f"Host: {settings.host}:{settings.port}")
    logger.info(f"Debug mode: {settings.debug}")

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        access_log=True
    )
