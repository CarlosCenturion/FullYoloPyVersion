# YOLO Object Detection Explorer - AI Developer Guide

## Filosofía de Desarrollo

### Reglas Absolutas
- **Archivos < 500 líneas**: Nunca crear archivos con más de 500 líneas de código
- **Separación por Concerns**: Cada archivo debe tener una responsabilidad única
- **Backup First**: Antes de modificar, respaldar archivos en `/archive/`
- **Lean Toward Caution**: Operar como cirujano, no como wrecking ball
- **Verify Success**: Después de cambios, verificar que todo funciona

### Checklist Obligatorio
Antes de cualquier implementación:
1. ✅ Revisar reglas aplicables en `.cursor/rules/`
2. ✅ Crear Work Breakdown Structure (WBS) para la tarea
3. ✅ Verificar APIs actualizadas en documentación
4. ✅ Crear checklist detallado antes de comenzar

## Arquitectura del Proyecto

### Estructura de Carpetas
```
yolo-explorer/
├── backend/                 # Python FastAPI API
│   ├── app/
│   │   ├── api/            # Endpoints REST/WebSocket
│   │   ├── models/         # Gestión modelos YOLO
│   │   ├── services/       # Lógica de negocio
│   │   └── utils/          # Utilidades compartidas
│   ├── requirements.txt
│   └── main.py
├── frontend/               # React TypeScript SPA
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── hooks/         # Hooks personalizados
│   │   ├── services/      # API clients
│   │   └── utils/         # Utilidades frontend
│   └── package.json
├── models/                 # Cache modelos YOLO
├── docs/                   # Documentación
├── logs/                   # Logs aplicación
└── archive/                # Backups (NO BORRAR)
```

### Patrones de Diseño

#### Backend Patterns
- **Dependency Injection**: FastAPI maneja inyección de dependencias
- **Repository Pattern**: Servicios separados de lógica de negocio
- **Factory Pattern**: Creación de instancias de modelos YOLO
- **Strategy Pattern**: Diferentes estrategias de procesamiento

#### Frontend Patterns
- **Custom Hooks**: Lógica reutilizable en hooks
- **Compound Components**: Componentes compuestos para UI compleja
- **Render Props**: Para compartir lógica entre componentes
- **Container/Presentational**: Separación de lógica y presentación

## Work Breakdown Structure (WBS)

### Fase 1: Setup y Arquitectura
1.1 ✅ Documentación del proyecto (README.md, index.md, ai.md)
1.2 🔄 Diseño arquitectura backend/frontend
1.3 ⏳ Setup backend Python/FastAPI
1.4 ⏳ Setup frontend React/TypeScript

### Fase 2: Backend Core
2.1 ⏳ Gestión modelos YOLO (carga, cache, descarga)
2.2 ⏳ API endpoints REST para imágenes/videos
2.3 ⏳ WebSocket para webcam streaming
2.4 ⏳ Servicios de procesamiento de detección

### Fase 3: Frontend Core
3.1 ⏳ Componentes UI base (layout, navegación)
3.2 ⏳ Webcam integration con WebRTC
3.3 ⏳ File upload interface
3.4 ⏳ Model selector component

### Fase 4: Features Avanzadas
4.1 ⏳ Real-time detection display
4.2 ⏳ Results visualization (bounding boxes)
4.3 ⏳ Performance metrics
4.4 ⏳ Error handling y loading states

### Fase 5: Polish y Testing
5.1 ⏳ UI/UX polish (animaciones, responsive)
5.2 ⏳ Testing end-to-end
5.3 ⏳ Performance optimization
5.4 ⏳ Documentation final

## Reglas de Implementación

### Backend Rules
1. **FastAPI Best Practices**:
   - Usar Pydantic para validación de datos
   - Implementar manejo de errores con HTTPException
   - Usar async/await para operaciones I/O
   - Documentar endpoints con docstrings

2. **YOLO Integration**:
   - Cache models en memoria para performance
   - Descargar models automáticamente si no existen
   - Manejar diferentes versiones (nano, small, medium, large)
   - Optimizar procesamiento para diferentes tamaños de input

3. **File Handling**:
   - Validar tipos MIME y tamaños de archivo
   - Procesar uploads en memoria para performance
   - Limpiar archivos temporales automáticamente
   - Implementar timeouts para operaciones largas

### Frontend Rules
1. **React Best Practices**:
   - Usar hooks personalizados para lógica reutilizable
   - Implementar error boundaries para manejo de errores
   - Optimizar re-renders con React.memo
   - Usar TypeScript estrictamente

2. **UI/UX Guidelines**:
   - Diseño moderno y minimalista
   - Fully responsive (mobile-first)
   - Loading states y feedback visual
   - Accesibilidad (ARIA labels, keyboard navigation)

