"""YOLO model management and caching."""

import os
import asyncio
from typing import Dict, Optional, Any
from ultralytics import YOLO
import torch

from app.config import settings
from app.utils.logger import app_logger as logger


class YOLOModelManager:
    """Manages YOLO model loading, caching, and inference."""

    def __init__(self):
        """Initialize the model manager."""
        self.loaded_models: Dict[str, YOLO] = {}
        self.model_locks: Dict[str, asyncio.Lock] = {}
        self._ensure_model_directory()

    def _ensure_model_directory(self):
        """Ensure the model cache directory exists."""
        os.makedirs(settings.model_cache_dir, exist_ok=True)
        logger.info(f"Model cache directory: {settings.model_cache_dir}")

    async def get_model(self, model_id: str) -> YOLO:
        """Get or load a YOLO model by ID."""
        if model_id not in settings.available_models:
            raise ValueError(f"Unknown model: {model_id}")

        # Check if model is already loaded
        if model_id in self.loaded_models:
            return self.loaded_models[model_id]

        # Use lock to prevent concurrent loading of the same model
        if model_id not in self.model_locks:
            self.model_locks[model_id] = asyncio.Lock()

        async with self.model_locks[model_id]:
            # Double-check after acquiring lock
            if model_id in self.loaded_models:
                return self.loaded_models[model_id]

            # Load the model
            await self._load_model(model_id)

            return self.loaded_models[model_id]

    async def _load_model(self, model_id: str):
        """Load a YOLO model from disk or download it."""
        try:
            model_info = settings.available_models[model_id]
            model_filename = model_info["filename"]
            model_path = os.path.join(settings.model_cache_dir, model_filename)

            logger.info(f"Loading YOLO model: {model_id} ({model_info['name']})")

            # Check if model file exists locally
            if not os.path.exists(model_path):
                logger.info(f"Model not found locally, downloading: {model_filename}")
                # Download model (this happens synchronously in ultralytics)
                model = YOLO(model_filename)
                # Save to cache directory
                model.save(model_path)
            else:
                logger.info(f"Loading model from cache: {model_path}")
                model = YOLO(model_path)

            # Store in memory cache
            self.loaded_models[model_id] = model

            # Log model info
            self._log_model_info(model_id, model)

        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise

    def _log_model_info(self, model_id: str, model: YOLO):
        """Log information about the loaded model."""
        try:
            model_info = settings.available_models[model_id]

            # Get model parameters count
            total_params = sum(p.numel() for p in model.model.parameters())

            logger.info(f"Model {model_id} loaded successfully")
            logger.info(f"  Name: {model_info['name']}")
            logger.info(f"  Size: {model_info['size']}")
            logger.info(f"  Parameters: {total_params:,}")

            # Check if CUDA is available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"  Device: {device}")

        except Exception as e:
            logger.warning(f"Could not log model info for {model_id}: {e}")

    async def unload_model(self, model_id: str):
        """Unload a model from memory."""
        if model_id in self.loaded_models:
            logger.info(f"Unloading model: {model_id}")
            del self.loaded_models[model_id]

            # Clean up lock if no longer needed
            if model_id in self.model_locks:
                del self.model_locks[model_id]

    def get_loaded_models_info(self) -> Dict[str, Any]:
        """Get information about currently loaded models."""
        info = {}
        for model_id, model in self.loaded_models.items():
            model_info = settings.available_models.get(model_id, {})
            info[model_id] = {
                "name": model_info.get("name", model_id),
                "filename": model_info.get("filename", ""),
                "loaded": True
            }
        return info

    def clear_cache(self):
        """Clear all loaded models from memory."""
        logger.info(f"Clearing model cache: {len(self.loaded_models)} models")
        self.loaded_models.clear()
        self.model_locks.clear()
