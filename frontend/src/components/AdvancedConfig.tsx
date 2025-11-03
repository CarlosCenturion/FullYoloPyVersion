import React, { useState, useEffect } from 'react'
import { Settings, Save, RotateCcw, Zap, Target, Layers, AlertCircle, Check } from 'lucide-react'
import { DetectionConfig, DetectionPreset } from '../types'

interface AdvancedConfigProps {
  config: DetectionConfig
  onConfigChange: (config: DetectionConfig) => void
  isProcessing?: boolean
}

// Default presets
const DEFAULT_PRESETS: DetectionPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good balance between speed and accuracy',
    config: {
      confidence: 0.25,
      iou: 0.45,
      maxDetections: 300,
      imageSize: 640,
    }
  },
  {
    id: 'high-precision',
    name: 'High Precision',
    description: 'Maximum accuracy, fewer false positives',
    config: {
      confidence: 0.50,
      iou: 0.50,
      maxDetections: 100,
      imageSize: 1280,
    }
  },
  {
    id: 'fast',
    name: 'Fast',
    description: 'Optimized for speed, good for real-time',
    config: {
      confidence: 0.30,
      iou: 0.40,
      maxDetections: 200,
      imageSize: 320,
    }
  },
  {
    id: 'high-recall',
    name: 'High Recall',
    description: 'Detect more objects, may include false positives',
    config: {
      confidence: 0.15,
      iou: 0.35,
      maxDetections: 500,
      imageSize: 640,
    }
  }
]

const AdvancedConfig: React.FC<AdvancedConfigProps> = ({
  config,
  onConfigChange,
  isProcessing = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localConfig, setLocalConfig] = useState<DetectionConfig>(config)
  const [customPresets, setCustomPresets] = useState<DetectionPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [savedNotification, setSavedNotification] = useState(false)

  // Load custom presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('yolo-custom-presets')
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load custom presets:', e)
      }
    }
  }, [])

  // Update local config when prop changes
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleConfigChange = (key: keyof DetectionConfig, value: number) => {
    const newConfig = { ...localConfig, [key]: value }
    setLocalConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handlePresetSelect = (preset: DetectionPreset) => {
    setLocalConfig(preset.config)
    onConfigChange(preset.config)
  }

  const handleResetToDefault = () => {
    const defaultConfig = DEFAULT_PRESETS[0].config
    setLocalConfig(defaultConfig)
    onConfigChange(defaultConfig)
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return

    const newPreset: DetectionPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: 'Custom configuration',
      config: { ...localConfig }
    }

    const updatedPresets = [...customPresets, newPreset]
    setCustomPresets(updatedPresets)
    localStorage.setItem('yolo-custom-presets', JSON.stringify(updatedPresets))

    setPresetName('')
    setShowSavePreset(false)
    setSavedNotification(true)
    setTimeout(() => setSavedNotification(false), 3000)
  }

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== presetId)
    setCustomPresets(updatedPresets)
    localStorage.setItem('yolo-custom-presets', JSON.stringify(updatedPresets))
  }

  const allPresets = [...DEFAULT_PRESETS, ...customPresets]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Advanced Detection Settings</h2>
        </div>
        <button
          className="text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isProcessing}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Saved Notification */}
      {savedNotification && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <Check className="w-4 h-4 text-green-600 mr-2" />
          <span className="text-sm text-green-700">Preset saved successfully!</span>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allPresets.map((preset) => (
                <div key={preset.id} className="relative">
                  <button
                    onClick={() => handlePresetSelect(preset)}
                    disabled={isProcessing}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      JSON.stringify(localConfig) === JSON.stringify(preset.config)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                      </div>
                      {preset.id.startsWith('custom-') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePreset(preset.id)
                          }}
                          className="text-red-500 hover:text-red-700 text-xs ml-2"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Parameter Controls */}
          <div className="space-y-4">
            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Target className="w-4 h-4 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    Confidence Threshold
                  </label>
                </div>
                <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {localConfig.confidence.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={localConfig.confidence}
                onChange={(e) => handleConfigChange('confidence', parseFloat(e.target.value))}
                disabled={isProcessing}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <p className="text-xs text-gray-500">
                Higher values = fewer detections but more accurate. Lower values = more detections but may include false positives.
              </p>
            </div>

            {/* IOU Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Layers className="w-4 h-4 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    IOU Threshold (NMS)
                  </label>
                </div>
                <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {localConfig.iou.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.70"
                step="0.05"
                value={localConfig.iou}
                onChange={(e) => handleConfigChange('iou', parseFloat(e.target.value))}
                disabled={isProcessing}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <p className="text-xs text-gray-500">
                Controls overlap tolerance in Non-Maximum Suppression. Higher values = more overlapping boxes kept.
              </p>
            </div>

            {/* Max Detections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    Max Detections
                  </label>
                </div>
                <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {localConfig.maxDetections}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={localConfig.maxDetections}
                onChange={(e) => handleConfigChange('maxDetections', parseInt(e.target.value))}
                disabled={isProcessing}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <p className="text-xs text-gray-500">
                Maximum number of objects to detect in a single image. Higher values may impact performance.
              </p>
            </div>

            {/* Image Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Input Image Size
                </label>
                <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {localConfig.imageSize}px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[320, 640, 1280].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleConfigChange('imageSize', size)}
                    disabled={isProcessing}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      localConfig.imageSize === size
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Larger sizes = better accuracy but slower. Smaller sizes = faster but less accurate.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowSavePreset(!showSavePreset)}
              disabled={isProcessing}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Preset
            </button>
            <button
              onClick={handleResetToDefault}
              disabled={isProcessing}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </button>
          </div>

          {/* Save Preset Form */}
          {showSavePreset && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Save Current Configuration</h4>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset()
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false)
                    setPresetName('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Configuration Tips:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Use <strong>Balanced</strong> preset for general purpose detection</li>
                  <li>• Use <strong>High Precision</strong> when accuracy is critical</li>
                  <li>• Use <strong>Fast</strong> for real-time webcam detection</li>
                  <li>• Use <strong>High Recall</strong> to find as many objects as possible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedConfig
