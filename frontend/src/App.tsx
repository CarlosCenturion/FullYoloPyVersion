import { useState, useEffect, useMemo, useCallback } from 'react'
import { Camera, Upload, Film, Image as ImageIcon, Zap, Scale, Sparkles, Info, Eye, Crop } from 'lucide-react'
import WebcamStream from './components/WebcamStream'
import FileUpload from './components/FileUpload'
import VideoPlayer from './components/VideoPlayer'
import DetectionResult from './components/DetectionResult'
import SnapshotGallery from './components/SnapshotGallery'
import Gallery from './components/Gallery'
import IntroAnimation from './components/IntroAnimation'
import { useDetection } from './hooks/useDetection'
import { DetectionConfig, ModelInfo, SnapshotConfig } from './types'
import { detectionApi } from './services/api'

type TabType = 'webcam' | 'upload' | 'video' | 'gallery'
type QualityLevel = 'fast' | 'balanced' | 'quality'
type ThemeType = 'cyan' | 'amber' | 'red'

const QUALITY_PRESETS: Record<QualityLevel, { imageSize: number; iou: number; maxDetections: number }> = {
  fast: { imageSize: 320, iou: 0.40, maxDetections: 200 },
  balanced: { imageSize: 640, iou: 0.45, maxDetections: 300 },
  quality: { imageSize: 1280, iou: 0.50, maxDetections: 500 },
}

const TABS: { id: TabType; label: string; icon: typeof Camera }[] = [
  { id: 'webcam', label: 'WEBCAM', icon: Camera },
  { id: 'upload', label: 'UPLOAD', icon: Upload },
  { id: 'video', label: 'VIDEO', icon: Film },
  { id: 'gallery', label: 'GALLERY', icon: ImageIcon },
]

const QUALITY_INFO: Record<QualityLevel, string> = {
  fast: 'Low resolution (320px) - fastest processing, may miss small objects',
  balanced: 'Medium resolution (640px) - good balance of speed and accuracy',
  quality: 'High resolution (1280px) - best accuracy for small/distant objects, slower',
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  yolov8n: 'Fastest - best for real-time video',
  yolov8s: 'Fast - slightly more accurate',
  yolov8m: 'Medium - good accuracy, moderate speed',
  yolov8l: 'Slowest - maximum accuracy',
}

