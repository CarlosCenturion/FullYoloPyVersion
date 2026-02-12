"""Pydantic schemas for gallery API."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class DetectionSchema(BaseModel):
    """Schema for detection results."""
    class_name: str = Field(..., description="Detected object class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    bbox: List[float] = Field(..., min_items=4, max_items=4, description="Bounding box coordinates [x1, y1, x2, y2]")


class DetectionConfigSchema(BaseModel):
    """Schema for detection configuration."""
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence threshold")
    iou: float = Field(..., ge=0.0, le=1.0, description="IOU threshold for NMS")
    max_detections: int = Field(..., gt=0, description="Maximum number of detections")
    image_size: int = Field(..., description="Input image size")
    classes: Optional[List[int]] = Field(None, description="Filter specific classes")


class ProjectBase(BaseModel):
    """Base project schema."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$', description="Project color (hex)")
    tags: List[str] = Field(default_factory=list, description="Project tags")


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    tags: Optional[List[str]] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""
    id: str = Field(..., description="Project ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    item_count: int = Field(..., description="Number of items in project")
    total_detections: int = Field(..., description="Total detections in project")


class GalleryItemBase(BaseModel):
    """Base gallery item schema."""
    title: str = Field(..., min_length=1, max_length=255, description="Item title")
    description: Optional[str] = Field(None, max_length=1000, description="Item description")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    tags: List[str] = Field(default_factory=list, description="Item tags")


class GalleryItemCreate(GalleryItemBase):
    """Schema for creating a gallery item."""
    file_type: str = Field(..., pattern=r'^(image|video)$', description="File type")
    original_filename: str = Field(..., description="Original filename")
    processed_filename: str = Field(..., description="Processed filename")
    model_used: str = Field(..., description="YOLO model used")
    detection_config: DetectionConfigSchema = Field(..., description="Detection configuration")
    detections: List[DetectionSchema] = Field(..., description="Detection results")
    processing_time: float = Field(..., gt=0, description="Processing time in seconds")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")


class GalleryItemUpdate(BaseModel):
    """Schema for updating a gallery item."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    project_id: Optional[str] = Field(None)
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


class GalleryItemResponse(GalleryItemBase):
    """Schema for gallery item response."""
    id: str = Field(..., description="Item ID")
    file_type: str = Field(..., description="File type")
    original_filename: str = Field(..., description="Original filename")
    processed_filename: str = Field(..., description="Processed filename")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    model_used: str = Field(..., description="YOLO model used")
    detection_config: DetectionConfigSchema = Field(..., description="Detection configuration")
    detections: List[DetectionSchema] = Field(..., description="Detection results")
    processing_time: float = Field(..., description="Processing time in seconds")
    file_size: int = Field(..., description="File size in bytes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_favorite: bool = Field(..., description="Is item favorited")


class GalleryFilters(BaseModel):
    """Schema for gallery filtering."""
    search: Optional[str] = Field(None, description="Search query")
    project_id: Optional[str] = Field(None, description="Filter by project")
    file_type: Optional[str] = Field(None, pattern=r'^(image|video)$', description="Filter by file type")
    model_used: Optional[str] = Field(None, description="Filter by model")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    date_from: Optional[str] = Field(None, description="Filter from date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="Filter to date (YYYY-MM-DD)")
    is_favorite: Optional[bool] = Field(None, description="Filter favorites only")
    min_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum confidence")
    max_detections: Optional[int] = Field(None, gt=0, description="Maximum detections")
    limit: int = Field(20, ge=1, le=100, description="Items per page")
    offset: int = Field(0, ge=0, description="Pagination offset")


class GalleryStats(BaseModel):
    """Schema for gallery statistics."""
    total_items: int = Field(..., description="Total gallery items")
    total_projects: int = Field(..., description="Total projects")
    total_detections: int = Field(..., description="Total detections across all items")
    avg_processing_time: float = Field(..., description="Average processing time")
    most_used_model: str = Field(..., description="Most used YOLO model")
    favorite_items: int = Field(..., description="Number of favorited items")
    items_by_type: Dict[str, int] = Field(..., description="Items count by type")
    items_by_model: Dict[str, int] = Field(..., description="Items count by model")
    recent_activity: List[Dict[str, Any]] = Field(..., description="Recent activity data")


class CreateGalleryItemRequest(BaseModel):
    """Schema for gallery item creation request during detection."""
    project_id: Optional[str] = Field(None, description="Project to associate with")
    title: str = Field(..., min_length=1, max_length=255, description="Item title")
    description: Optional[str] = Field(None, max_length=1000, description="Item description")
    tags: List[str] = Field(default_factory=list, description="Item tags")
    save_to_gallery: bool = Field(True, description="Whether to save to gallery")
