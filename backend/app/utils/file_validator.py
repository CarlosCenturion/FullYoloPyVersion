"""File validation utilities."""

from fastapi import HTTPException, UploadFile, status
from app.utils.logger import app_logger as logger


async def validate_file(file: UploadFile, allowed_types: list, max_size: int):
    """Validate uploaded file type and size."""

    # Check if file exists
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    # Check file size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > max_size:
        max_size_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size_mb:.1f}MB"
        )

    # Check file type
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed: {', '.join(allowed_types)}"
        )

    # Reset file pointer for further processing
    await file.seek(0)

    logger.info(f"File validated: {file.filename} ({file_size} bytes, {file.content_type})")


def validate_image_dimensions(width: int, height: int):
    """Validate image dimensions against configured limits."""

    from app.config import settings

    if width > settings.max_image_width or height > settings.max_image_height:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image dimensions too large. Maximum: {settings.max_image_width}x{settings.max_image_height}"
        )

    logger.info(f"Image dimensions validated: {width}x{height}")


def validate_video_duration(duration: float):
    """Validate video duration against configured limits."""

    from app.config import settings

    if duration > settings.max_video_duration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video too long. Maximum duration: {settings.max_video_duration}s"
        )

    logger.info(f"Video duration validated: {duration:.1f}s")
