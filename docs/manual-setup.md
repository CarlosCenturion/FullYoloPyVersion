# Guía de Configuración Manual - YOLO Object Detection Explorer

Esta guía proporciona los pasos detallados para configurar e iniciar manualmente el proyecto YOLO Object Detection Explorer sin utilizar los scripts automáticos.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalados los siguientes requisitos:

### Software Requerido
- **Python 3.11 o superior**
  - Verifica con: `python --version` o `python3 --version`
  - Descarga desde: https://python.org

- **Node.js 18 o superior**
  - Verifica con: `node --version`
  - Descarga desde: https://nodejs.org

- **Git** (opcional, para clonar el repositorio)
  - Verifica con: `git --version`

### Hardware Recomendado
- **CPU**: Intel i5 o superior / AMD Ryzen 5 o superior
- **RAM**: Mínimo 8GB, recomendado 16GB
- **GPU**: NVIDIA con CUDA (opcional, acelera el procesamiento YOLO)
- **Webcam**: Para funcionalidad de detección en tiempo real

## 🚀 Pasos de Configuración

### Paso 1: Clonar/Obtener el Proyecto

Si aún no tienes el código fuente:

```bash
git clone <repository-url>
cd FullYoloPyVersion
```

O si ya tienes los archivos, navega al directorio del proyecto:

```bash
cd E:\Proyectos\FullYoloPyVersion
```

### Paso 2: Configurar el Backend (Python)

#### 2.1 Crear Entorno Virtual

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 Instalar Dependencias de Python

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

**Dependencias principales que se instalarán:**
- `fastapi` - Framework web
- `uvicorn` - Servidor ASGI
- `pydantic` - Validación de datos (requiere pydantic-settings para configuración)
- `pydantic-settings` - Configuración desde variables de entorno
- `ultralytics` - Modelos YOLO
- `opencv-python` - Procesamiento de imágenes
- `pillow` - Manipulación de imágenes
- `numpy` - Computación numérica
- `python-multipart` - Manejo de archivos
- `aiofiles` - Operaciones de archivos asíncronas

**Nota importante:** Si encuentra errores relacionados con `BaseSettings` movido a `pydantic-settings`, instale manualmente:

```bash
pip install pydantic-settings
```

#### 2.3 Configurar Variables de Entorno (Opcional)

Si deseas personalizar la configuración, crea un archivo `.env` en la carpeta `backend/`:

```bash
cp env.example .env
```

**Importante:** Edita el archivo `.env` con el formato JSON correcto para listas. Las variables de entorno que contienen listas deben estar en formato JSON válido (con corchetes y comillas). No uses el formato separado por comas.

Edita el archivo `.env` según tus necesidades:

```env
# Configuración del servidor
HOST=0.0.0.0
PORT=8000
DEBUG=false

# Configuración de modelos
MODEL_CACHE_DIR=./models
MAX_FILE_SIZE=52428800

# Límites de procesamiento
MAX_IMAGE_WIDTH=1920
MAX_IMAGE_HEIGHT=1080
MAX_VIDEO_DURATION=300

# Configuración de detección
DETECTION_CONFIDENCE_THRESHOLD=0.25

# Configuración de logs
LOG_LEVEL=INFO
LOG_FILE=../logs/app.log
ERROR_LOG_FILE=../logs/error.log

# Configuración CORS (formato JSON para listas)
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Paso 3: Configurar el Frontend (React/TypeScript)

#### 3.1 Instalar Dependencias de Node.js

```bash
cd ../frontend
npm install
```

**Dependencias principales que se instalarán:**
- `react` & `react-dom` - Framework UI
- `typescript` - JavaScript tipado
- `vite` - Build tool
- `tailwindcss` - Framework CSS
- `axios` - Cliente HTTP
- `lucide-react` - Iconos

#### 3.2 Verificar la Configuración del Frontend

El frontend debería estar listo para ejecutarse. Los archivos de configuración importantes:

- `package.json` - Dependencias y scripts
- `vite.config.ts` - Configuración de Vite
- `tailwind.config.js` - Configuración de Tailwind CSS
- `tsconfig.json` - Configuración de TypeScript

## 🏃‍♂️ Inicio de los Servicios

### Opción 1: Inicio Manual (Recomendado para Desarrollo)

#### Terminal 1: Iniciar el Backend

**Windows:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**Linux/Mac:**
```bash
cd backend
source venv/bin/activate
python main.py
```

El backend iniciará en: `http://localhost:8000`

