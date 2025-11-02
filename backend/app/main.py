"""Main FastAPI application entry point."""

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import time

from app.config import settings
from app.api.routes import router
from app.utils.logger import setup_logging

# Setup logging
logger = setup_logging()

# Create FastAPI application
app = FastAPI(
    title="YOLO Object Detection API",
    description="API for real-time object detection using YOLO models",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"{request.method} {request.url} - {process_time:.3f}s")
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions globally."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Custom static files handler with error handling
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse
from starlette.exceptions import HTTPException
import logging

class SafeStaticFiles(StaticFiles):
    """Custom static files handler that handles connection errors gracefully."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except ConnectionResetError:
            # Client disconnected, log but don't crash
            logger.warning(f"Client disconnected while serving static file: {path}")
            raise HTTPException(status_code=499, detail="Client disconnected")
        except Exception as e:
            logger.error(f"Error serving static file {path}: {e}")
            raise

# Mount static files for processed images/videos
app.mount("/static", SafeStaticFiles(directory="static", html=True), name="static")

# Include API routes
app.include_router(router, prefix="/api", tags=["API"])

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": time.time()}

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "YOLO Object Detection API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    # Create static directory if it doesn't exist
    import os
    os.makedirs("static", exist_ok=True)

    # Run the application
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
