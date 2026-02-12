"""API routes for the YOLO Object Detection application."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import time
import os
from datetime import datetime

from app.config import settings
from app.models.yolo_manager import YOLOModelManager
from app.models.database import get_db
from app.models.schemas import CreateGalleryItemRequest
from app.services.detection_service import DetectionService
from app.utils.logger import app_logger as logger
from app.utils.file_validator import validate_file
from app.api.gallery_routes import router as gallery_router
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

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
    model: str = Form(..., description="YOLO model to use (yolov8n, yolov8s, yolov8m, yolov8l)"),
    confidence: float = Form(None, description="Confidence threshold (0.0-1.0)"),
    iou: float = Form(None, description="IOU threshold for NMS (0.0-1.0)"),
    max_det: int = Form(None, description="Maximum number of detections"),
    imgsz: int = Form(None, description="Input image size (320, 640, 1280)"),
    save_to_gallery: bool = Form(False, description="Save result to gallery"),
    gallery_title: str = Form(None, description="Title for gallery item"),
    gallery_description: str = Form(None, description="Description for gallery item"),
    gallery_project_id: str = Form(None, description="Project ID to associate with"),
    gallery_tags: str = Form(None, description="Comma-separated tags for gallery item"),
    snapshot_enabled: bool = Form(False, description="Enable snapshot capture of detected objects"),
    snapshot_classes: str = Form(None, description="Comma-separated class names to snapshot (e.g., 'car,person'). Empty = all classes"),
    session: AsyncSession = Depends(get_db)
):
    """Detect objects in an uploaded image."""
    start_time = time.time()

    try:
        # Validate file
        await validate_file(file, settings.supported_image_types, settings.max_file_size)

        # Validate model
        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        # Build detection config
        detection_config = {}
        if confidence is not None:
            detection_config['conf'] = confidence
        if iou is not None:
            detection_config['iou'] = iou
        if max_det is not None:
            detection_config['max_det'] = max_det
        if imgsz is not None:
            detection_config['imgsz'] = imgsz

        # Create gallery request if needed
        gallery_request = None
        if save_to_gallery:
            gallery_request = CreateGalleryItemRequest(
                project_id=gallery_project_id,
                title=gallery_title,
                description=gallery_description,
                tags=gallery_tags.split(',') if gallery_tags else [],
                save_to_gallery=True
            )

        # Parse snapshot classes
        parsed_snapshot_classes = None
        if snapshot_classes:
            parsed_snapshot_classes = [c.strip() for c in snapshot_classes.split(',') if c.strip()]

        logger.info(f"Processing image with model {model}: {file.filename} - Config: {detection_config} - Gallery: {save_to_gallery} - Snapshots: {snapshot_enabled}")

        # Process image
        result = await detection_service.process_image(
            file, model, detection_config, gallery_request, session,
            snapshot_enabled=snapshot_enabled,
            snapshot_classes=parsed_snapshot_classes,
        )

        processing_time = time.time() - start_time
        result["processing_time"] = processing_time

        logger.info(f"Image processed in {processing_time:.3f}s")
        return result

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Image processing failed in {processing_time:.3f}s: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")


@router.post("/detect/video")
async def detect_objects_in_video(
    file: UploadFile = File(...),
    model: str = Form(..., description="YOLO model to use (yolov8n, yolov8s, yolov8m, yolov8l)"),
    confidence: float = Form(None, description="Confidence threshold (0.0-1.0)"),
    iou: float = Form(None, description="IOU threshold for NMS (0.0-1.0)"),
    max_det: int = Form(None, description="Maximum number of detections"),
    imgsz: int = Form(None, description="Input image size (320, 640, 1280)"),
    save_to_gallery: bool = Form(False, description="Save result to gallery"),
    gallery_title: str = Form(None, description="Title for gallery item"),
    gallery_description: str = Form(None, description="Description for gallery item"),
    gallery_project_id: str = Form(None, description="Project ID to associate with"),
    gallery_tags: str = Form(None, description="Comma-separated tags for gallery item"),
    session: AsyncSession = Depends(get_db)
):
    """Detect objects in an uploaded video."""
    start_time = time.time()

    try:
        # Validate file
        await validate_file(file, settings.supported_video_types, settings.max_file_size)

        # Validate model
        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        # Build detection config
        detection_config = {}
        if confidence is not None:
            detection_config['conf'] = confidence
        if iou is not None:
            detection_config['iou'] = iou
        if max_det is not None:
            detection_config['max_det'] = max_det
        if imgsz is not None:
            detection_config['imgsz'] = imgsz

        # Create gallery request if needed
        gallery_request = None
        if save_to_gallery:
            gallery_request = CreateGalleryItemRequest(
                project_id=gallery_project_id,
                title=gallery_title,
                description=gallery_description,
                tags=gallery_tags.split(',') if gallery_tags else [],
                save_to_gallery=True
            )

        logger.info(f"Processing video with model {model}: {file.filename} - Config: {detection_config} - Gallery: {save_to_gallery}")

        # Process video
        result = await detection_service.process_video(file, model, detection_config, gallery_request, session)

        processing_time = time.time() - start_time
        result["processing_time"] = processing_time

        logger.info(f"Video processed in {processing_time:.3f}s")
        return result

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Video processing failed in {processing_time:.3f}s: {e}")
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")


@router.post("/detect/track")
async def detect_with_tracking(
    file: UploadFile = File(...),
    model: str = Form(..., description="YOLO model to use"),
    confidence: float = Form(None, description="Confidence threshold (0.0-1.0)"),
    iou: float = Form(None, description="IOU threshold for NMS (0.0-1.0)"),
    max_det: int = Form(None, description="Maximum number of detections"),
    imgsz: int = Form(None, description="Input image size (320, 640, 1280)"),
    snapshot_enabled: bool = Form(False, description="Enable snapshot capture of detected objects"),
    snapshot_classes: str = Form(None, description="Comma-separated class names to snapshot"),
):
    """Detect and track objects in an image frame using ByteTrack."""
    start_time = time.time()

    try:
        await validate_file(file, settings.supported_image_types, settings.max_file_size)

        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        detection_config = {}
        if confidence is not None:
            detection_config['conf'] = confidence
        if iou is not None:
            detection_config['iou'] = iou
        if max_det is not None:
            detection_config['max_det'] = max_det
        if imgsz is not None:
            detection_config['imgsz'] = imgsz

        # Parse snapshot classes
        parsed_snapshot_classes = None
        if snapshot_classes:
            parsed_snapshot_classes = [c.strip() for c in snapshot_classes.split(',') if c.strip()]

        result = await detection_service.process_image_with_tracking(
            file, model, detection_config,
            snapshot_enabled=snapshot_enabled,
            snapshot_classes=parsed_snapshot_classes,
        )

        processing_time = time.time() - start_time
        result["processing_time"] = processing_time

        return result

    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Tracking failed in {processing_time:.3f}s: {e}")
        raise HTTPException(status_code=500, detail=f"Tracking failed: {str(e)}")


@router.post("/detect/track/reset")
async def reset_tracking(
    model: str = Form(..., description="YOLO model to reset tracker for"),
):
    """Reset the ByteTrack tracker state for a model."""
    try:
        if model not in settings.available_models:
            raise HTTPException(status_code=400, detail=f"Invalid model: {model}")

        await detection_service.reset_tracker(model)
        return {"success": True, "message": f"Tracker reset for {model}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tracker reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Tracker reset failed: {str(e)}")


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


@router.get("/snapshots")
async def list_snapshots():
    """List all snapshot files currently on disk."""
    snapshot_dir = settings.snapshot_directory
    if not os.path.exists(snapshot_dir):
        return {"snapshots": [], "count": 0}
    files = sorted(
        [f for f in os.listdir(snapshot_dir) if f.startswith("snap_") and f.endswith(".jpg")],
        key=lambda f: os.path.getmtime(os.path.join(snapshot_dir, f)),
        reverse=True
    )
    return {
        "snapshots": [{"snapshot_url": f"/static/snapshots/{f}"} for f in files],
        "count": len(files)
    }


@router.delete("/snapshots")
async def clear_snapshots():
    """Delete all snapshot files from disk."""
    import glob
    snapshot_dir = settings.snapshot_directory
    files = glob.glob(os.path.join(snapshot_dir, "snap_*.jpg"))
    for f in files:
        os.remove(f)
    detection_service.snapshot_service.reset_seen_tracks()
    return {"success": True, "deleted": len(files)}


@router.get("/health")
async def api_health():
    """API health check."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "models_loaded": len(model_manager.loaded_models),
        "service": "YOLO Object Detection API"
    }
