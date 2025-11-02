# YOLO Object Detection Explorer - Technical Overview

## Arquitectura del Sistema

### Diagrama de Arquitectura

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│                 │                     │                 │
│   Frontend      │◄────────────────────►│   Backend API   │
│   (React)       │                     │   (FastAPI)      │
│                 │                     │                 │
└─────────────────┘                     └─────────────────┘
         │                                       │
         │                                       │
         ▼                                       ▼
┌─────────────────┐                     ┌─────────────────┐
│                 │                     │                 │
│   Browser       │                     │   YOLO Models   │
│   (WebRTC)      │                     │   (Ultralytics) │
│                 │                     │                 │
└─────────────────┘                     └─────────────────┘
```

### Componentes Principales

#### Backend (Python/FastAPI)

**Estructura de Archivos:**
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Punto de entrada FastAPI
│   ├── config.py               # Configuración global
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # Definición de rutas API
│   │   └── websocket.py        # WebSocket para webcam
│   ├── models/
│   │   ├── __init__.py
│   │   ├── yolo_manager.py     # Gestión de modelos YOLO
│   │   └── model_cache.py      # Cache de modelos
│   ├── services/
│   │   ├── __init__.py
│   │   ├── detection_service.py # Lógica de detección
│   │   ├── image_processor.py   # Procesamiento de imágenes
│   │   └── video_processor.py   # Procesamiento de videos
│   └── utils/
│       ├── __init__.py
│       ├── logger.py           # Sistema de logging
│       └── file_validator.py   # Validación de archivos
├── requirements.txt
├── Dockerfile                 # Contenedor opcional
└── .env                      # Variables de entorno
```

**Dependencias Clave:**
- `fastapi==0.115.13` - Framework web ASGI
- `uvicorn==0.32.0` - Servidor ASGI
- `ultralytics==8.3.0` - Modelos YOLO
- `opencv-python==4.10.0` - Procesamiento de imágenes
- `pillow==11.0.0` - Manipulación de imágenes
- `python-multipart==0.0.12` - Upload de archivos
- `pydantic==2.9.0` - Validación de datos

#### Frontend (React/TypeScript)

