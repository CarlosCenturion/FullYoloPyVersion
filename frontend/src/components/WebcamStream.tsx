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
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      return { available: videoDevices.length > 0, devices: videoDevices }
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
        return 'Camera permission denied. Allow camera access and try again.'
      case 'NotFoundError':
        return 'No camera device found. Connect a camera and refresh.'
      case 'NotReadableError':
        return 'Camera already in use by another application.'
      case 'OverconstrainedError':
        return 'Camera does not support required video format.'
      case 'SecurityError':
        return 'Camera access blocked by security restrictions. Use HTTPS or localhost.'
      case 'AbortError':
        return 'Camera access interrupted. Try again.'
      default:
        if (errorMessage.includes('video source')) {
          return 'Could not start video source. Check camera permissions.'
        }
        return `Camera access error: ${errorMessage || 'Unknown error'}`
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const { available } = await checkCameraAvailability()

      if (!available) {
        setError('No camera devices found. Please connect a camera and refresh the page.')
        setCameraPermission(false)
        return
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (permissionStatus.state === 'denied') {
          setError('Camera permission has been denied. Please enable camera access in your browser settings.')
          setCameraPermission(false)
          return
        }
      } catch (permErr) {
        console.warn('Could not check permission status:', permErr)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
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
            console.error('Error playing video:', playError)
            setError('Could not start video playback. Try again.')
            setCameraPermission(false)
          })
        }

        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e)
          setError('Video element error. Refresh the page.')
          setCameraPermission(false)
          setIsStreaming(false)
        }

        setTimeout(() => {
          if (!isStreaming && videoRef.current && !videoRef.current.error) {
            videoRef.current.play().then(() => {
              setIsStreaming(true)
              setCameraPermission(true)
              setError(null)
            }).catch(() => {})
          }
        }, 2000)
      } else {
        setError('Video element not available. Refresh the page.')
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

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

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

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const [lastModel, setLastModel] = useState(selectedModel)
  useEffect(() => {
    if (lastModel !== selectedModel && isStreaming) {
      stopCamera()
      setLastModel(selectedModel)
    }
  }, [selectedModel, isStreaming, stopCamera, lastModel])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider font-body">Webcam Detection</h2>
        <div className="flex items-center space-x-2">
          {cameraPermission === false && (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          {cameraPermission === true && isStreaming && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 animate-pulse" style={{ borderRadius: '1px' }} />
              <span className="text-xs font-mono text-red-400 uppercase">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black overflow-hidden mb-4 border border-surface-border" style={{ height: '256px', borderRadius: '2px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: 'block', opacity: isStreaming ? 1 : 0.3 }}
        />

        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <CameraOff className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-sm font-body uppercase tracking-wider text-gray-400">Camera not active</p>
              <p className="text-xs font-mono text-gray-600 mt-1">Click start to begin detection</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3" style={{ borderRadius: '3px' }}>
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-red-300 block font-mono">{error}</span>
              <button
                onClick={startCamera}
                className="mt-2 px-3 py-1 bg-red-500/20 text-red-400 text-xs border border-red-500/30 hover:bg-red-500/30 transition-colors uppercase tracking-wider font-body"
                style={{ borderRadius: '2px' }}
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
            START CAMERA
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="flex-1 btn btn-secondary"
            >
              <Square className="w-4 h-4 mr-2" />
              STOP
            </button>

            <button
              onClick={captureFrame}
              disabled={isProcessing}
              className="flex-1 btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current/30 mr-2" style={{ borderTopColor: 'currentColor', borderRadius: '2px' }}></div>
                  PROCESSING...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  CAPTURE
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-accent-muted border border-accent" style={{ borderRadius: '3px', borderColor: 'var(--accent-border)' }}>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider font-body" style={{ color: 'var(--accent)' }}>How to use:</h3>
        <ol className="text-xs text-gray-400 space-y-1 font-mono">
          <li>1. Click "START CAMERA" to enable webcam access</li>
          <li>2. Position objects in front of the camera</li>
          <li>3. Click "CAPTURE" to analyze the current frame</li>
          <li>4. View detection results in the panel on the right</li>
        </ol>
      </div>

      {/* Camera Permissions Info */}
      {cameraPermission === false && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30" style={{ borderRadius: '3px' }}>
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-300/80 font-mono">
              <p className="font-semibold mb-2 uppercase tracking-wider text-amber-400 font-body">Camera Troubleshooting</p>
              <div className="space-y-1">
                <p><span className="text-amber-400">BROWSER:</span> Click camera icon in address bar and allow access.</p>
                <p><span className="text-amber-400">SETTINGS:</span> Browser settings &gt; Privacy &gt; Camera &gt; Allow for this site.</p>
                <p><span className="text-amber-400">APPS:</span> Close other applications using your camera.</p>
                <p><span className="text-amber-400">HARDWARE:</span> Ensure your camera is connected and working.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30 hover:bg-amber-500/30 transition-colors uppercase tracking-wider font-body"
                  style={{ borderRadius: '2px' }}
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
