# YOLO Object Detection Explorer

Un sitio web moderno y local para explorar y probar modelos de reconocimiento de objetos YOLO en tiempo real.

## 🚀 Características

- **Interfaz Web Moderna**: Sitio web responsive y atractivo construido con React y TypeScript
- **Backend Python**: API RESTful con FastAPI para procesamiento de imágenes y videos
- **Modelos Múltiples YOLO**: Soporte para diferentes versiones de YOLO (Nano, Small, Medium, Large)
- **Webcam en Tiempo Real**: Detección de objetos en vivo desde tu cámara web
- **Subida de Archivos**: Procesa imágenes y videos locales
- **Resultados Visuales**: Visualización de bounding boxes y etiquetas de objetos detectados
- **Métricas de Rendimiento**: Muestra tiempos de procesamiento y confianza de detección

## 🛠️ Tecnologías

### Backend
- **Python 3.11+**
- **FastAPI**: Framework web moderno y rápido
- **Ultralytics YOLO**: Librería oficial para modelos YOLO
- **OpenCV**: Procesamiento de imágenes y videos
- **Pillow**: Manipulación de imágenes
- **Uvicorn**: Servidor ASGI

### Frontend
- **React 18**: Biblioteca para interfaces de usuario
- **TypeScript**: JavaScript tipado
- **Tailwind CSS**: Framework CSS utilitario
- **Vite**: Build tool moderno
- **Lucide React**: Iconos modernos
- **Axios**: Cliente HTTP

## 📁 Estructura del Proyecto

```
yolo-explorer/
├── backend/                 # API Python con FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints de la API
│   │   ├── models/         # Gestión de modelos YOLO
│   │   ├── services/       # Lógica de negocio
│   │   └── utils/          # Utilidades
│   ├── requirements.txt    # Dependencias Python
│   └── main.py            # Punto de entrada
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── hooks/         # Hooks personalizados
│   │   ├── services/      # Servicios API
│   │   └── utils/         # Utilidades
│   ├── package.json       # Dependencias Node.js
│   └── vite.config.ts     # Configuración Vite
├── models/                 # Modelos YOLO descargados
├── docs/                   # Documentación
├── logs/                   # Logs de la aplicación
└── archive/                # Archivos backup
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Python 3.11 o superior (las dependencias se instalan automáticamente)
- Node.js 18 o superior (las dependencias se instalan automáticamente)
- Webcam (opcional, para detección en vivo)

### Instalación

1. **Clona el repositorio**
   ```bash
   git clone <repository-url>
   cd yolo-explorer
   ```

   **¡Eso es todo!** Los scripts de inicio manejan automáticamente:
   - ✅ Creación del entorno virtual de Python
   - ✅ Instalación de todas las dependencias de Python
   - ✅ Instalación de todas las dependencias de Node.js
   - ✅ Inicio de los servidores backend y frontend

### Ejecución

#### Opción 1: Script Automático (Recomendado)

Los scripts automáticos verifican e instalan automáticamente todas las dependencias necesarias.

**En Windows:**
```bash
start.bat
```

**En Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Qué hacen los scripts automáticos:**
- ✅ Verifican si existe el entorno virtual de Python
- ✅ Crean el entorno virtual si no existe e instalan dependencias
- ✅ Verifican si las dependencias de Node.js están instaladas
- ✅ Instalan dependencias de Node.js si es necesario
- ✅ Inician el backend y frontend en terminales separadas

**Scripts de utilidad:**
- `clean.bat` / `clean.sh`: Elimina todas las dependencias instaladas para empezar desde cero

#### Opción 2: Manual

Para instrucciones detalladas paso a paso, consulta la **[Guía de Configuración Manual](docs/manual-setup.md)**.

**Inicio rápido manual:**

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   python main.py
   ```
   El backend estará disponible en `http://localhost:8000`

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   El frontend estará disponible en `http://localhost:5173`

## 📖 Uso

1. Abre tu navegador en `http://localhost:5173`
2. Selecciona un modelo YOLO del menú desplegable
3. Elige entre:
   - **Webcam**: Activa tu cámara para detección en tiempo real
   - **Subir Imagen**: Selecciona una imagen de tu dispositivo
   - **Subir Video**: Selecciona un video para procesar

## 🔧 Configuración

### Modelos YOLO Disponibles

- **YOLOv8 Nano**: Más rápido, menos preciso (ideal para dispositivos edge)
- **YOLOv8 Small**: Buen balance velocidad/precisión
- **YOLOv8 Medium**: Mayor precisión, velocidad moderada
- **YOLOv8 Large**: Máxima precisión, más lento

Los modelos se descargan automáticamente la primera vez que se usan.

### Configuración del Backend

Variables de entorno en `backend/.env`:

```env
HOST=0.0.0.0
PORT=8000
MODEL_CACHE_DIR=./models
LOG_LEVEL=INFO
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [Ultralytics](https://ultralytics.com/) por la librería YOLO
- [FastAPI](https://fastapi.tiangolo.com/) por el framework web
- [React](https://reactjs.org/) por la librería de UI