const THEMES: { id: ThemeType; label: string; color: string }[] = [
  { id: 'cyan', label: 'TRON', color: '#00ffcc' },
  { id: 'amber', label: 'MILITARY', color: '#ff9500' },
  { id: 'red', label: 'HAL', color: '#ff3333' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('webcam')
  const [selectedModel, setSelectedModel] = useState('yolov8n')
  const [sensitivity, setSensitivity] = useState(7)
  const [quality, setQuality] = useState<QualityLevel>('balanced')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('charly-intro-seen')
  })
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('charly-theme') as ThemeType) || 'cyan'
  })

  const [snapshotConfig, setSnapshotConfig] = useState<SnapshotConfig>({ enabled: false, classes: [] })

  const {
    detections,
    processingTime,
    isProcessing,
    error,
    resultImageUrl,
    resultVideoUrl,
    isVideoReady,
    snapshots,
    processImage,
    processImageWithTracking,
    processVideo,
    clearResults,
    clearSnapshots
  } = useDetection()

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('charly-theme', theme)
  }, [theme])

  useEffect(() => {
    detectionApi.getModels().then(setModels).catch(console.error)
  }, [])

  const detectionConfig: DetectionConfig = useMemo(() => ({
    confidence: Math.max(0.05, Math.min(0.95, 1.05 - sensitivity / 10)),
    ...QUALITY_PRESETS[quality],
  }), [sensitivity, quality])

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    clearResults()
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    clearResults()
  }

  const handleProcessImage = async (file: File, model: string, galleryOptions?: any) => {
    if (activeTab === 'webcam' && snapshotConfig.enabled) {
      await processImageWithTracking(file, model, detectionConfig, snapshotConfig)
    } else {
      await processImage(file, model, detectionConfig, galleryOptions, snapshotConfig)
    }
  }

  const handleProcessVideo = async (file: File, model: string, galleryOptions?: any) => {
    await processVideo(file, model, detectionConfig, galleryOptions)
  }

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false)
    sessionStorage.setItem('charly-intro-seen', 'true')
  }, [])

  const sensitivityLabel = sensitivity <= 3 ? 'LOW' : sensitivity <= 6 ? 'MED' : sensitivity <= 8 ? 'HIGH' : 'MAX'

  return (
    <div className="min-h-screen bg-surface-primary">
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      <div
        className="container mx-auto px-4 py-6 transition-opacity duration-500"
        style={{ opacity: showIntro ? 0 : 1 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-1">
            <Eye className="w-8 h-8 text-accent animate-glow-pulse" style={{ color: 'var(--accent)' }} />
            <h1
              className="text-3xl font-heading font-bold tracking-widest glow-text"
              style={{ color: 'var(--accent)' }}
            >
              THE CHARLY ALL-SEEING EYE
            </h1>
            <Eye className="w-8 h-8 text-accent animate-glow-pulse" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">
            Advanced Object Detection System
          </p>
        </div>

        {/* Toolbar */}
        <div className="max-w-6xl mx-auto bg-surface-primary border border-surface-border p-3 mb-4" style={{ borderRadius: '3px' }}>
          {/* Row 1: Tabs + Theme + Help */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex bg-surface-secondary p-0.5" style={{ borderRadius: '3px' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                    activeTab === id
                      ? 'bg-accent-muted text-accent border-accent glow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={{
                    borderRadius: '2px',
                    color: activeTab === id ? 'var(--accent)' : undefined,
                    backgroundColor: activeTab === id ? 'var(--accent-muted)' : undefined,
                    border: activeTab === id ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Selector */}
              <div className="flex items-center gap-1.5">
                {THEMES.map(({ id, label, color }) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className="w-5 h-5 transition-all"
                    style={{
                      backgroundColor: theme === id ? color : 'transparent',
                      border: `2px solid ${color}`,
                      borderRadius: '2px',
                      boxShadow: theme === id ? `0 0 8px ${color}40` : 'none',
                      opacity: theme === id ? 1 : 0.4,
                    }}
                    title={label}
                  />
                ))}
              </div>

              <div className="w-px h-5 bg-surface-border" />

              {/* Help */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1.5 transition-colors ${showHelp ? 'text-accent' : 'text-gray-600 hover:text-gray-400'}`}
                style={{ borderRadius: '2px', color: showHelp ? 'var(--accent)' : undefined }}
                title="Show help"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Model + Sensitivity + Quality */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Model */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-body">Model</span>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="px-3 py-1.5 text-sm font-mono bg-surface-secondary border border-surface-border text-gray-300 focus:border-accent cursor-pointer"
                style={{ borderRadius: '3px' }}
                title={MODEL_DESCRIPTIONS[selectedModel] || ''}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="h-5 w-px bg-surface-border" />

            {/* Sensitivity */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-body">Detect</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600 w-7 text-right font-mono">FEW</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="w-24"
                  title={`Detection sensitivity: ${sensitivityLabel} (${sensitivity}/10)`}
                />
                <span className="text-xs text-gray-600 w-7 font-mono">ALL</span>
              </div>
              <span
                className="text-xs font-mono px-1.5 py-0.5"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'var(--accent-muted)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '2px',
                }}
              >
                {sensitivityLabel}
              </span>
            </div>

            <div className="h-5 w-px bg-surface-border" />

            {/* Quality */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-body">Quality</span>
              <div className="flex bg-surface-secondary p-0.5" style={{ borderRadius: '3px' }}>
                {([
                  { id: 'fast' as QualityLevel, label: 'FAST', icon: Zap },
                  { id: 'balanced' as QualityLevel, label: 'BAL', icon: Scale },
                  { id: 'quality' as QualityLevel, label: 'HD', icon: Sparkles },
                ]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setQuality(id)}
                    title={QUALITY_INFO[id]}
                    className={`flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-all ${
                      quality === id ? '' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    style={{
                      borderRadius: '2px',
                      color: quality === id ? 'var(--accent)' : undefined,
                      backgroundColor: quality === id ? 'var(--accent-muted)' : undefined,
                      border: quality === id ? '1px solid var(--accent-border)' : '1px solid transparent',
                    }}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-surface-border" />

            {/* Snapshot Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-body">Snap</span>
              <button
                onClick={() => setSnapshotConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{
                  borderRadius: '2px',
                  color: snapshotConfig.enabled ? 'var(--accent)' : undefined,
                  backgroundColor: snapshotConfig.enabled ? 'var(--accent-muted)' : undefined,
                  border: snapshotConfig.enabled ? '1px solid var(--accent-border)' : '1px solid transparent',
                }}
              >
                <Crop className="w-3 h-3 mr-1" />
                {snapshotConfig.enabled ? 'ON' : 'OFF'}
              </button>
              {snapshotConfig.enabled && (
                <input
                  type="text"
                  placeholder="all classes"
                  value={snapshotConfig.classes.join(', ')}
                  onChange={(e) => {
                    const classes = e.target.value
                      .split(',')
                      .map(c => c.trim())
                      .filter(c => c.length > 0)
                    setSnapshotConfig(prev => ({ ...prev, classes }))
                  }}
                  className="px-2 py-1 text-xs font-mono bg-surface-secondary border border-surface-border text-gray-300 w-32"
                  style={{ borderRadius: '3px' }}
                  title="Comma-separated class names (e.g., car, person). Leave empty for all."
                />
              )}
            </div>
          </div>

          {/* Help panel */}
          {showHelp && (
            <div
              className="mt-3 pt-3 border-t border-surface-border text-xs text-gray-400 space-y-2 font-mono"
            >
              <div><span style={{ color: 'var(--accent)' }}>MODEL:</span> Smaller models (Nano) are faster for video. Larger models (Large) detect better but slower.</div>
              <div><span style={{ color: 'var(--accent)' }}>DETECT (FEW/ALL):</span> How many objects to find. "Few" only shows objects the AI is very sure about. "All" shows everything including uncertain detections.</div>
              <div><span style={{ color: 'var(--accent)' }}>QUALITY:</span> Image resolution sent to the AI. "Fast" = quick but misses small objects. "HD" = finds distant objects but slower processing.</div>
              <div className="text-gray-600">TIP: For video, use Nano model + Fast quality for smooth real-time. For photos, use Large model + HD for best results.</div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'gallery' ? (
            <Gallery />
          ) : activeTab === 'video' ? (
            <VideoPlayer
              selectedModel={selectedModel}
              detectionConfig={detectionConfig}
              snapshotConfig={snapshotConfig}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {activeTab === 'webcam' ? (
                  <WebcamStream
                    selectedModel={selectedModel}
                    onDetection={handleProcessImage}
                    isProcessing={isProcessing}
                  />
                ) : (
                  <FileUpload
                    onImageUpload={handleProcessImage}
                    onVideoUpload={handleProcessVideo}
                    selectedModel={selectedModel}
                    isProcessing={isProcessing}
                  />
                )}
              </div>
              <div>
                <DetectionResult
                  detections={detections}
                  processingTime={processingTime}
                  error={error}
                  isProcessing={isProcessing}
                  resultImageUrl={resultImageUrl}
                  resultVideoUrl={resultVideoUrl}
                  isVideoReady={isVideoReady}
                />
                {snapshotConfig.enabled && snapshots.length > 0 && (
                  <SnapshotGallery
                    snapshots={snapshots}
                    onClear={clearSnapshots}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-gray-600 text-xs font-mono uppercase tracking-wider">
          <p>Built by Centurion Carlos // React + TypeScript + FastAPI + YOLO</p>
        </footer>
      </div>
    </div>
  )
}

export default App
