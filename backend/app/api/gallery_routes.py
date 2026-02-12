"""Gallery API routes for projects and gallery items."""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import uuid

from app.models.database import get_db
from app.models.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    GalleryItemCreate, GalleryItemUpdate, GalleryItemResponse,
    GalleryFilters, GalleryStats
)
from app.services.gallery_service import GalleryService
from app.utils.logger import app_logger as logger

# Create router
router = APIRouter()

# Initialize service
gallery_service = GalleryService()


# Project endpoints
@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    session: AsyncSession = Depends(get_db)
):
    """Create a new project."""
    try:
        result = await gallery_service.create_project(session, project)
        return result
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_db)):
    """List all projects."""
    try:
        projects = await gallery_service.list_projects(session)
        return projects
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve projects")


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, session: AsyncSession = Depends(get_db)):
    """Get a specific project."""
    try:
        project = await gallery_service.get_project(session, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve project")


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    session: AsyncSession = Depends(get_db)
):
    """Update a project."""
    try:
        updated_project = await gallery_service.update_project(session, project_id, project_update)
        if not updated_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return updated_project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update project")


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, session: AsyncSession = Depends(get_db)):
    """Delete a project."""
    try:
        success = await gallery_service.delete_project(session, project_id)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete project")


# Gallery items endpoints
@router.post("/gallery", response_model=GalleryItemResponse)
async def create_gallery_item(
    item: GalleryItemCreate,
    session: AsyncSession = Depends(get_db)
):
    """Create a new gallery item."""
    try:
        result = await gallery_service.create_gallery_item(session, item)
        return result
    except Exception as e:
        logger.error(f"Error creating gallery item: {e}")
        raise HTTPException(status_code=500, detail="Failed to create gallery item")


@router.get("/gallery", response_model=Dict[str, Any])
async def list_gallery_items(
    search: Optional[str] = Query(None, description="Search query"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    file_type: Optional[str] = Query(None, description="Filter by file type (image/video)"),
    model_used: Optional[str] = Query(None, description="Filter by model"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites only"),
    min_confidence: Optional[float] = Query(None, description="Minimum confidence (0-1)"),
    max_detections: Optional[int] = Query(None, description="Maximum detections"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    session: AsyncSession = Depends(get_db)
):
    """List gallery items with filtering and pagination."""
    try:
        filters = GalleryFilters(
            search=search,
            project_id=project_id,
            file_type=file_type,
            model_used=model_used,
            tags=tags,
            date_from=date_from,
            date_to=date_to,
            is_favorite=is_favorite,
            min_confidence=min_confidence,
            max_detections=max_detections,
            limit=limit,
            offset=offset
        )

        result = await gallery_service.list_gallery_items(session, filters)
        return result
    except Exception as e:
        logger.error(f"Error listing gallery items: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve gallery items")


@router.get("/gallery/{item_id}", response_model=GalleryItemResponse)
async def get_gallery_item(item_id: str, session: AsyncSession = Depends(get_db)):
    """Get a specific gallery item."""
    try:
        item = await gallery_service.get_gallery_item(session, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Gallery item not found")
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting gallery item {item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve gallery item")


@router.put("/gallery/{item_id}", response_model=GalleryItemResponse)
async def update_gallery_item(
    item_id: str,
    item_update: GalleryItemUpdate,
    session: AsyncSession = Depends(get_db)
):
    """Update a gallery item."""
    try:
        updated_item = await gallery_service.update_gallery_item(session, item_id, item_update)
        if not updated_item:
            raise HTTPException(status_code=404, detail="Gallery item not found")
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating gallery item {item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update gallery item")


@router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, session: AsyncSession = Depends(get_db)):
    """Delete a gallery item."""
    try:
        success = await gallery_service.delete_gallery_item(session, item_id)
        if not success:
            raise HTTPException(status_code=404, detail="Gallery item not found")
        return {"message": "Gallery item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting gallery item {item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete gallery item")


# Statistics endpoint
@router.get("/gallery/stats", response_model=GalleryStats)
async def get_gallery_stats(session: AsyncSession = Depends(get_db)):
    """Get gallery statistics."""
    try:
        stats = await gallery_service.get_gallery_stats(session)
        return stats
    except Exception as e:
        logger.error(f"Error getting gallery stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve gallery statistics")


# Health check for gallery
@router.get("/gallery/health")
async def gallery_health():
    """Gallery API health check."""
    return {
        "status": "healthy",
        "service": "Gallery API",
        "endpoints": [
            "POST /api/gallery/projects - Create project",
            "GET /api/gallery/projects - List projects",
            "GET /api/gallery/projects/{id} - Get project",
            "PUT /api/gallery/projects/{id} - Update project",
            "DELETE /api/gallery/projects/{id} - Delete project",
            "POST /api/gallery - Create gallery item",
            "GET /api/gallery - List gallery items",
            "GET /api/gallery/{id} - Get gallery item",
            "PUT /api/gallery/{id} - Update gallery item",
            "DELETE /api/gallery/{id} - Delete gallery item",
            "GET /api/gallery/stats - Get statistics"
        ]
    }
