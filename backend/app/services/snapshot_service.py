"""Snapshot service for cropping and saving detected objects."""

import os
import uuid
import time
from typing import Dict, Any, List, Optional, Set

from PIL import Image
import numpy as np

from app.config import settings
from app.utils.logger import app_logger as logger


class SnapshotService:
    """Service for creating cropped snapshots of detected objects."""

    def __init__(self):
        self._seen_track_ids: Set[int] = set()
        self._ensure_snapshot_directory()

    def _ensure_snapshot_directory(self):
        os.makedirs(settings.snapshot_directory, exist_ok=True)

    def reset_seen_tracks(self):
        """Reset the set of already-snapshotted track IDs."""
        self._seen_track_ids.clear()
        logger.info("Snapshot seen tracks reset")

    def create_snapshots(
        self,
        image_np: np.ndarray,
        detections: List[Dict[str, Any]],
        snapshot_classes: Optional[List[str]] = None,
        use_tracking: bool = False,
    ) -> List[Dict[str, Any]]:
        """Crop and save snapshots for eligible detections.

        Args:
            image_np: The original image as numpy array (H, W, C) in RGB.
            detections: List of detection dicts with 'class', 'confidence', 'bbox', and optionally 'track_id'.
            snapshot_classes: If provided, only snapshot detections matching these class names (case-insensitive).
            use_tracking: If True, skip detections with track_ids already seen.

        Returns:
            List of snapshot metadata dicts.
        """
        self._ensure_snapshot_directory()
        snapshots = []
        count = 0
        h, w = image_np.shape[:2]

        # Normalize class filter to lowercase
        filter_classes = None
        if snapshot_classes:
            filter_classes = [c.lower() for c in snapshot_classes]

        for det in detections:
            if count >= settings.snapshot_max_per_request:
                break

            class_name = det["class"]

            # Minimum confidence filter (90%)
            if det["confidence"] < settings.snapshot_min_confidence:
                continue

            # Class filter
            if filter_classes and class_name.lower() not in filter_classes:
                continue

            # Tracking dedup
            if use_tracking:
                track_id = det.get("track_id")
                if track_id is None:
                    continue
                if track_id in self._seen_track_ids:
                    continue
                self._seen_track_ids.add(track_id)

            # Crop with bounds checking
            x1, y1, x2, y2 = det["bbox"]
            x1, y1 = max(0, int(x1)), max(0, int(y1))
            x2, y2 = min(w, int(x2)), min(h, int(y2))

            if x2 <= x1 or y2 <= y1:
                continue

            crop = image_np[y1:y2, x1:x2]

            # Convert to PIL and optionally resize
            pil_crop = Image.fromarray(crop)
            if pil_crop.width > settings.snapshot_max_width:
                ratio = settings.snapshot_max_width / pil_crop.width
                new_h = int(pil_crop.height * ratio)
                pil_crop = pil_crop.resize(
                    (settings.snapshot_max_width, new_h), Image.LANCZOS
                )

            # Save
            filename = f"snap_{uuid.uuid4().hex[:12]}.jpg"
            filepath = os.path.join(settings.snapshot_directory, filename)
            pil_crop.save(filepath, "JPEG", quality=settings.snapshot_jpeg_quality)

            snapshot_meta: Dict[str, Any] = {
                "snapshot_url": f"/static/snapshots/{filename}",
                "class": class_name,
                "confidence": det["confidence"],
                "bbox": det["bbox"],
                "timestamp": time.time(),
            }

            if det.get("track_id") is not None:
                snapshot_meta["track_id"] = det["track_id"]

            snapshots.append(snapshot_meta)
            count += 1

        if snapshots:
            logger.info(f"Created {len(snapshots)} snapshots")

        return snapshots
