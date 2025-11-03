# Changelog

All notable changes to the YOLO Object Detection Explorer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2025-11-02

### ✨ Added - Advanced Detection Configuration

#### New Feature: Advanced Model Configuration (Feature 3.2)
**High Priority | Medium Complexity | ✅ COMPLETED**

Implemented comprehensive configuration system allowing users to adjust YOLO detection parameters in real-time for optimized precision and performance.

##### Frontend Changes
- **New Component:** `AdvancedConfig.tsx`
  - Expandable/collapsible panel for clean UI
  - Visual controls for 4 key parameters:
    - Confidence Threshold (0.05 - 0.95)
    - IOU Threshold for NMS (0.20 - 0.70)
    - Max Detections (50 - 1000)
    - Image Size (320/640/1280px)

- **Preset System:**
  - 4 predefined presets:
    - Balanced (default) - Good balance between speed and accuracy
    - High Precision - Maximum accuracy, fewer false positives
    - Fast - Optimized for real-time applications
    - High Recall - Detect as many objects as possible
  - Custom preset saving/loading
  - LocalStorage persistence

- **Type System Updates:** `types/index.ts`
  - New interface: `DetectionConfig`
  - New interface: `DetectionPreset`

- **Hook Updates:** `useDetection.ts`
  - Support for optional `DetectionConfig` parameter
  - Propagation of config to detection functions

- **API Service Updates:** `services/api.ts`
  - FormData now includes config parameters
  - Support for optional configuration in image/video detection

- **App Integration:** `App.tsx`
  - Global detection configuration state
  - Config propagation to all detection functions
  - Integrated AdvancedConfig component in UI

##### Backend Changes
- **API Routes:** `api/routes.py`
  - `/detect/image` endpoint accepts optional parameters:
    - `confidence`: float - Confidence threshold
    - `iou`: float - IOU threshold for NMS
    - `max_det`: int - Maximum detections
    - `imgsz`: int - Input image size
  - `/detect/video` endpoint accepts same optional parameters
  - Improved logging with configuration details

- **Detection Service:** `services/detection_service.py`
  - `process_image()` accepts optional `detection_config` dict
  - `process_video()` accepts optional `detection_config` dict
  - Dynamic parameter application to YOLO models
  - Fallback to default config when no custom config provided

##### Documentation
- **New:** `docs/advanced-config-feature.md` - Complete implementation documentation
- **Updated:** `docs/feature-ideas.md` - Marked feature 3.2 as completed
- **New:** `docs/README.md` - Documentation directory index
- **New:** `CHANGELOG.md` - This file

##### Testing
- ✅ Functional testing of all parameter controls
- ✅ Preset loading and saving
- ✅ Frontend-backend integration
- ✅ TypeScript compilation (0 errors)
- ✅ Parameter serialization in FormData
- ✅ YOLO parameter application

##### Performance Impact
- Image Size 320px: ~2x faster than 640px
- Image Size 1280px: ~50% slower but more accurate
- Max detections limit has minimal performance impact
- LocalStorage handles multiple presets efficiently

---

## [1.0.0] - 2025-11-02

### 🎉 Initial Release

#### Core Features
- **Webcam Detection:** Real-time object detection from webcam
- **File Upload:** Process images and videos
- **Multiple Models:** Support for YOLOv8 Nano, Small, Medium, Large
- **Visual Results:** Display detections with bounding boxes and labels
- **Performance Metrics:** Show processing time and detection statistics

#### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for fast development
- Lucide React for icons
- Axios for API communication

#### Backend
- FastAPI framework
- Ultralytics YOLO integration
- OpenCV for video processing
- Pillow for image manipulation
- Structured logging system

#### Infrastructure
- Automated setup scripts (Windows & Linux/Mac)
- Docker support (planned)
- Environment configuration
- Static file serving
- CORS enabled for local development

---

## Legend

- ✨ **Added** - New features
- 🔄 **Changed** - Changes in existing functionality
- 🗑️ **Deprecated** - Soon-to-be removed features
- ❌ **Removed** - Removed features
- 🐛 **Fixed** - Bug fixes
- 🔒 **Security** - Vulnerability fixes
- 📚 **Documentation** - Documentation changes
- 🎨 **UI/UX** - User interface improvements
- ⚡ **Performance** - Performance improvements

---

## Upcoming in Next Release

### Planned for v1.2.0
- 🔜 **Editor Visual de Resultados** (Feature 1.1)
- 🔜 **Dashboard Comparativo de Modelos** (Feature 1.2)
- 🔜 **Procesamiento en Batch** (Feature 6.1)
- 🔜 **Exportación en Múltiples Formatos** (Feature 6.2)

See [docs/feature-ideas.md](./docs/feature-ideas.md) for complete roadmap.

---

**Project:** YOLO Object Detection Explorer
**Developer:** Centurion Carlos
**Repository:** [GitHub Link]
