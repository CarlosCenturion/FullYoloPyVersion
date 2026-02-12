"""Database models and connection for gallery functionality."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from typing import List, Optional
import json


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


class Project(Base):
    """Project model for organizing gallery items."""
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    color: Mapped[Optional[str]] = mapped_column(String(7))  # Hex color code
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of tags


class GalleryItem(Base):
    """Gallery item model for storing detection results."""
    __tablename__ = "gallery_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'image' or 'video'
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    processed_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    detection_config: Mapped[str] = mapped_column(Text, nullable=False)  # JSON config
    detections: Mapped[str] = mapped_column(Text, nullable=False)  # JSON detections array
    processing_time: Mapped[float] = mapped_column(Float, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of tags
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)


# Database connection
DATABASE_URL = "sqlite+aiosqlite:///./gallery.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for debugging
    connect_args={"check_same_thread": False}
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """Get database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database and create tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_project_stats(session: AsyncSession, project_id: str) -> dict:
    """Get statistics for a specific project."""
    from sqlalchemy import select, func

    # Count items in project
    result = await session.execute(
        select(func.count(GalleryItem.id)).where(GalleryItem.project_id == project_id)
    )
    item_count = result.scalar() or 0

    # Count total detections in project
    result = await session.execute(
        select(GalleryItem.detections).where(GalleryItem.project_id == project_id)
    )
    rows = result.fetchall()
    total_detections = sum(len(json.loads(row[0])) for row in rows if row[0])

    return {
        "item_count": item_count,
        "total_detections": total_detections
    }


async def get_gallery_stats(session: AsyncSession) -> dict:
    """Get overall gallery statistics."""
    from sqlalchemy import select, func, case

    # Total items and projects
    result = await session.execute(select(func.count(GalleryItem.id)))
    total_items = result.scalar() or 0

    result = await session.execute(select(func.count(Project.id)))
    total_projects = result.scalar() or 0

    # Total detections
    result = await session.execute(select(GalleryItem.detections))
    rows = result.fetchall()
    total_detections = sum(len(json.loads(row[0])) for row in rows if row[0])

    # Average processing time
    result = await session.execute(select(func.avg(GalleryItem.processing_time)))
    avg_processing_time = result.scalar() or 0

    # Most used model
    result = await session.execute(
        select(GalleryItem.model_used, func.count(GalleryItem.id))
        .group_by(GalleryItem.model_used)
        .order_by(func.count(GalleryItem.id).desc())
        .limit(1)
    )
    most_used_row = result.first()
    most_used_model = most_used_row[0] if most_used_row else "N/A"

    # Favorite items count
    result = await session.execute(
        select(func.count(GalleryItem.id)).where(GalleryItem.is_favorite == True)
    )
    favorite_items = result.scalar() or 0

    # Items by type
    result = await session.execute(
        select(
            func.sum(case((GalleryItem.file_type == "image", 1), else_=0)),
            func.sum(case((GalleryItem.file_type == "video", 1), else_=0))
        )
    )
    image_count, video_count = result.first()

    # Items by model
    result = await session.execute(
        select(GalleryItem.model_used, func.count(GalleryItem.id))
        .group_by(GalleryItem.model_used)
    )
    items_by_model = {row[0]: row[1] for row in result.fetchall()}

    # Recent activity (last 7 days)
    from datetime import datetime, timedelta
    seven_days_ago = datetime.now() - timedelta(days=7)

    result = await session.execute(
        select(
            func.date(GalleryItem.created_at).label('date'),
            func.count(GalleryItem.id)
        )
        .where(GalleryItem.created_at >= seven_days_ago)
        .group_by(func.date(GalleryItem.created_at))
        .order_by(func.date(GalleryItem.created_at))
    )

    recent_activity = [
        {"date": row[0], "count": row[1]}
        for row in result.fetchall()
    ]

    return {
        "total_items": total_items,
        "total_projects": total_projects,
        "total_detections": total_detections,
        "avg_processing_time": float(avg_processing_time),
        "most_used_model": most_used_model,
        "favorite_items": favorite_items,
        "items_by_type": {
            "image": image_count or 0,
            "video": video_count or 0
        },
        "items_by_model": items_by_model,
        "recent_activity": recent_activity
    }
