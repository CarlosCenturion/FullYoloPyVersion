import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Upload, Play, Pause, Square, Video, X, AlertCircle, SkipBack, SkipForward, Eye, EyeOff, Hash, RotateCcw, Crop, SlidersHorizontal, Maximize2, Minimize2, Fingerprint } from 'lucide-react'
import { detectionApi } from '../services/api'
import { Detection, DetectionConfig, Snapshot, SnapshotConfig } from '../types'
import SnapshotGallery from './SnapshotGallery'

interface VideoPlayerProps {
  selectedModel: string
  detectionConfig: DetectionConfig
  snapshotConfig: SnapshotConfig
  onSnapshotConfigChange?: (config: SnapshotConfig) => void
}

const BOX_COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
]

const OBJECT_EMOJIS: { [key: string]: string } = {
  'person': '👤', 'dog': '🐕', 'cat': '🐱', 'bird': '🐦', 'horse': '🐎',
  'cow': '🐄', 'sheep': '🐑', 'elephant': '🐘', 'bear': '🐻', 'zebra': '🦓',
  'giraffe': '🦒', 'car': '🚗', 'truck': '🚚', 'bus': '🚌', 'motorcycle': '🏍️',
  'bicycle': '🚴', 'train': '🚂', 'airplane': '✈️', 'boat': '⛵',
  'traffic light': '🚦', 'stop sign': '🛑', 'bench': '🪑', 'umbrella': '☂️',
  'suitcase': '🧳', 'bottle': '🍾', 'cup': '☕', 'fork': '🍴', 'knife': '🔪',
  'spoon': '🥄', 'bowl': '🍜', 'banana': '🍌', 'apple': '🍎', 'orange': '🍊',
  'broccoli': '🥦', 'carrot': '🥕', 'pizza': '🍕', 'hot dog': '🌭',
  'sandwich': '🥪', 'cake': '🍰', 'donut': '🍩', 'chair': '🪑', 'tv': '📺',
  'laptop': '💻', 'mouse': '🖱️', 'keyboard': '⌨️', 'phone': '📱', 'book': '📖',
  'clock': '🕐', 'vase': '🏺', 'scissors': '✂️', 'teddy bear': '🧸',
  'potted plant': '🪴', 'bed': '🛏️', 'sofa': '🛋️',
}

