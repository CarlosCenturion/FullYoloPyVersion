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
from app.utils.logger import app_logger as logger
from app.utils.file_validator import validate_image_dimensions


class DetectionService:
    """Service for performing object detection on images and videos."""

    def __init__(self, model_manager: YOLOModelManager):
        """Initialize the detection service."""
        self.model_manager = model_manager
        self._ensure_static_directory()

    def _ensure_static_directory(self):
        """Ensure the static directory exists for storing results."""
        os.makedirs("static", exist_ok=True)

    async def process_image(self, file: UploadFile, model_id: str, detection_config: Dict[str, Any] = None) -> Dict[str, Any]:
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

            return {
                "success": True,
                "detections": detections,
                "image_url": f"/static/{result_filename}",
                "original_filename": file.filename,
                "model_used": model_id,
                "image_size": f"{image.width}x{image.height}"
            }

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise

    async def process_video(self, file: UploadFile, model_id: str, detection_config: Dict[str, Any] = None) -> Dict[str, Any]:
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
            result_filename, total_frames = self._process_video_file(
                temp_video_path, model, model_id, detection_config
            )

            # Clean up temp file
            os.remove(temp_video_path)

            processing_time = time.time() - start_time

            return {
                "success": True,
                "video_url": f"/static/{result_filename}",
                "original_filename": file.filename,
                "model_used": model_id,
                "total_frames": total_frames,
                "processing_fps": total_frames / processing_time if processing_time > 0 else 0
            }

        except Exception as e:
            logger.error(f"Video processing failed: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
            raise

    def _process_video_file(self, video_path: str, model, model_id: str, detection_config: Dict[str, Any] = None) -> tuple[str, int]:
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

            logger.info(f"Processed video: {total_frames} frames, {processed_frames} with detection, output: {result_filename}")

            return result_filename, total_frames

        except Exception as e:
            # Clean up resources
            cap.release()
            out.release()
            # Remove incomplete file
            if os.path.exists(result_path):
                os.remove(result_path)
            raise e

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
