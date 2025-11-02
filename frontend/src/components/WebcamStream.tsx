import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Camera, CameraOff, AlertCircle, Play, Square } from 'lucide-react'

interface WebcamStreamProps {
  selectedModel: string
  onDetection: (file: File, model: string) => Promise<void>
  isProcessing: boolean
}

const WebcamStream: React.FC<WebcamStreamProps> = ({
  selectedModel,
  onDetection,
  isProcessing,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

  const checkCameraAvailability = useCallback(async (): Promise<{available: boolean, devices: MediaDeviceInfo[]}> => {
    try {
      // Request permission to enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      return {
        available: videoDevices.length > 0,
        devices: videoDevices
      }
    } catch (err) {
      console.warn('Could not enumerate devices:', err)
      return { available: false, devices: [] }
    }
  }, [])

  const getCameraErrorMessage = useCallback((error: any): string => {
    const errorName = error?.name || ''
    const errorMessage = error?.message || ''

    switch (errorName) {
      case 'NotAllowedError':
        return 'Permiso de cámara denegado. Permite el acceso a la cámara e inténtalo de nuevo.'
      case 'NotFoundError':
        return 'No se encontró dispositivo de cámara. Conecta una cámara y actualiza la página.'
      case 'NotReadableError':
        return 'La cámara ya está en uso por otra aplicación. Cierra otras apps que usen la cámara.'
      case 'OverconstrainedError':
        return 'La cámara no soporta el formato de video requerido. Prueba con una cámara diferente.'
      case 'SecurityError':
        return 'Acceso a cámara bloqueado por restricciones de seguridad. Asegúrate de usar HTTPS o localhost.'
      case 'AbortError':
        return 'Acceso a cámara interrumpido. Inténtalo de nuevo.'
      default:
        if (errorMessage.includes('video source')) {
          return 'No se pudo iniciar la fuente de video. Revisa los permisos de cámara e inténtalo de nuevo.'
        }
        return `Error de acceso a cámara: ${errorMessage || 'Error desconocido'}`
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)

      // First check if camera is available
      const { available, devices } = await checkCameraAvailability()

      if (!available) {
        setError('No camera devices found. Please connect a camera and refresh the page.')
        setCameraPermission(false)
        return
      }

      // Check current permission status
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (permissionStatus.state === 'denied') {
          setError('Camera permission has been denied. Please enable camera access in your browser settings.')
          setCameraPermission(false)
          return
        }
      } catch (permErr) {
        // Permissions API might not be fully supported, continue with getUserMedia
        console.warn('Could not check permission status:', permErr)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true)
            setCameraPermission(true)
            setError(null)
          }).catch((playError) => {
            console.error('Error al reproducir video:', playError)
            setError('No se pudo iniciar la reproducción del video. Inténtalo de nuevo.')
            setCameraPermission(false)
          })
        }

        videoRef.current.onerror = (e) => {
          console.error('Error en elemento de video:', e)
          setError('Error en el elemento de video. Actualiza la página.')
          setCameraPermission(false)
          setIsStreaming(false)
        }

        // Fallback: intentar reproducir después de un retraso si los metadatos no cargan
        setTimeout(() => {
          if (!isStreaming && videoRef.current && !videoRef.current.error) {
            videoRef.current.play().then(() => {
              setIsStreaming(true)
              setCameraPermission(true)
              setError(null)
            }).catch(() => {
              // Silenciar errores de respaldo
            })
          }
        }, 2000)
      } else {
        setError('Elemento de video no disponible. Actualiza la página.')
      }
    } catch (err) {
      const errorMessage = getCameraErrorMessage(err)
      setError(errorMessage)
      setCameraPermission(false)
      console.error('Camera access error:', err)
    }
  }, [checkCameraAvailability, getCameraErrorMessage])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)
  }, [])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' })
        try {
          await onDetection(file, selectedModel)
        } catch (err) {
          // Error is handled by parent component
        }
      }
    }, 'image/jpeg', 0.8)
  }, [isStreaming, selectedModel, onDetection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Handle model changes - stop/start camera to reset stream
  const [lastModel, setLastModel] = useState(selectedModel)
  useEffect(() => {
    if (lastModel !== selectedModel && isStreaming) {
      stopCamera()
      setLastModel(selectedModel)
      // Note: We don't auto-restart to give user control
    }
  }, [selectedModel, isStreaming, stopCamera, lastModel])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Webcam Detection</h2>
        <div className="flex items-center space-x-2">
          {cameraPermission === false && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {cameraPermission === true && isStreaming && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ height: '256px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            display: 'block',
            opacity: isStreaming ? 1 : 0.3
          }}
        />

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-center text-white">
              <CameraOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Camera not active</p>
              <p className="text-sm opacity-75">Click start to begin detection</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-red-700 block">{error}</span>
              <button
                onClick={startCamera}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-3">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            disabled={cameraPermission === false}
            className="flex-1 btn btn-primary"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="flex-1 btn btn-secondary"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Camera
            </button>

            <button
              onClick={captureFrame}
              disabled={isProcessing}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Frame
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How to use:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Click "Start Camera" to enable webcam access</li>
          <li>2. Position objects in front of the camera</li>
          <li>3. Click "Capture Frame" to analyze the current frame</li>
          <li>4. View detection results in the panel on the right</li>
        </ol>
      </div>

      {/* Camera Permissions Info */}
      {cameraPermission === false && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-2">Camera Access Troubleshooting</p>
              <div className="space-y-2">
                <p><strong>Browser Permission:</strong> Click the camera icon in your address bar and allow access.</p>
                <p><strong>Settings:</strong> Go to browser settings → Privacy → Camera → Allow for this site.</p>
                <p><strong>Other Apps:</strong> Close other applications using your camera (Zoom, Teams, etc.).</p>
                <p><strong>Hardware:</strong> Ensure your camera is properly connected and not faulty.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebcamStream
