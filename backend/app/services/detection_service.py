"""Object detection service using YOLO models."""

import os
import uuid
import time
from typing import Dict, Any, List
from PIL import Image
import cv2
import numpy as np
from fastapi import UploadFile

from app.config import settings
from app.models.yolo_manager import YOLOModelManager
from app.models.schemas import (
    GalleryItemCreate, DetectionConfigSchema, DetectionSchema,
    CreateGalleryItemRequest
)
from app.services.gallery_service import GalleryService
from app.utils.logger import app_logger as logger
from app.utils.file_validator import validate_image_dimensions
from sqlalchemy.ext.asyncio import AsyncSession


class DetectionService:
    """Service for performing object detection on images and videos."""

    def __init__(self, model_manager: YOLOModelManager):
        """Initialize the detection service."""
        self.model_manager = model_manager
        self.gallery_service = GalleryService()
        self._ensure_static_directory()

    def _ensure_static_directory(self):
        """Ensure the static directory exists for storing results."""
        os.makedirs("static", exist_ok=True)

    async def process_image(
        self,
        file: UploadFile,
        model_id: str,
        detection_config: Dict[str, Any] = None,
        gallery_request: CreateGalleryItemRequest = None,
        db_session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Process an image for object detection."""

        start_time = time.time()

        try:
            # Read image
            image_data = await file.read()
            image = Image.open(file.file)

            # Validate dimensions
            validate_image_dimensions(image.width, image.height)

            # Convert to numpy array
            image_np = np.array(image)

            # Get model
            model = await self.model_manager.get_model(model_id)

            # Prepare detection parameters
            detect_params = {
                'conf': settings.detection_confidence_threshold
            }

            # Override with custom config if provided
            if detection_config:
                detect_params.update(detection_config)

            # Perform detection
            results = model(image_np, **detect_params)

            # Process results
            detections = self._process_detection_results(results)

            # Save result image with bounding boxes
            result_filename = f"result_{uuid.uuid4().hex}.jpg"
            result_path = os.path.join("static", result_filename)

            # Draw bounding boxes on image
            annotated_image = self._draw_detections(image_np.copy(), detections)
            Image.fromarray(annotated_image).save(result_path)

            processing_time = time.time() - start_time

            result = {
                "success": True,
                "detections": detections,
                "image_url": f"/static/{result_filename}",
                "original_filename": file.filename,
                "model_used": model_id,
                "image_size": f"{image.width}x{image.height}",
                "processing_time": processing_time
            }

            # Save to gallery if requested
            if gallery_request and gallery_request.save_to_gallery and db_session:
                try:
                    # Create detection config schema
                    config_schema = DetectionConfigSchema(
                        confidence=detection_config.get('conf', settings.detection_confidence_threshold) if detection_config else settings.detection_confidence_threshold,
                        iou=detection_config.get('iou', settings.detection_iou_threshold) if detection_config else settings.detection_iou_threshold,
                        max_detections=detection_config.get('max_det', settings.detection_max_detections) if detection_config else settings.detection_max_detections,
                        image_size=detection_config.get('imgsz', settings.detection_image_size) if detection_config else settings.detection_image_size
                    )

                    # Convert detections to schema
                    detection_schemas = [
                        DetectionSchema(
                            class_name=d["class"],
                            confidence=d["confidence"],
                            bbox=d["bbox"]
                        ) for d in detections
                    ]

                    # Create gallery item
                    gallery_item = GalleryItemCreate(
                        project_id=gallery_request.project_id,
                        title=gallery_request.title or f"Detection - {file.filename}",
                        description=gallery_request.description,
                        file_type="image",
                        original_filename=file.filename,
                        processed_filename=result_filename,
                        model_used=model_id,
                        detection_config=config_schema,
                        detections=detection_schemas,
                        processing_time=processing_time,
                        file_size=len(image_data),
                        tags=gallery_request.tags
                    )

                    gallery_result = await self.gallery_service.create_gallery_item(db_session, gallery_item)
                    result["gallery_item_id"] = gallery_result.id
                    result["saved_to_gallery"] = True

                    logger.info(f"Image saved to gallery: {gallery_result.id}")

                except Exception as e:
                    logger.error(f"Failed to save image to gallery: {e}")
                    # Don't fail the detection if gallery save fails
                    result["saved_to_gallery"] = False
                    result["gallery_error"] = str(e)
            else:
                result["saved_to_gallery"] = False

            return result

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise

    async def process_video(
        self,
        file: UploadFile,
        model_id: str,
        detection_config: Dict[str, Any] = None,
        gallery_request: CreateGalleryItemRequest = None,
        db_session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Process a video for object detection."""

        start_time = time.time()

        try:
            # Save uploaded video temporarily
            temp_video_path = f"temp_{uuid.uuid4().hex}_{file.filename}"
            with open(temp_video_path, "wb") as temp_file:
                content = await file.read()
                temp_file.write(content)

            # Get model
            model = await self.model_manager.get_model(model_id)

            # Process video
            result_filename, total_frames, video_detections = self._process_video_file(
                temp_video_path, model, model_id, detection_config
            )

            # Clean up temp file
            os.remove(temp_video_path)

            processing_time = time.time() - start_time

            result = {
                "success": True,
                "video_url": f"/static/{result_filename}",
                "original_filename": file.filename,
                "model_used": model_id,
                "total_frames": total_frames,
                "processing_fps": total_frames / processing_time if processing_time > 0 else 0,
                "processing_time": processing_time
            }

            # Save to gallery if requested
            if gallery_request and gallery_request.save_to_gallery and db_session:
                try:
                    # Create detection config schema
                    config_schema = DetectionConfigSchema(
                        confidence=detection_config.get('conf', settings.detection_confidence_threshold) if detection_config else settings.detection_confidence_threshold,
                        iou=detection_config.get('iou', settings.detection_iou_threshold) if detection_config else settings.detection_iou_threshold,
                        max_detections=detection_config.get('max_det', settings.detection_max_detections) if detection_config else settings.detection_max_detections,
                        image_size=detection_config.get('imgsz', settings.detection_image_size) if detection_config else settings.detection_image_size
                    )

                    # Convert video detections to schema (take sample or aggregate)
                    detection_schemas = []
                    if video_detections:
                        # Take top detections from video processing
                        for d in video_detections[:50]:  # Limit to 50 detections for storage
                            detection_schemas.append(DetectionSchema(
                                class_name=d["class"],
                                confidence=d["confidence"],
                                bbox=d["bbox"]
                            ))

                    # Create gallery item
                    gallery_item = GalleryItemCreate(
                        project_id=gallery_request.project_id,
                        title=gallery_request.title or f"Video Detection - {file.filename}",
                        description=gallery_request.description,
                        file_type="video",
                        original_filename=file.filename,
                        processed_filename=result_filename,
                        model_used=model_id,
                        detection_config=config_schema,
                        detections=detection_schemas,
                        processing_time=processing_time,
                        file_size=len(content),
                        tags=gallery_request.tags
                    )

                    gallery_result = await self.gallery_service.create_gallery_item(db_session, gallery_item)
                    result["gallery_item_id"] = gallery_result.id
                    result["saved_to_gallery"] = True

                    logger.info(f"Video saved to gallery: {gallery_result.id}")

                except Exception as e:
                    logger.error(f"Failed to save video to gallery: {e}")
                    # Don't fail the detection if gallery save fails
                    result["saved_to_gallery"] = False
                    result["gallery_error"] = str(e)
            else:
                result["saved_to_gallery"] = False

            return result

        except Exception as e:
            logger.error(f"Video processing failed: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            raise

    def _process_video_file(self, video_path: str, model, model_id: str, detection_config: Dict[str, Any] = None) -> tuple[str, int, List[Dict[str, Any]]]:
        """Process video file and create annotated output."""

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError("Could not open video file")

        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Create output video
        result_filename = f"result_{uuid.uuid4().hex}.mp4"
        result_path = os.path.join("static", result_filename)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(result_path, fourcc, fps, (width, height))

        if not out.isOpened():
            raise ValueError("Could not create output video file")

        # Prepare detection parameters
        detect_params = {
            'conf': settings.detection_confidence_threshold
        }

        # Override with custom config if provided
        if detection_config:
            detect_params.update(detection_config)

        frame_count = 0
        processed_frames = 0
        all_detections = []

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                # Perform detection every 3 frames for performance
                if frame_count % 3 == 0:
                    results = model(frame, **detect_params)
                    detections = self._process_detection_results(results)
                    annotated_frame = self._draw_detections(frame.copy(), detections)
                    processed_frames += 1

                    # Collect detections for gallery (limit to prevent memory issues)
                    if len(all_detections) < 1000:  # Limit total detections collected
                        all_detections.extend(detections)
                else:
                    annotated_frame = frame

                out.write(annotated_frame)
                frame_count += 1

                if frame_count >= total_frames:
                    break

            # Ensure all frames are written
            out.release()
            cap.release()

            # Verify the file was created and has content
            if not os.path.exists(result_path) or os.path.getsize(result_path) == 0:
                raise ValueError("Failed to create output video file")

            logger.info(f"Processed video: {total_frames} frames, {processed_frames} with detection, {len(all_detections)} detections collected, output: {result_filename}")

            return result_filename, total_frames, all_detections

        except Exception as e:
            # Clean up resources
            cap.release()
            out.release()
            # Remove incomplete file
            if os.path.exists(result_path):
                os.remove(result_path)
            raise e

    async def process_image_with_tracking(
        self,
        file: UploadFile,
        model_id: str,
        detection_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process an image frame with object tracking (ByteTrack).

        Uses model.track(persist=True) to maintain tracker state across calls,
        returning persistent track IDs for each detected object.
        Optimized for real-time: no annotated image saved to disk.
        """

        start_time = time.time()

        try:
            # Read image
            await file.read()
            image = Image.open(file.file)
            image_np = np.array(image)

            # Get model
            model = await self.model_manager.get_model(model_id)

            # Prepare detection parameters
            detect_params = {
                'conf': settings.detection_confidence_threshold
            }
            if detection_config:
                detect_params.update(detection_config)

            # Perform tracking (ByteTrack by default)
            results = model.track(image_np, persist=True, tracker="bytetrack.yaml", **detect_params)

            # Process results with track IDs
            detections = self._process_tracking_results(results)

            processing_time = time.time() - start_time

            return {
                "success": True,
                "detections": detections,
                "model_used": model_id,
                "processing_time": processing_time
            }

        except Exception as e:
            logger.error(f"Tracking processing failed: {e}")
            raise

    async def reset_tracker(self, model_id: str):
        """Reset the ByteTrack tracker state for a model."""
        try:
            model = await self.model_manager.get_model(model_id)
            if hasattr(model, 'predictor') and model.predictor is not None:
                if hasattr(model.predictor, 'trackers'):
                    model.predictor.trackers = []
                    logger.info(f"Tracker reset for model {model_id}")
        except Exception as e:
            logger.error(f"Failed to reset tracker for {model_id}: {e}")
            raise

    def _process_tracking_results(self, results) -> List[Dict[str, Any]]:
        """Process YOLO tracking results into a standardized format with track IDs."""

        detections = []

        for result in results:
            boxes = result.boxes

            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = result.names[class_id] if hasattr(result, 'names') else f"class_{class_id}"

                    # Extract track ID (None if tracker hasn't assigned one yet)
                    track_id = None
                    if box.id is not None:
                        track_id = int(box.id[0].cpu().numpy())

                    detections.append({
                        "class": class_name,
                        "confidence": confidence,
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "track_id": track_id
                    })

        detections.sort(key=lambda x: x["confidence"], reverse=True)

        return detections

    def _process_detection_results(self, results) -> List[Dict[str, Any]]:
        """Process YOLO detection results into a standardized format."""

        detections = []

        for result in results:
            boxes = result.boxes

            if boxes is not None:
                for box in boxes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                    # Get confidence and class
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())

                    # Get class name
                    class_name = result.names[class_id] if hasattr(result, 'names') else f"class_{class_id}"

                    detections.append({
                        "class": class_name,
                        "confidence": confidence,
                        "bbox": [float(x1), float(y1), float(x2), float(y2)]
                    })

        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x["confidence"], reverse=True)

        return detections

    def _draw_detections(self, image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """Draw bounding boxes and labels on image."""

        for detection in detections:
            bbox = detection["bbox"]
            confidence = detection["confidence"]
            class_name = detection["class"]

            # Extract coordinates
            x1, y1, x2, y2 = map(int, bbox)

            # Choose color based on class (simple approach)
            color = (0, 255, 0)  # Green for all detections

            # Draw bounding box
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

            # Draw label
            label = ".2f"
            cv2.putText(image, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        return image
