"""Face recognition service for FIND SUBJECT feature."""

import os
import uuid
import time
import numpy as np
from typing import Dict, Any, List, Optional
from PIL import Image
from io import BytesIO

from app.config import settings
from app.utils.logger import app_logger as logger

# Lazy-loaded to avoid import cost at startup
_deepface = None
_detector_backend = "mtcnn"
_model_name = "ArcFace"


def _get_deepface():
    """Lazy-load DeepFace to avoid slow startup."""
    global _deepface
    if _deepface is None:
        from deepface import DeepFace
        _deepface = DeepFace
    return _deepface


class FaceRecognitionService:
    """Service for face detection, embedding extraction, and matching.

    Supports multiple reference images per subject. Each uploaded photo adds
    an embedding to the pool. During matching, the best (max) cosine similarity
    across all stored embeddings is used.
    """

    def __init__(self):
        self._reference_embeddings: List[np.ndarray] = []
        self._reference_thumbnails: List[str] = []  # URL paths
        self._similarity_threshold: float = 0.55
        self._ensure_directory()

    def _ensure_directory(self):
        os.makedirs(os.path.join("static", "face_ref"), exist_ok=True)

    @property
    def has_reference(self) -> bool:
        return len(self._reference_embeddings) > 0

    @property
    def reference_count(self) -> int:
        return len(self._reference_embeddings)

    @property
    def threshold(self) -> float:
        return self._similarity_threshold

    @threshold.setter
    def threshold(self, value: float):
        self._similarity_threshold = max(0.0, min(1.0, value))

    async def add_reference_image(self, image_data: bytes) -> Dict[str, Any]:
        """Extract face embedding from uploaded reference image and add to pool."""
        start = time.time()
        DeepFace = _get_deepface()

        image = Image.open(BytesIO(image_data)).convert("RGB")
        image_np = np.array(image)

        try:
            embeddings = DeepFace.represent(
                img_path=image_np,
                model_name=_model_name,
                detector_backend=_detector_backend,
                enforce_detection=True,
            )
        except ValueError:
            raise ValueError("No face detected in reference image. Please upload a clear photo with a visible face.")

        if not embeddings or len(embeddings) == 0:
            raise ValueError("No face detected in reference image.")

        new_embedding = np.array(embeddings[0]["embedding"])
        self._reference_embeddings.append(new_embedding)

        face_area = embeddings[0].get("facial_area", {})
        x = face_area.get("x", 0)
        y = face_area.get("y", 0)
        w = face_area.get("w", image.width)
        h = face_area.get("h", image.height)
        face_crop = image.crop((x, y, x + w, y + h))

        thumb_filename = f"ref_{uuid.uuid4().hex[:8]}.jpg"
        thumb_path = os.path.join("static", "face_ref", thumb_filename)
        face_crop.save(thumb_path, "JPEG", quality=90)
        thumb_url = f"/static/face_ref/{thumb_filename}"
        self._reference_thumbnails.append(thumb_url)

        elapsed = time.time() - start
        logger.info(
            f"Reference face #{self.reference_count} added in {elapsed:.2f}s "
            f"({_model_name}, {len(new_embedding)}-dim)"
        )

        return {
            "success": True,
            "embedding_size": len(new_embedding),
            "model": _model_name,
            "face_area": {"x": x, "y": y, "w": w, "h": h},
            "thumbnail_url": thumb_url,
            "processing_time": elapsed,
            "faces_found": len(embeddings),
            "reference_count": self.reference_count,
            "all_thumbnails": list(self._reference_thumbnails),
        }

    async def match_frame(self, image_np: np.ndarray) -> Dict[str, Any]:
        """Detect faces in a video frame and compare to all reference embeddings.

        For each detected face, the best (max) cosine similarity across all
        stored reference embeddings is used.
        """
        if not self._reference_embeddings:
            return {"matches": [], "faces_detected": 0, "processing_time": 0}

        start = time.time()
        DeepFace = _get_deepface()

        try:
            embeddings = DeepFace.represent(
                img_path=image_np,
                model_name=_model_name,
                detector_backend=_detector_backend,
                enforce_detection=False,
            )
        except Exception as e:
            logger.warning(f"Face detection failed on frame: {e}")
            return {"matches": [], "faces_detected": 0, "processing_time": time.time() - start}

        matches = []
        for face_data in embeddings:
            embedding = np.array(face_data["embedding"])

            # Compare against ALL reference embeddings, take max similarity
            best_similarity = max(
                self._cosine_similarity(ref, embedding)
                for ref in self._reference_embeddings
            )

            face_area = face_data.get("facial_area", {})
            x = face_area.get("x", 0)
            y = face_area.get("y", 0)
            w = face_area.get("w", 0)
            h = face_area.get("h", 0)

            face_info = {
                "bbox": [x, y, x + w, y + h],
                "similarity": float(best_similarity),
                "is_match": best_similarity >= self._similarity_threshold,
            }
            matches.append(face_info)

        elapsed = time.time() - start
        return {
            "matches": matches,
            "faces_detected": len(embeddings),
            "processing_time": elapsed,
        }

    def remove_reference(self, index: int) -> bool:
        """Remove a specific reference by index."""
        if index < 0 or index >= len(self._reference_embeddings):
            return False

        self._reference_embeddings.pop(index)
        thumb_url = self._reference_thumbnails.pop(index)

        # Delete thumbnail file
        full_path = thumb_url.lstrip("/")
        if os.path.exists(full_path):
            os.remove(full_path)

        logger.info(f"Reference #{index} removed. {self.reference_count} remaining.")
        return True

    def clear_reference(self):
        """Clear all stored reference embeddings."""
        for thumb_url in self._reference_thumbnails:
            full_path = thumb_url.lstrip("/")
            if os.path.exists(full_path):
                os.remove(full_path)

        self._reference_embeddings.clear()
        self._reference_thumbnails.clear()
        logger.info("All reference faces cleared")

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