const getEmoji = (cls: string): string => {
  const lower = cls.toLowerCase()
  if (OBJECT_EMOJIS[lower]) return OBJECT_EMOJIS[lower]
  for (const [key, emoji] of Object.entries(OBJECT_EMOJIS)) {
    if (lower.includes(key) || key.includes(lower)) return emoji
  }
  return '📦'
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  selectedModel,
  detectionConfig,
  snapshotConfig,
  onSnapshotConfigChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<number | null>(null)
  const pendingRequestRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const disabledClassesRef = useRef<Set<string>>(new Set())
  const selectedModelRef = useRef(selectedModel)
  const detectionConfigRef = useRef(detectionConfig)
  const sessionIdRef = useRef(0) // incremented on each new video to discard stale API responses

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [captureIntervalMs, setCaptureIntervalMs] = useState(500)
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([])
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [framesProcessed, setFramesProcessed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [disabledClasses, setDisabledClasses] = useState<Set<string>>(new Set())
  const [discoveredClasses, setDiscoveredClasses] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(true)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [uniqueCounts, setUniqueCounts] = useState<Map<string, number>>(new Map())
  const [totalUniqueCount, setTotalUniqueCount] = useState(0)
  const seenTrackIdsRef = useRef<Map<string, Set<number>>>(new Map())
  const [videoSnapshots, setVideoSnapshots] = useState<Snapshot[]>([])
  const snapshotConfigRef = useRef(snapshotConfig)

  // Snapshot confidence display filter (client-side)
  const [snapshotMinConfidence, setSnapshotMinConfidence] = useState(snapshotConfig.minConfidence ?? 0.75)

  // Highlighted snapshot for click-to-seek
  const [highlightedSnapshot, setHighlightedSnapshot] = useState<Snapshot | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

  // Expand mode: snapshots become primary, video becomes secondary
  const [snapshotsExpanded, setSnapshotsExpanded] = useState(false)
  // Filter to show only snapshots with track_id
  const [idOnlyFilter, setIdOnlyFilter] = useState(false)

  const videoTypes = ['video/mp4', 'video/avi', 'video/mov']

  const trackingEnabledRef = useRef(false)

  useEffect(() => { disabledClassesRef.current = disabledClasses }, [disabledClasses])
  useEffect(() => { trackingEnabledRef.current = trackingEnabled }, [trackingEnabled])
  useEffect(() => { selectedModelRef.current = selectedModel }, [selectedModel])
  useEffect(() => { detectionConfigRef.current = detectionConfig }, [detectionConfig])
  useEffect(() => { snapshotConfigRef.current = snapshotConfig }, [snapshotConfig])

  // Filtered snapshots for display
  const filteredSnapshots = useMemo(() => {
    return videoSnapshots.filter(snap => {
      if (snap.confidence < snapshotMinConfidence) return false
      if (idOnlyFilter && snap.track_id === undefined) return false
      return true
    })
  }, [videoSnapshots, snapshotMinConfidence, idOnlyFilter])

  const updateTrackingCounts = useCallback((detections: Detection[]) => {
    const seen = seenTrackIdsRef.current
    let newUniques = 0

    for (const det of detections) {
      if (det.track_id == null) continue
      if (!seen.has(det.class)) seen.set(det.class, new Set())
      const classSet = seen.get(det.class)!
      if (!classSet.has(det.track_id)) {
        classSet.add(det.track_id)
        newUniques++
      }
    }

    if (newUniques > 0) {
      const counts = new Map<string, number>()
      let total = 0
      for (const [cls, ids] of seen.entries()) {
        counts.set(cls, ids.size)
        total += ids.size
      }
      setUniqueCounts(counts)
      setTotalUniqueCount(total)
    }
  }, [])

  const getOverlayScaling = useCallback(() => {
    const overlay = overlayCanvasRef.current
    const video = videoRef.current
    if (!overlay || !video) return null

    const displayWidth = video.clientWidth
    const displayHeight = video.clientHeight
    overlay.width = displayWidth
    overlay.height = displayHeight

    const videoAspect = video.videoWidth / video.videoHeight
    const containerAspect = displayWidth / displayHeight

    let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number

    if (videoAspect > containerAspect) {
      renderWidth = displayWidth
      renderHeight = displayWidth / videoAspect
      offsetX = 0
      offsetY = (displayHeight - renderHeight) / 2
    } else {
      renderHeight = displayHeight
      renderWidth = displayHeight * videoAspect
      offsetX = (displayWidth - renderWidth) / 2
      offsetY = 0
    }

    const scaleX = renderWidth / video.videoWidth
    const scaleY = renderHeight / video.videoHeight

    return { displayWidth, displayHeight, scaleX, scaleY, offsetX, offsetY }
  }, [])

  const drawBoundingBoxes = useCallback((detections: Detection[], disabled: Set<string>) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    const scaling = getOverlayScaling()
    if (!scaling) return

    const { displayWidth, displayHeight, scaleX, scaleY, offsetX, offsetY } = scaling

    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const filtered = detections.filter(d => !disabled.has(d.class))
    const classColorMap = new Map<string, string>()
    let colorIdx = 0

    for (const detection of filtered) {
      const [x1, y1, x2, y2] = detection.bbox

      if (!classColorMap.has(detection.class)) {
        classColorMap.set(detection.class, BOX_COLORS[colorIdx % BOX_COLORS.length])
        colorIdx++
      }
      const color = classColorMap.get(detection.class)!

      const sx1 = x1 * scaleX + offsetX
      const sy1 = y1 * scaleY + offsetY
      const sx2 = x2 * scaleX + offsetX
      const sy2 = y2 * scaleY + offsetY

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1)

      const trackLabel = detection.track_id != null ? ` #${detection.track_id}` : ''
      const label = `${detection.class}${trackLabel} ${(detection.confidence * 100).toFixed(0)}%`
      ctx.font = '14px "JetBrains Mono", monospace'
      const textMetrics = ctx.measureText(label)
      const textHeight = 18
      ctx.fillStyle = color
      ctx.fillRect(sx1, sy1 - textHeight, textMetrics.width + 8, textHeight)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, sx1 + 4, sy1 - 4)
    }
  }, [getOverlayScaling])

  // Draw highlight for click-to-seek snapshot
  const drawHighlight = useCallback((snapshot: Snapshot) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    const scaling = getOverlayScaling()
    if (!scaling) return

    const { displayWidth, displayHeight, scaleX, scaleY, offsetX, offsetY } = scaling

    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ffcc'

    const [x1, y1, x2, y2] = snapshot.bbox
    const sx1 = x1 * scaleX + offsetX
    const sy1 = y1 * scaleY + offsetY
    const sx2 = x2 * scaleX + offsetX
    const sy2 = y2 * scaleY + offsetY
    const w = sx2 - sx1
    const h = sy2 - sy1

    // Semi-transparent fill
    ctx.fillStyle = accentHex + '20'
    ctx.fillRect(sx1, sy1, w, h)

    // Dashed border
    ctx.strokeStyle = accentHex
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.strokeRect(sx1, sy1, w, h)
    ctx.setLineDash([])

    // Corner markers
    const cornerLen = Math.min(20, w / 3, h / 3)
    ctx.lineWidth = 3
    ctx.strokeStyle = accentHex
    // Top-left
    ctx.beginPath(); ctx.moveTo(sx1, sy1 + cornerLen); ctx.lineTo(sx1, sy1); ctx.lineTo(sx1 + cornerLen, sy1); ctx.stroke()
    // Top-right
    ctx.beginPath(); ctx.moveTo(sx2 - cornerLen, sy1); ctx.lineTo(sx2, sy1); ctx.lineTo(sx2, sy1 + cornerLen); ctx.stroke()
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(sx1, sy2 - cornerLen); ctx.lineTo(sx1, sy2); ctx.lineTo(sx1 + cornerLen, sy2); ctx.stroke()
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(sx2 - cornerLen, sy2); ctx.lineTo(sx2, sy2); ctx.lineTo(sx2, sy2 - cornerLen); ctx.stroke()

    // Label
    const trackLabel = snapshot.track_id != null ? ` #${snapshot.track_id}` : ''
    const label = `${snapshot.class}${trackLabel} ${(snapshot.confidence * 100).toFixed(0)}%`
    ctx.font = 'bold 14px "JetBrains Mono", monospace'
    const metrics = ctx.measureText(label)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(sx1, sy1 - 24, metrics.width + 12, 24)
    ctx.fillStyle = accentHex
    ctx.fillText(label, sx1 + 6, sy1 - 7)
  }, [getOverlayScaling])

  const captureAndDetect = useCallback(async () => {
    if (pendingRequestRef.current) return
    if (!videoRef.current || !captureCanvasRef.current) return
    if (videoRef.current.paused || videoRef.current.ended) return

    const video = videoRef.current
    const canvas = captureCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Capture video time BEFORE the API call for accurate snapshot timestamps
    const captureVideoTime = video.currentTime
    const currentSession = sessionIdRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      // Discard if video changed while blob was being created
      if (sessionIdRef.current !== currentSession) return
      pendingRequestRef.current = true

      try {
        const file = new File([blob], 'video-frame.jpg', { type: 'image/jpeg' })
        const model = selectedModelRef.current
        const config = detectionConfigRef.current
        const snapCfg = snapshotConfigRef.current
        const useTracking = trackingEnabledRef.current || snapCfg.enabled
        const result = useTracking
          ? await detectionApi.detectWithTracking(file, model, config, snapCfg)
          : await detectionApi.detectImage(file, model, config, undefined, snapCfg)

        // Discard stale results from a previous video
        if (sessionIdRef.current !== currentSession) return

        if (result.success) {
          setCurrentDetections(result.detections)
          setProcessingTime(result.processing_time)
          setFramesProcessed(prev => prev + 1)

          if (useTracking) {
            updateTrackingCounts(result.detections)
          }

          // Stamp snapshots with video playback position
          if (result.snapshots && result.snapshots.length > 0) {
            const stamped = result.snapshots.map(snap => ({
              ...snap,
              videoTime: captureVideoTime,
            }))
            setVideoSnapshots(prev => [...stamped, ...prev])
          }

          const newClasses = result.detections.map(d => d.class)
          setDiscoveredClasses(prev => {
            const updated = new Set(prev)
            let changed = false
            for (const cls of newClasses) {
              if (!updated.has(cls)) { updated.add(cls); changed = true }
            }
            return changed ? updated : prev
          })

          drawBoundingBoxes(result.detections, disabledClassesRef.current)
        }
      } catch (err) {
        console.warn('Frame detection failed:', err)
      } finally {
        pendingRequestRef.current = false
      }
    }, 'image/jpeg', 0.7)
  }, [drawBoundingBoxes, updateTrackingCounts])

  useEffect(() => {
    if (isDetecting && isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = window.setInterval(captureAndDetect, captureIntervalMs)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [captureIntervalMs, isDetecting, isPlaying, captureAndDetect])

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }
  }, [videoUrl])

  useEffect(() => {
    drawBoundingBoxes(currentDetections, disabledClasses)
  }, [disabledClasses, currentDetections, drawBoundingBoxes])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onLoadedMetadata = () => setDuration(video.duration)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [videoUrl])

  const handleFileSelect = (file: File) => {
    if (!videoTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, AVI, MOV)')
      return
    }

    // Full cleanup of previous video state
    stopDetection()
    sessionIdRef.current++
    pendingRequestRef.current = false
    if (videoUrl) URL.revokeObjectURL(videoUrl)

    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(url)
    setCurrentDetections([])
    setFramesProcessed(0)
    setProcessingTime(null)
    setError(null)
    setDiscoveredClasses(new Set())
    setDisabledClasses(new Set())
    setCurrentTime(0)
    setDuration(0)
    setVideoSnapshots([])
    setHighlightedSnapshot(null)
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleFileSelect(files[0])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFileSelect(files[0])
  }

  const startDetection = useCallback(() => {
    if (!videoRef.current || !videoUrl) return
    setHighlightedSnapshot(null)
    videoRef.current.play()
    setIsPlaying(true)
    setIsDetecting(true)
  }, [videoUrl])

  const pauseDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (videoRef.current) videoRef.current.pause()
    setIsPlaying(false)
  }, [])

  const resetTracking = useCallback(async () => {
    seenTrackIdsRef.current = new Map()
    setUniqueCounts(new Map())
    setTotalUniqueCount(0)
    try {
      await detectionApi.resetTracking(selectedModelRef.current)
    } catch (err) {
      console.warn('Failed to reset server tracker:', err)
    }
  }, [])

  const clearVideoSnapshots = useCallback(() => {
    setVideoSnapshots([])
    detectionApi.clearSnapshots().catch(console.error)
  }, [])

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setIsDetecting(false)
    setCurrentDetections([])
    setHighlightedSnapshot(null)
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    resetTracking()

    const overlay = overlayCanvasRef.current
    if (overlay) {
      const ctx = overlay.getContext('2d')
      ctx?.clearRect(0, 0, overlay.width, overlay.height)
    }
  }, [resetTracking])

  const clearVideo = () => {
    stopDetection()
    sessionIdRef.current++
    pendingRequestRef.current = false
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl(null)
    setFramesProcessed(0)
    setProcessingTime(null)
    setDiscoveredClasses(new Set())
    setDisabledClasses(new Set())
    setVideoSnapshots([])
    setHighlightedSnapshot(null)
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds))
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = Number(e.target.value)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  // Click-to-seek: when a snapshot is clicked, seek video and highlight bbox
  const handleSnapshotSeek = useCallback((snapshot: Snapshot) => {
    if (!videoRef.current) return
    if (snapshot.videoTime === undefined) return

    // Pause video
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    videoRef.current.pause()
    setIsPlaying(false)

    // Seek to snapshot's video timestamp
    videoRef.current.currentTime = snapshot.videoTime
    setCurrentTime(snapshot.videoTime)

    // Draw highlight
    setHighlightedSnapshot(snapshot)

    // Wait for video to seek, then draw
    const onSeeked = () => {
      drawHighlight(snapshot)
      videoRef.current?.removeEventListener('seeked', onSeeked)
    }
    videoRef.current.addEventListener('seeked', onSeeked)

    // Also draw immediately in case seek is instant
    drawHighlight(snapshot)

    // Auto-clear highlight after 4 seconds
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSnapshot(null)
      const overlay = overlayCanvasRef.current
      if (overlay) {
        const ctx = overlay.getContext('2d')
        ctx?.clearRect(0, 0, overlay.width, overlay.height)
      }
    }, 4000)
  }, [drawHighlight])

  const toggleClass = (cls: string) => {
    setDisabledClasses(prev => {
      const next = new Set(prev)
      if (next.has(cls)) next.delete(cls)
      else next.add(cls)
      return next
    })
  }

  const enableAllClasses = () => setDisabledClasses(new Set())
  const disableAllClasses = () => setDisabledClasses(new Set(discoveredClasses))

  const toggleSnapshotClass = (cls: string) => {
    if (!onSnapshotConfigChange) return
    onSnapshotConfigChange({
      ...snapshotConfig,
      classes: snapshotConfig.classes.length === 0
        ? [cls]
        : snapshotConfig.classes.includes(cls)
          ? snapshotConfig.classes.filter(c => c !== cls)
          : [...snapshotConfig.classes, cls],
    })
  }

  const formatTime = (s: number): string => {
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const visibleDetections = currentDetections.filter(d => !disabledClasses.has(d.class))
  const sortedClasses = Array.from(discoveredClasses).sort()

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider font-body">Video Detection</h2>

      {!videoUrl ? (
        <div
          className={`relative border-2 border-dashed p-12 text-center transition-all ${
            dragActive ? '' : 'border-surface-border hover:border-gray-500'
          }`}
          style={{
            borderRadius: '3px',
            borderColor: dragActive ? 'var(--accent)' : undefined,
            backgroundColor: dragActive ? 'var(--accent-muted)' : undefined,
          }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.avi,.mov"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-600 mx-auto" />
            <div>
              <p className="text-base font-semibold text-gray-300 font-body uppercase tracking-wider">
                Drop a video here or click to browse
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                MP4, AVI, MOV - plays in loop with real-time detection
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col ${snapshotsExpanded ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-4`}>
          {/* VIDEO COLUMN */}
          <div className={`${snapshotsExpanded ? 'lg:w-2/5' : 'lg:w-3/5'} space-y-3 transition-all duration-300`}>
            {/* Video info bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-semibold text-gray-200 truncate max-w-xs font-mono">
                  {videoFile?.name}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  ({videoFile ? formatFileSize(videoFile.size) : ''})
                </span>
              </div>
              <button
                onClick={clearVideo}
                className="text-gray-600 hover:text-gray-400 transition-colors"
                title="Remove video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video + overlay container */}
            <div className="relative bg-black overflow-hidden border border-surface-border" style={{ borderRadius: '2px' }}>
              <video
                ref={videoRef}
                src={videoUrl}
                loop
                muted
                playsInline
                className="w-full object-contain"
                style={{ maxHeight: '65vh' }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {/* Highlight indicator */}
              {highlightedSnapshot && (
                <div
                  className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 text-xs font-mono uppercase tracking-wider"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '2px',
                  }}
                >
                  <Eye className="w-3 h-3" />
                  {highlightedSnapshot.class} @ {formatTime(highlightedSnapshot.videoTime ?? 0)}
                </div>
              )}
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />

            {/* Timeline / seek bar */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => seekRelative(-5)}
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                title="Rewind 5s"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono text-gray-500 w-10 text-right">{formatTime(currentTime)}</span>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1"
              />

              <span className="text-xs font-mono text-gray-500 w-10">{formatTime(duration)}</span>

              <button
                onClick={() => seekRelative(5)}
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                title="Forward 5s"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {!isDetecting || !isPlaying ? (
                <button
                  onClick={isDetecting ? () => { videoRef.current?.play(); setIsPlaying(true) } : startDetection}
                  className="flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '3px',
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isDetecting ? 'Resume' : 'Start Detection'}
                </button>
              ) : (
                <button
                  onClick={pauseDetection}
                  className="flex items-center px-4 py-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{ borderRadius: '3px' }}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
              )}

              {isDetecting && (
                <button
                  onClick={stopDetection}
                  className="flex items-center px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{ borderRadius: '3px' }}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </button>
              )}

              {/* Capture interval */}
              <div className="flex items-center space-x-2 ml-auto">
                <label className="text-xs text-gray-500 whitespace-nowrap uppercase tracking-wider font-body">Interval:</label>
                <input
                  type="range"
                  min={5}
                  max={1000}
                  step={5}
                  value={captureIntervalMs}
                  onChange={(e) => setCaptureIntervalMs(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs font-mono w-14" style={{ color: 'var(--accent)' }}>{captureIntervalMs}ms</span>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center space-x-4 text-xs font-mono text-gray-500">
              <span>FRM: {framesProcessed}</span>
              {processingTime != null && (
                <>
                  <span>LAT: {(processingTime * 1000).toFixed(0)}ms</span>
                  <span>~{(1 / processingTime).toFixed(1)} FPS</span>
                </>
              )}
              {visibleDetections.length > 0 && (
                <span style={{ color: 'var(--accent)' }} className="font-semibold">
                  {visibleDetections.length} object{visibleDetections.length !== 1 ? 's' : ''} detected
                </span>
              )}
            </div>

            {/* Unique object tracking */}
            <div className="border border-surface-border" style={{ borderRadius: '3px' }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-body">Unique Object Counting</span>
                </div>
                <div className="flex items-center space-x-2">
                  {trackingEnabled && totalUniqueCount > 0 && (
                    <button
                      onClick={resetTracking}
                      className="flex items-center px-2 py-1 text-xs font-semibold text-gray-400 bg-surface-tertiary border border-surface-border uppercase tracking-wider font-body hover:text-gray-200 transition-colors"
                      style={{ borderRadius: '2px' }}
                      title="Reset counters"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setTrackingEnabled(prev => !prev)
                      if (!trackingEnabled) resetTracking()
                    }}
                    className="relative inline-flex h-5 w-10 items-center transition-colors"
                    style={{
                      backgroundColor: trackingEnabled ? 'var(--accent-muted)' : '#21262d',
                      border: `1px solid ${trackingEnabled ? 'var(--accent-border)' : '#30363d'}`,
                      borderRadius: '2px',
                    }}
                  >
                    <span
                      className="inline-block h-3 w-3 transform transition-transform"
                      style={{
                        backgroundColor: trackingEnabled ? 'var(--accent)' : '#484f58',
                        borderRadius: '1px',
                        transform: trackingEnabled ? 'translateX(22px)' : 'translateX(3px)',
                      }}
                    />
                  </button>
                </div>
              </div>

              {trackingEnabled && (
                <div className="px-4 pb-4 border-t border-surface-border">
                  {totalUniqueCount > 0 ? (
                    <>
                      <div className="mt-3 mb-3 flex items-center">
                        <span className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{totalUniqueCount}</span>
                        <span className="ml-2 text-xs text-gray-500 uppercase tracking-wider font-body">total unique objects tracked</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Array.from(uniqueCounts.entries())
                          .sort((a, b) => b[1] - a[1])
                          .map(([cls, count]) => (
                            <div
                              key={cls}
                              className="flex items-center justify-between px-3 py-2 bg-accent-muted border border-accent"
                              style={{ borderRadius: '2px', borderColor: 'var(--accent-border)' }}
                            >
                              <div className="flex items-center space-x-1.5">
                                <span>{getEmoji(cls)}</span>
                                <span className="text-xs capitalize text-gray-300 font-body">{cls}</span>
                              </div>
                              <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{count}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500 font-mono">
                      Start detection to begin tracking unique objects via ByteTrack (server-side).
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Class filters + detection list */}
            {discoveredClasses.size > 0 && (
              <div className="border border-surface-border" style={{ borderRadius: '3px' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
                >
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-body">
                    Object Filters ({discoveredClasses.size} classes)
                  </span>
                  <span className="text-xs text-gray-600 font-mono uppercase">
                    {showFilters ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showFilters && (
                  <div className="px-4 pb-4 border-t border-surface-border">
                    <div className="flex items-center space-x-2 mt-3 mb-3">
                      <button
                        onClick={enableAllClasses}
                        className="flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider font-body transition-colors"
                        style={{
                          backgroundColor: 'var(--accent-muted)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent-border)',
                          borderRadius: '2px',
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Show All
                      </button>
                      <button
                        onClick={disableAllClasses}
                        className="flex items-center px-2.5 py-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 uppercase tracking-wider font-body hover:bg-red-500/20 transition-colors"
                        style={{ borderRadius: '2px' }}
                      >
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hide All
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sortedClasses.map(cls => {
                        const enabled = !disabledClasses.has(cls)
                        const count = currentDetections.filter(d => d.class === cls).length
                        return (
                          <button
                            key={cls}
                            onClick={() => toggleClass(cls)}
                            className={`flex items-center px-3 py-1.5 text-xs border transition-all ${
                              enabled
                                ? 'text-gray-200'
                                : 'bg-surface-tertiary border-surface-border text-gray-600 line-through'
                            }`}
                            style={{
                              borderRadius: '2px',
                              backgroundColor: enabled ? 'var(--accent-muted)' : undefined,
                              borderColor: enabled ? 'var(--accent-border)' : undefined,
                            }}
                          >
                            <span className="mr-1">{getEmoji(cls)}</span>
                            <span className="capitalize font-body font-semibold">{cls}</span>
                            {count > 0 && (
                              <span className={`ml-1.5 text-xs font-mono ${enabled ? '' : 'text-gray-600'}`} style={{ color: enabled ? 'var(--accent)' : undefined }}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SNAPSHOTS COLUMN */}
          <div className={`${snapshotsExpanded ? 'lg:w-3/5' : 'lg:w-2/5'} space-y-3 transition-all duration-300`}>
            {/* Snapshot Controls */}
            <div className="border border-surface-border p-3" style={{ borderRadius: '3px' }}>
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-body">Snapshot Controls</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* ID-only filter */}
                  <button
                    onClick={() => setIdOnlyFilter(prev => !prev)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-body uppercase tracking-wider border transition-all"
                    style={{
                      borderRadius: '2px',
                      color: idOnlyFilter ? 'var(--accent)' : '#8b949e',
                      backgroundColor: idOnlyFilter ? 'var(--accent-muted)' : 'transparent',
                      borderColor: idOnlyFilter ? 'var(--accent-border)' : '#30363d',
                    }}
                    title="Show only tracked objects (with ID)"
                  >
                    <Fingerprint className="w-3 h-3" />
                    ID
                  </button>
                  {/* Expand/collapse */}
                  <button
                    onClick={() => setSnapshotsExpanded(prev => !prev)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-body uppercase tracking-wider border transition-all"
                    style={{
                      borderRadius: '2px',
                      color: snapshotsExpanded ? 'var(--accent)' : '#8b949e',
                      backgroundColor: snapshotsExpanded ? 'var(--accent-muted)' : 'transparent',
                      borderColor: snapshotsExpanded ? 'var(--accent-border)' : '#30363d',
                    }}
                    title={snapshotsExpanded ? 'Collapse snapshots' : 'Expand snapshots'}
                  >
                    {snapshotsExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                  {/* ON/OFF badge */}
                  <span
                    className="text-xs font-mono px-1.5 py-0.5"
                    style={{
                      color: snapshotConfig.enabled ? 'var(--accent)' : '#8b949e',
                      backgroundColor: snapshotConfig.enabled ? 'var(--accent-muted)' : 'transparent',
                      border: `1px solid ${snapshotConfig.enabled ? 'var(--accent-border)' : '#30363d'}`,
                      borderRadius: '2px',
                    }}
                  >
                    {snapshotConfig.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Min confidence slider */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500 font-body uppercase tracking-wider whitespace-nowrap">Min Conf</span>
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={1}
                  value={snapshotMinConfidence * 100}
                  onChange={(e) => setSnapshotMinConfidence(Number(e.target.value) / 100)}
                  className="flex-1"
                />
                <span
                  className="text-xs font-mono px-1.5 py-0.5 w-10 text-center"
                  style={{
                    color: 'var(--accent)',
                    backgroundColor: 'var(--accent-muted)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '2px',
                  }}
                >
                  {(snapshotMinConfidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Snapshot class filter chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onSnapshotConfigChange?.({ ...snapshotConfig, classes: [] })}
                  className="px-2 py-1 text-xs font-body uppercase tracking-wider border transition-all"
                  style={{
                    borderRadius: '2px',
                    color: snapshotConfig.classes.length === 0 ? 'var(--accent)' : '#8b949e',
                    backgroundColor: snapshotConfig.classes.length === 0 ? 'var(--accent-muted)' : 'transparent',
                    borderColor: snapshotConfig.classes.length === 0 ? 'var(--accent-border)' : '#30363d',
                  }}
                >
                  ALL
                </button>
                {sortedClasses.map(cls => {
                  const isSelected = snapshotConfig.classes.length === 0 || snapshotConfig.classes.includes(cls)
                  return (
                    <button
                      key={cls}
                      onClick={() => toggleSnapshotClass(cls)}
                      className="px-2 py-1 text-xs font-body uppercase tracking-wider border transition-all"
                      style={{
                        borderRadius: '2px',
                        color: isSelected ? 'var(--accent)' : '#8b949e',
                        backgroundColor: isSelected ? 'var(--accent-muted)' : 'transparent',
                        borderColor: isSelected ? 'var(--accent-border)' : '#30363d',
                      }}
                    >
                      {getEmoji(cls)} {cls}
                    </button>
                  )
                })}
              </div>

              {/* Count indicator */}
              {videoSnapshots.length > 0 && (
                <div className="mt-2 text-xs font-mono text-gray-500">
                  {filteredSnapshots.length} of {videoSnapshots.length} snapshots
                </div>
              )}
            </div>

            {/* Snapshot Gallery */}
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {filteredSnapshots.length > 0 ? (
                <SnapshotGallery
                  snapshots={filteredSnapshots}
                  onClear={clearVideoSnapshots}
                  onSnapshotClick={handleSnapshotSeek}
                  expanded={snapshotsExpanded}
                />
              ) : videoSnapshots.length > 0 ? (
                <div className="border border-surface-border p-4 text-center" style={{ borderRadius: '3px' }}>
                  <Crop className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-mono">
                    {videoSnapshots.length} snapshot{videoSnapshots.length !== 1 ? 's' : ''} hidden by confidence filter
                  </p>
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    Lower the min confidence to see them
                  </p>
                </div>
              ) : snapshotConfig.enabled ? (
                <div className="border border-surface-border p-4 text-center" style={{ borderRadius: '3px' }}>
                  <Crop className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-mono">
                    Snapshots will appear here during detection
                  </p>
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    Click a snapshot to seek video to that moment
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 p-3" style={{ borderRadius: '3px' }}>
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
            <span className="text-xs text-red-300 font-mono">{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
