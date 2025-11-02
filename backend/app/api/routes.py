"""API routes for the YOLO Object Detection application."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import time
import os
from datetime import datetime

from app.config import settings
from app.models.yolo_manager import YOLOModelManager
from app.services.detection_service import DetectionService
from app.utils.logger import app_logger as logger
from app.utils.file_validator import validate_file

# Create router
router = APIRouter()

# Initialize services
model_manager = YOLOModelManager()
detection_service = DetectionService(model_manager)


@router.get("/models", response_model=List[Dict[str, Any]])
async def get_available_models():
    """Get list of available YOLO models."""
    try:
        models = []
        for model_id, model_info in settings.available_models.items():
            models.append({
                "id": model_id,
                "name": model_info["name"],
                "size": model_info["size"],
                "description": model_info["description"],
                "filename": model_info["filename"]
            })
        return models
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")


@router.post("/detect/image")
async def detect_objects_in_image(
    file: UploadFile = File(...),
    model: str = Form(..., description="YOLO model to use (yolov8n, yolov8s, yolov8m, yolov8l)")
):
    """Detect objects in an uploaded image."""
    start_time = time.time()

    try:
        # Validate file
        await validate_file(file, settings.supported_image_types, settings.max_file_size)

        # Validate model
        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        logger.info(f"Processing image with model {model}: {file.filename}")

        # Process image
        result = await detection_service.process_image(file, model)

        processing_time = time.time() - start_time
        result["processing_time"] = processing_time

        logger.info(".3f")
        return result

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(".3f")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")


@router.post("/detect/video")
async def detect_objects_in_video(
    file: UploadFile = File(...),
    model: str = Form(..., description="YOLO model to use (yolov8n, yolov8s, yolov8m, yolov8l)")
):
    """Detect objects in an uploaded video."""
    start_time = time.time()

    try:
        # Validate file
        await validate_file(file, settings.supported_video_types, settings.max_file_size)

        # Validate model
        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        logger.info(f"Processing video with model {model}: {file.filename}")

        # Process video
        result = await detection_service.process_video(file, model)

        processing_time = time.time() - start_time
        result["processing_time"] = processing_time

        logger.info(".3f")
        return result

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(".3f")
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")


@router.get("/video/status/{filename}")
async def get_video_status(filename: str):
    """Check if a processed video file exists and is ready."""
    import os
    file_path = os.path.join("static", filename)

    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        return {
            "ready": True,
            "filename": filename,
            "size": os.path.getsize(file_path)
        }
    else:
        return {
            "ready": False,
            "filename": filename
        }


@router.get("/health")
async def api_health():
    """API health check."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "models_loaded": len(model_manager.loaded_models),
        "service": "YOLO Object Detection API"
    }