**Estructura de Archivos:**
```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── ui/                 # Componentes base UI
│   │   ├── DetectionResult.tsx # Resultados de detección
│   │   ├── WebcamStream.tsx    # Stream de webcam
│   │   ├── FileUpload.tsx      # Upload de archivos
│   │   └── ModelSelector.tsx   # Selector de modelos
│   ├── hooks/
│   │   ├── useWebcam.ts        # Hook para webcam
│   │   ├── useDetection.ts     # Hook para detección
│   │   └── useFileUpload.ts    # Hook para uploads
│   ├── services/
│   │   └── api.ts              # Cliente API
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   ├── utils/
│   │   └── helpers.ts          # Utilidades
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

**Dependencias Clave:**
- `react==18.3.1` - Biblioteca UI
- `react-dom==18.3.1` - Renderizado DOM
- `@types/react==18.3.12` - Tipos TypeScript
- `typescript==5.6.3` - Lenguaje TypeScript
- `tailwindcss==3.4.14` - Framework CSS
- `lucide-react==0.451.0` - Iconos
- `axios==1.7.7` - Cliente HTTP

## API Endpoints

### REST API

#### GET `/api/models`
Lista modelos YOLO disponibles.

**Respuesta:**
```json
{
  "models": [
    {
      "id": "yolov8n",
      "name": "YOLOv8 Nano",
      "size": "3.2MB",
      "description": "Fastest, least accurate"
    }
  ]
}
```

#### POST `/api/detect/image`
Procesa una imagen para detección de objetos.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (imagen), `model` (string)

**Respuesta:**
```json
{
  "success": true,
  "detections": [
    {
      "class": "person",
      "confidence": 0.85,
      "bbox": [100, 200, 150, 300]
    }
  ],
  "processing_time": 0.234,
  "image_url": "/api/images/result_123.jpg"
}
```

#### POST `/api/detect/video`
Procesa un video para detección de objetos.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (video), `model` (string)

**Respuesta:**
```json
{
  "success": true,
  "video_url": "/api/videos/result_123.mp4",
  "total_frames": 1200,
  "processing_time": 45.67
}
```

### WebSocket API

#### `/ws/detect`
Stream de detección en tiempo real para webcam.

**Mensajes del Cliente:**
```json
{
  "type": "start",
  "model": "yolov8n",
  "width": 640,
  "height": 480
}
```

**Mensajes del Servidor:**
```json
{
  "type": "detection",
  "detections": [...],
  "processing_time": 0.045,
  "image_data": "base64_encoded_image"
}
```

## Modelos YOLO Soportados

| Modelo | Tamaño | Precisión | Velocidad | Uso Recomendado |
|--------|--------|-----------|-----------|------------------|
| YOLOv8n | 3.2MB | 0.53 mAP | ~80 FPS | Edge devices, mobile |
| YOLOv8s | 11.2MB | 0.63 mAP | ~50 FPS | Balance general |
| YOLOv8m | 25.9MB | 0.71 mAP | ~25 FPS | Precisión alta |
| YOLOv8l | 43.7MB | 0.74 mAP | ~15 FPS | Máxima precisión |

## Flujo de Datos

### Detección de Imágenes
1. Usuario selecciona imagen → Frontend
2. Frontend envía imagen a `/api/detect/image` → Backend
3. Backend carga modelo YOLO si no está en cache
4. Backend procesa imagen con modelo
5. Backend guarda imagen resultante con bounding boxes
6. Backend retorna URL de imagen procesada → Frontend
7. Frontend muestra imagen con detecciones

### Detección en Video
1. Usuario selecciona video → Frontend
2. Frontend envía video a `/api/detect/video` → Backend
3. Backend procesa video frame por frame
4. Backend genera video con anotaciones
5. Backend retorna URL del video procesado → Frontend
6. Frontend reproduce video procesado

### Webcam en Tiempo Real
1. Usuario activa webcam → Frontend solicita permisos
2. Frontend establece conexión WebSocket `/ws/detect`
3. Frontend captura frames de webcam
4. Frontend envía frames vía WebSocket → Backend
5. Backend procesa frame con modelo YOLO
6. Backend retorna detecciones vía WebSocket → Frontend
7. Frontend renderiza detecciones en canvas superpuesto

## Configuración de Rendimiento

### Optimizaciones Backend
- **Cache de Modelos**: Modelos se mantienen en memoria después de primera carga
- **Procesamiento Asíncrono**: Endpoints usan async/await para no-blocking I/O
- **Compresión de Imágenes**: Resultados se comprimen para transmisión web
- **Validación de Archivos**: Tamaño y tipo de archivo validados antes de procesamiento

### Optimizaciones Frontend
- **Lazy Loading**: Componentes se cargan bajo demanda
- **Canvas Rendering**: Detecciones renderizadas eficientemente con Canvas API
- **WebRTC**: Captura de webcam optimizada con MediaStream API
- **Responsive Design**: UI adaptativa para diferentes tamaños de pantalla

## Seguridad

### Validaciones
- **Tamaño de Archivo**: Límite de 50MB para uploads
- **Tipos MIME**: Solo imágenes (jpg, png, jpeg) y videos (mp4, avi, mov)
- **Rate Limiting**: Protección contra abuso de API
- **Sanitización**: Nombres de archivo sanitizados

### Privacidad
- **Procesamiento Local**: Todo el procesamiento ocurre en la máquina local
- **Sin Almacenamiento Externo**: Archivos no se envían a servidores externos
- **Webcam Control**: Usuario controla cuándo activar/desactivar la cámara

## Monitoreo y Logs

### Sistema de Logs
- **Niveles**: DEBUG, INFO, WARNING, ERROR
- **Rotación**: Logs rotan diariamente, mantienen 30 días
- **Ubicación**: `logs/app.log`, `logs/error.log`
- **Formato**: Timestamp, nivel, módulo, mensaje

### Métricas
- **Tiempos de Procesamiento**: Por modelo y tipo de entrada
- **Uso de Memoria**: Monitoreo de carga de modelos
- **Tasa de Error**: Seguimiento de fallos de procesamiento
- **Uso de API**: Conteo de requests por endpoint

## Desarrollo y Despliegue

### Entorno de Desarrollo
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Despliegue en Producción
```bash
# Backend
docker build -t yolo-backend ./backend
docker run -p 8000:8000 yolo-backend

# Frontend
npm run build
npm run preview  # o servir con nginx
```

### Variables de Entorno
```env
# Backend
HOST=0.0.0.0
PORT=8000
MODEL_CACHE_DIR=./models
MAX_FILE_SIZE=52428800  # 50MB
LOG_LEVEL=INFO

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```