3. **Performance**:
   - Lazy loading de componentes
   - Code splitting con Vite
   - Optimización de imágenes
   - Efficient WebRTC handling

## Librerías Autorizadas

### Backend (Python)
- ✅ `fastapi` - Framework web
- ✅ `uvicorn` - Servidor ASGI
- ✅ `ultralytics` - Modelos YOLO
- ✅ `opencv-python` - Procesamiento imágenes
- ✅ `pillow` - Manipulación imágenes
- ✅ `pydantic` - Validación datos
- ✅ `python-multipart` - Upload archivos

### Frontend (JavaScript/TypeScript)
- ✅ `react` - UI library
- ✅ `react-dom` - DOM rendering
- ✅ `@types/react` - TypeScript types
- ✅ `typescript` - TypeScript compiler
- ✅ `tailwindcss` - CSS framework
- ✅ `lucide-react` - Icons
- ✅ `axios` - HTTP client
- ❌ No instalar otras librerías sin aprobación

## Flujo de Trabajo Obligatorio

### Antes de Cambios
1. 📖 Leer documentación relevante
2. 🔍 Buscar código existente con herramientas
3. 📋 Crear checklist detallado
4. 💾 Backup archivos a modificar en `/archive/`
5. 🧪 Verificar estado actual funciona

### Durante Implementación
1. 🎯 Una tarea a la vez (no multitasking)
2. 📝 Actualizar TODOs en tiempo real
3. 🐛 Verificar linting después de cambios
4. 📊 Probar funcionalidad después de cada cambio
5. 📝 Documentar decisiones importantes

### Después de Cambios
1. ✅ Verificar TODO completado
2. 🧪 Test end-to-end
3. 📖 Actualizar documentación si necesario
4. 🗂️ Limpiar archivos temporales
5. 📋 Marcar siguiente tarea como in_progress

## Manejo de Errores

### Estrategia de Backup
```python
# EJEMPLO: Antes de modificar archivo
import shutil
import os
from datetime import datetime

def backup_file(file_path: str) -> str:
    """Backup file before modification."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"archive/{os.path.basename(file_path)}.{timestamp}.backup"

    os.makedirs("archive", exist_ok=True)
    shutil.copy2(file_path, backup_path)

    return backup_path
```

### Logging Strategy
```python
# Backend logging configuration
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Configure comprehensive logging."""
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

    # File handler with rotation
    handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=30
    )

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger
```

### Error Handling Patterns
```python
# FastAPI error handling
from fastapi import HTTPException, status

async def process_image(file, model: str):
    try:
        # Validate inputs
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )

        # Process with error handling
        result = await detection_service.process_image(file, model)
        return result

    except Exception as e:
        logger.error(f"Image processing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Processing failed"
        )
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: pytest para funciones individuales
- **Integration Tests**: TestClient de FastAPI para endpoints
- **Performance Tests**: Benchmarking de modelos YOLO
- **Error Cases**: Test de validación y manejo de errores

### Frontend Testing
- **Component Tests**: React Testing Library
- **Integration Tests**: Cypress para flujos completos
- **Performance Tests**: Lighthouse CI
- **Accessibility Tests**: axe-core

## Performance Benchmarks

### Targets
- **Image Processing**: < 500ms para imágenes 640x480
- **Video Processing**: < 30fps para videos 1080p
- **Webcam Streaming**: < 100ms latency end-to-end
- **Model Loading**: < 5s para primera carga
- **Memory Usage**: < 2GB RAM total

### Monitoring
- Processing times logged por operación
- Memory usage tracked por modelo
- Error rates monitored
- API response times measured

## Deployment Checklist

### Pre-deployment
- [ ] All TODOs completed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Dependencies locked (requirements.txt, package-lock.json)
- [ ] Environment variables documented
- [ ] Logs directory created
- [ ] Archive directory ready

### Production Setup
- [ ] Docker containers optimized
- [ ] Environment variables set
- [ ] Models directory writable
- [ ] Logs rotation configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

## Troubleshooting Guide

### Common Issues
1. **Model Loading Fails**: Check disk space, internet connection
2. **Webcam Not Working**: Verify browser permissions, WebRTC support
3. **Memory Issues**: Monitor model cache, implement LRU eviction
4. **Slow Performance**: Profile code, optimize image processing
5. **Upload Errors**: Check file size limits, validate file types

### Debug Commands
```bash
# Backend debug
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
python -c "from ultralytics import YOLO; print('YOLO version:', YOLO.__version__)"

# Frontend debug
npm run build -- --mode development
npx vite --debug
```

## Contact & Support

- **Logs Location**: `logs/` directory
- **Error Logs**: `logs/error.log`
- **Backup Location**: `archive/` directory
- **Documentation**: `docs/` directory

Remember: **Do no harm**. Always backup before changes. One problem at a time. Verify success before moving on.