#### Terminal 2: Iniciar el Frontend

```bash
cd frontend
npm run dev
```

El frontend iniciará en: `http://localhost:5173`

### Opción 2: Inicio en Background (Linux/Mac)

Si prefieres ejecutar ambos servicios en background:

```bash
# Backend
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Para detener
kill $BACKEND_PID $FRONTEND_PID
```

## 🔍 Verificación de la Instalación

### Verificar Backend
1. Abre: `http://localhost:8000/docs`
2. Deberías ver la documentación automática de FastAPI
3. Prueba el endpoint `/health` para verificar que el servicio responde

### Verificar Frontend
1. Abre: `http://localhost:5173`
2. Deberías ver la interfaz de YOLO Object Detection Explorer
3. La interfaz debería cargar sin errores

## 📁 Estructura de Archivos Esperada

Después de la configuración completa, deberías tener:

```
FullYoloPyVersion/
├── backend/
│   ├── venv/              # ✅ Entorno virtual creado
│   ├── __pycache__/       # ✅ Se crea al ejecutar
│   └── .env               # ✅ (opcional) archivo de configuración
├── frontend/
│   └── node_modules/      # ✅ Dependencias instaladas
├── models/                # ✅ Se crea automáticamente
└── logs/                  # ✅ Se crea automáticamente
```

## 🐛 Solución de Problemas

### Problema: "python: command not found"
**Solución:** Instala Python 3.11+ desde https://python.org

### Problema: Error de permisos en Windows
**Solución:** Ejecuta el terminal como administrador

### Problema: Puerto ocupado (8000 o 5173)
**Solución:** Cambia los puertos en la configuración o libera los puertos

### Problema: Errores de dependencias de Python
**Solución:**
```bash
# Limpiar y reinstalar
cd backend
rm -rf venv
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install --upgrade pip
pip install -r requirements.txt
```

### Problema: Errores de dependencias de Node.js
**Solución:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Problema: Error "BaseSettings has been moved to pydantic-settings"
**Solución:** Instalar el paquete pydantic-settings:
```bash
pip install pydantic-settings
```

### Problema: Error JSON parsing en archivo .env con CORS_ORIGINS
**Solución:** Cambiar el formato de lista en el archivo .env:
```env
# Incorrecto:
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Correcto:
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Problema: Error de codificación UTF-8 en .env
**Solución:** Recrear el archivo .env con codificación UTF-8 correcta:
```bash
# Linux/Mac
rm .env && cp env.example .env

# Windows PowerShell
Remove-Item .env; Copy-Item env.example .env
```

### Problema: Modelos YOLO no se descargan
**Solución:** Verifica la conexión a internet y permisos de escritura en la carpeta `models/`

## 📊 Monitoreo y Logs

### Logs del Backend
Los logs se guardan en `logs/app.log` y `logs/error.log`

### Logs del Frontend
Los logs aparecen en la terminal donde ejecutas `npm run dev`

### Verificar Procesos en Ejecución

**Windows:**
```bash
tasklist | findstr python
tasklist | findstr node
```

**Linux/Mac:**
```bash
ps aux | grep python
ps aux | grep node
```

## 🔄 Actualización del Proyecto

Para actualizar las dependencias:

```bash
# Backend
cd backend
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install --upgrade -r requirements.txt

# Frontend
cd ../frontend
npm update
```

## 🛑 Detención de Servicios

### Detener Manualmente

**Windows:**
- Presiona `Ctrl+C` en cada terminal

**Linux/Mac:**
- Presiona `Ctrl+C` en cada terminal
- O usa: `pkill -f "python main.py"` y `pkill -f "npm run dev"`

## 📞 Soporte

Si encuentras problemas durante la configuración:

1. Verifica que cumplas con todos los prerrequisitos
2. Revisa los logs en `logs/` para mensajes de error
3. Verifica que no haya procesos usando los puertos 8000 y 5173
4. Intenta ejecutar los scripts automáticos (`start.bat` o `./start.sh`) como alternativa

---

**Nota:** Esta guía asume que estás trabajando en un entorno de desarrollo local. Para despliegue en producción, considera configuraciones adicionales de seguridad y rendimiento.
