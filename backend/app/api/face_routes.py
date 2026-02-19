"""API routes for face recognition (FIND SUBJECT feature)."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import numpy as np
from PIL import Image
from io import BytesIO

from app.services.face_recognition_service import FaceRecognitionService
from app.utils.logger import app_logger as logger
from app.utils.file_validator import validate_file
from app.config import settings

router = APIRouter()
face_service = FaceRecognitionService()


@router.post("/reference")
async def upload_reference_face(
    file: UploadFile = File(..., description="Reference photo containing the face to find"),
    threshold: float = Form(0.55, description="Similarity threshold (0.0-1.0)"),
):
    """Upload a reference face image. Adds the embedding to the reference pool.

    Multiple uploads accumulate - each adds another reference embedding for
    better matching across angles, lighting, and expressions.
    """
    try:
        await validate_file(file, settings.supported_image_types, settings.max_file_size)

        image_data = await file.read()

        face_service.threshold = threshold

        result = await face_service.add_reference_image(image_data)
        result["threshold"] = face_service.threshold
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reference face upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Face processing failed: {str(e)}")


@router.post("/match")
async def match_faces_in_frame(
    file: UploadFile = File(..., description="Video frame to search for the reference face"),
):
    """Compare faces in a video frame against all stored reference embeddings."""
    if not face_service.has_reference:
        raise HTTPException(
            status_code=400,
            detail="No reference face uploaded. Upload one first via POST /api/face/reference"
        )

    try:
        await validate_file(file, settings.supported_image_types, settings.max_file_size)

        image_data = await file.read()
        image = Image.open(BytesIO(image_data)).convert("RGB")
        image_np = np.array(image)

        result = await face_service.match_frame(image_np)
        result["threshold"] = face_service.threshold
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Face matching failed: {str(e)}")


@router.delete("/reference")
async def clear_reference_face():
    """Clear all stored reference face embeddings."""
    face_service.clear_reference()
    return {"success": True, "message": "All reference faces cleared"}


@router.delete("/reference/{index}")
async def remove_reference_face(index: int):
    """Remove a specific reference face by index."""
    if not face_service.remove_reference(index):
        raise HTTPException(status_code=404, detail=f"Reference index {index} not found")
    return {
        "success": True,
        "message": f"Reference #{index} removed",
        "reference_count": face_service.reference_count,
        "all_thumbnails": list(face_service._reference_thumbnails),
    }


@router.get("/status")
async def face_recognition_status():
    """Get current face recognition status."""
    return {
        "has_reference": face_service.has_reference,
        "reference_count": face_service.reference_count,
        "threshold": face_service.threshold,
        "all_thumbnails": list(face_service._reference_thumbnails),
    }


@router.post("/threshold")
async def update_threshold(
    threshold: float = Form(..., description="New similarity threshold (0.0-1.0)"),
):
    """Update the similarity threshold without re-uploading reference."""
    face_service.threshold = threshold
    return {"success": True, "threshold": face_service.threshold}
