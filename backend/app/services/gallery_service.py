"""Gallery service for managing projects and gallery items."""

import uuid
import json
import os
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, and_, func, text
from sqlalchemy.orm import selectinload

from app.models.database import Project as DBProject, GalleryItem as DBGalleryItem, get_project_stats, get_gallery_stats
from app.models.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    GalleryItemCreate, GalleryItemUpdate, GalleryItemResponse,
    GalleryFilters, GalleryStats, DetectionSchema, DetectionConfigSchema
)
from app.utils.logger import app_logger as logger


class GalleryService:
    """Service for gallery operations."""

    def __init__(self):
        self.logger = logger

    async def create_project(self, session: AsyncSession, project_data: ProjectCreate) -> ProjectResponse:
        """Create a new project."""
        project_id = str(uuid.uuid4())
        project = DBProject(
            id=project_id,
            name=project_data.name,
            description=project_data.description,
            color=project_data.color,
            tags=json.dumps(project_data.tags)
        )

        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Get stats for the new project
        stats = await get_project_stats(session, project_id)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            color=project.color,
            tags=json.loads(project.tags) if project.tags else [],
            created_at=project.created_at,
            updated_at=project.updated_at,
            item_count=stats["item_count"],
            total_detections=stats["total_detections"]
        )

    async def get_project(self, session: AsyncSession, project_id: str) -> Optional[ProjectResponse]:
        """Get a project by ID."""
        result = await session.execute(
            select(DBProject).where(DBProject.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            return None

        # Get stats
        stats = await get_project_stats(session, project_id)

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            color=project.color,
            tags=json.loads(project.tags) if project.tags else [],
            created_at=project.created_at,
            updated_at=project.updated_at,
            item_count=stats["item_count"],
            total_detections=stats["total_detections"]
        )

    async def list_projects(self, session: AsyncSession) -> List[ProjectResponse]:
        """List all projects."""
        result = await session.execute(select(DBProject).order_by(DBProject.updated_at.desc()))
        projects = result.scalars().all()

        project_responses = []
        for project in projects:
            stats = await get_project_stats(session, project.id)
            project_responses.append(ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                color=project.color,
                tags=json.loads(project.tags) if project.tags else [],
                created_at=project.created_at,
                updated_at=project.updated_at,
                item_count=stats["item_count"],
                total_detections=stats["total_detections"]
            ))

        return project_responses

    async def update_project(self, session: AsyncSession, project_id: str, update_data: ProjectUpdate) -> Optional[ProjectResponse]:
        """Update a project."""
        # Check if project exists
        project = await self.get_project(session, project_id)
        if not project:
            return None

        # Prepare update data
        update_dict = {}
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.description is not None:
            update_dict["description"] = update_data.description
        if update_data.color is not None:
            update_dict["color"] = update_data.color
        if update_data.tags is not None:
            update_dict["tags"] = json.dumps(update_data.tags)

        if update_dict:
            update_dict["updated_at"] = datetime.now()

            await session.execute(
                update(DBProject)
                .where(DBProject.id == project_id)
                .values(**update_dict)
            )
            await session.commit()

        # Return updated project
        return await self.get_project(session, project_id)

    async def delete_project(self, session: AsyncSession, project_id: str) -> bool:
        """Delete a project and all its items."""
        # First, delete all gallery items in the project
        await session.execute(
            delete(DBGalleryItem).where(DBGalleryItem.project_id == project_id)
        )

        # Then delete the project
        result = await session.execute(
            delete(DBProject).where(DBProject.id == project_id)
        )

        await session.commit()
        return result.rowcount > 0

    async def create_gallery_item(self, session: AsyncSession, item_data: GalleryItemCreate) -> GalleryItemResponse:
        """Create a new gallery item."""
        item_id = str(uuid.uuid4())
        item = DBGalleryItem(
            id=item_id,
            project_id=item_data.project_id,
            title=item_data.title,
            description=item_data.description,
            file_type=item_data.file_type,
            original_filename=item_data.original_filename,
            processed_filename=item_data.processed_filename,
            thumbnail_url=item_data.thumbnail_url,
            model_used=item_data.model_used,
            detection_config=json.dumps(item_data.detection_config.model_dump()),
            detections=json.dumps([d.model_dump() for d in item_data.detections]),
            processing_time=item_data.processing_time,
            file_size=item_data.file_size,
            tags=json.dumps(item_data.tags),
            is_favorite=False
        )

        session.add(item)
        await session.commit()
        await session.refresh(item)

        return await self._db_item_to_response(item)

    async def get_gallery_item(self, session: AsyncSession, item_id: str) -> Optional[GalleryItemResponse]:
        """Get a gallery item by ID."""
        result = await session.execute(
            select(DBGalleryItem).where(DBGalleryItem.id == item_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            return None

        return await self._db_item_to_response(item)

    async def list_gallery_items(self, session: AsyncSession, filters: GalleryFilters) -> Dict[str, Any]:
        """List gallery items with filtering and pagination."""
        query = select(DBGalleryItem)

        # Apply filters
        conditions = []

        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    DBGalleryItem.title.ilike(search_term),
                    DBGalleryItem.description.ilike(search_term),
                    DBGalleryItem.original_filename.ilike(search_term),
                    DBGalleryItem.tags.ilike(search_term)
                )
            )

        if filters.project_id:
            conditions.append(DBGalleryItem.project_id == filters.project_id)

        if filters.file_type:
            conditions.append(DBGalleryItem.file_type == filters.file_type)

        if filters.model_used:
            conditions.append(DBGalleryItem.model_used == filters.model_used)

        if filters.tags:
            for tag in filters.tags:
                conditions.append(DBGalleryItem.tags.like(f'%"{tag}"%'))

        if filters.date_from:
            conditions.append(DBGalleryItem.created_at >= filters.date_from)

        if filters.date_to:
            conditions.append(DBGalleryItem.created_at <= filters.date_to + " 23:59:59")

        if filters.is_favorite is not None:
            conditions.append(DBGalleryItem.is_favorite == filters.is_favorite)

        if filters.min_confidence:
            # This is more complex - need to filter by detection confidence
            # For simplicity, we'll skip this for now and implement it later
            pass

        if filters.max_detections:
            # Count detections in JSON
            # This requires a more complex query, skip for now
            pass

        if conditions:
            query = query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await session.execute(count_query)
        total_count = result.scalar() or 0

        # Apply ordering and pagination
        query = query.order_by(DBGalleryItem.updated_at.desc())
        query = query.limit(filters.limit).offset(filters.offset)

        # Execute query
        result = await session.execute(query)
        items = result.scalars().all()

        # Convert to response objects
        item_responses = []
        for item in items:
            item_responses.append(await self._db_item_to_response(item))

        return {
            "items": item_responses,
            "total": total_count,
            "limit": filters.limit,
            "offset": filters.offset
        }

    async def update_gallery_item(self, session: AsyncSession, item_id: str, update_data: GalleryItemUpdate) -> Optional[GalleryItemResponse]:
        """Update a gallery item."""
        # Check if item exists
        item = await self.get_gallery_item(session, item_id)
        if not item:
            return None

        # Prepare update data
        update_dict = {}
        if update_data.title is not None:
            update_dict["title"] = update_data.title
        if update_data.description is not None:
            update_dict["description"] = update_data.description
        if update_data.project_id is not None:
            update_dict["project_id"] = update_data.project_id
        if update_data.tags is not None:
            update_dict["tags"] = json.dumps(update_data.tags)
        if update_data.is_favorite is not None:
            update_dict["is_favorite"] = update_data.is_favorite

        if update_dict:
            update_dict["updated_at"] = datetime.now()

            await session.execute(
                update(DBGalleryItem)
                .where(DBGalleryItem.id == item_id)
                .values(**update_dict)
            )
            await session.commit()

        # Return updated item
        return await self.get_gallery_item(session, item_id)

    async def delete_gallery_item(self, session: AsyncSession, item_id: str) -> bool:
        """Delete a gallery item."""
        # Get item first to clean up files
        item = await self.get_gallery_item(session, item_id)
        if item:
            # Delete processed file
            file_path = os.path.join("static", item.processed_filename)
            if os.path.exists(file_path):
                os.remove(file_path)

            # Delete thumbnail if exists
            if item.thumbnail_url:
                thumbnail_path = os.path.join("static", item.thumbnail_url)
                if os.path.exists(thumbnail_path):
                    os.remove(thumbnail_path)

        # Delete from database
        result = await session.execute(
            delete(DBGalleryItem).where(DBGalleryItem.id == item_id)
        )

        await session.commit()
        return result.rowcount > 0

    async def get_gallery_stats(self, session: AsyncSession) -> GalleryStats:
        """Get gallery statistics."""
        stats = await get_gallery_stats(session)
        return GalleryStats(**stats)

    async def _db_item_to_response(self, db_item: DBGalleryItem) -> GalleryItemResponse:
        """Convert database item to response schema."""
        # Parse detection config
        detection_config = json.loads(db_item.detection_config)
        config_schema = DetectionConfigSchema(**detection_config)

        # Parse detections
        detections_data = json.loads(db_item.detections)
        detections = [DetectionSchema(**d) for d in detections_data]

        return GalleryItemResponse(
            id=db_item.id,
            project_id=db_item.project_id,
            title=db_item.title,
            description=db_item.description,
            file_type=db_item.file_type,
            original_filename=db_item.original_filename,
            processed_filename=db_item.processed_filename,
            thumbnail_url=db_item.thumbnail_url,
            model_used=db_item.model_used,
            detection_config=config_schema,
            detections=detections,
            processing_time=db_item.processing_time,
            file_size=db_item.file_size,
            created_at=db_item.created_at,
            updated_at=db_item.updated_at,
            tags=json.loads(db_item.tags) if db_item.tags else [],
            is_favorite=db_item.is_favorite
        )
