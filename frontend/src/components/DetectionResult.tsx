import React from 'react'
import { Target, Clock, AlertCircle, CheckCircle, Play } from 'lucide-react'
import { Detection } from '../types'

// Emoji mapping for common YOLO objects
const OBJECT_EMOJIS: { [key: string]: string } = {
  // People & Body
  'person': '👤',
  'man': '👨',
  'woman': '👩',
  'child': '👶',
  'baby': '👶',
  'boy': '👦',
  'girl': '👧',
  'hand': '✋',
  'foot': '🦶',
  'face': '😊',

  // Animals
  'dog': '🐕',
  'cat': '🐱',
  'bird': '🐦',
  'horse': '🐎',
  'cow': '🐄',
  'sheep': '🐑',
  'elephant': '🐘',
  'bear': '🐻',
  'zebra': '🦓',
  'giraffe': '🦒',
  'fish': '🐟',
  'turtle': '🐢',
  'frog': '🐸',
  'snake': '🐍',
  'chicken': '🐔',
  'duck': '🦆',
  'owl': '🦉',

  // Vehicles
  'car': '🚗',
  'truck': '🚚',
  'bus': '🚌',
  'motorcycle': '🏍️',
  'bicycle': '🚴',
  'train': '🚂',
  'airplane': '✈️',
  'boat': '⛵',
  'ship': '🚢',

  // Food & Kitchen
  'apple': '🍎',
  'orange': '🍊',
  'banana': '🍌',
  'broccoli': '🥦',
  'carrot': '🥕',
  'pizza': '🍕',
  'cake': '🍰',
  'sandwich': '🥪',
  'hot dog': '🌭',
  'hamburger': '🍔',
  'fries': '🍟',
  'donut': '🍩',
  'cookie': '🍪',
  'bread': '🍞',
  'cheese': '🧀',
  'wine': '🍷',
  'beer': '🍺',

  // Furniture & Household
  'chair': '🪑',
  'table': '🪑',
  'bed': '🛏️',
  'sofa': '🛋️',
  'tv': '📺',
  'laptop': '💻',
  'mouse': '🖱️',
  'keyboard': '⌨️',
  'phone': '📱',
  'book': '📖',
  'clock': '🕐',
  'vase': '🏺',
  'scissors': '✂️',
  'toothbrush': '🪥',
  'spoon': '🥄',
  'fork': '🍴',
  'knife': '🔪',
  'bowl': '🍜',
  'cup': '☕',

  // Sports & Recreation
  'ball': '⚽',
  'baseball': '⚾',
  'basketball': '🏀',
  'football': '🏈',
  'tennis': '🎾',
  'frisbee': '🥏',
  'skateboard': '🛼',
  'surfboard': '🏄',
  'ski': '🎿',
  'snowboard': '🏂',
  'baseball bat': '🏏',
  'baseball glove': '🧤',

  // Nature & Outdoors
  'tree': '🌳',
  'flower': '🌸',
  'grass': '🌱',
  'mountain': '⛰️',
  'ocean': '🌊',
  'river': '🌊',
  'beach': '🏖️',
  'cloud': '☁️',
  'sun': '☀️',
  'moon': '🌙',
  'star': '⭐',

  // Buildings & Architecture
  'house': '🏠',
  'building': '🏢',
  'bridge': '🌉',
  'tower': '🗼',
  'statue': '🗽',
  'fountain': '⛲',
  'church': '⛪',
  'mosque': '🕌',
  'synagogue': '🕍',
  'temple': '🛕',

  // Transportation Infrastructure
  'traffic light': '🚦',
  'stop sign': '🛑',
  'parking meter': '🅿️',
  'bench': '🪑',
  'umbrella': '☂️',
  'suitcase': '🧳',

  // Generic Objects
  'bottle': '🍾',
  'glass': '🥃',
  'plate': '🍽️',
  'potted plant': '🪴',
  'teddy bear': '🧸',
  'hair drier': '💇'
}

// Function to get emoji for object class
const getObjectEmoji = (objectClass: string): string => {
  // Try exact match first
  if (OBJECT_EMOJIS[objectClass.toLowerCase()]) {
    return OBJECT_EMOJIS[objectClass.toLowerCase()]
  }

  // Try partial matches for compound names
  const lowerClass = objectClass.toLowerCase()
  for (const [key, emoji] of Object.entries(OBJECT_EMOJIS)) {
    if (lowerClass.includes(key) || key.includes(lowerClass)) {
      return emoji
    }
  }

  // Default emoji for unknown objects
  return '📦'
}

interface DetectionResultProps {
  detections: Detection[]
  processingTime: number | null
  error: string | null
  isProcessing: boolean
  resultImageUrl?: string | null
  resultVideoUrl?: string | null
  isVideoReady?: boolean
}

const DetectionResult: React.FC<DetectionResultProps> = ({
  detections,
  processingTime,
  error,
  isProcessing,
  resultImageUrl,
  resultVideoUrl,
}) => {
  if (isProcessing) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-surface-border mx-auto mb-4" style={{ borderTopColor: 'var(--accent)', borderRadius: '2px' }}></div>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">Processing...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="bg-red-500/10 border border-red-500/30 p-4" style={{ borderRadius: '3px' }}>
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Processing Error</h3>
              <p className="text-sm text-red-300/80 mt-1 font-mono">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (detections.length === 0 && processingTime === null) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2 font-body uppercase tracking-wider">No Results Yet</h3>
          <p className="text-gray-500 text-sm font-mono">
            Upload an image, video, or start your webcam to begin object detection
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider font-body">Detection Results</h2>
        {processingTime !== null && (
          <div className="flex items-center text-xs font-mono" style={{ color: 'var(--accent)' }}>
            <Clock className="w-3.5 h-3.5 mr-1" />
            {processingTime.toFixed(3)}s
          </div>
        )}
      </div>

      {detections.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center mb-4" style={{ color: 'var(--accent)' }}>
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="font-semibold text-sm font-mono uppercase tracking-wider">
              Found {detections.length} object{detections.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {detections.map((detection, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 bg-surface-secondary border border-surface-border"
                style={{ borderRadius: '2px' }}
              >
                <div className="inline-flex items-center">
                  <div className="flex items-center mr-3">
                    <span className="text-lg mr-1">{getObjectEmoji(detection.class)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-200 capitalize text-sm font-body">
                      {detection.class}
                    </span>
                    <div className="text-xs font-mono text-gray-500">
                      CONF: {(detection.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="w-20 h-1.5 bg-surface-tertiary overflow-hidden" style={{ borderRadius: '1px' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${detection.confidence * 100}%`,
                      backgroundColor: 'var(--accent)',
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Play className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm font-mono">
            Video processed successfully. Results will be displayed here.
          </p>
        </div>
      )}

      {/* Display processed image/video */}
      {(resultImageUrl || resultVideoUrl) && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider font-body">Processed Result</h3>
          <div className="bg-surface-secondary border border-surface-border p-4" style={{ borderRadius: '3px' }}>
            {resultImageUrl && (
              <div className="text-center">
                <img
                  src={`http://localhost:8000${resultImageUrl}`}
                  alt="Processed result"
                  className="max-w-full h-auto mx-auto border border-surface-border"
                  style={{ maxHeight: '400px', borderRadius: '2px' }}
                />
                <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-wider">
                  Image processed with object detection bounding boxes
                </p>
              </div>
            )}
            {resultVideoUrl && (
              <div className="text-center">
                <video
                  src={`http://localhost:8000${resultVideoUrl}`}
                  controls
                  className="max-w-full h-auto mx-auto border border-surface-border"
                  style={{ maxHeight: '400px', borderRadius: '2px' }}
                >
                  Your browser does not support the video tag.
                </video>
                <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-wider">
                  Video processed with object detection bounding boxes
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {processingTime !== null && detections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 uppercase tracking-wider">Processing:</span>
              <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>{processingTime.toFixed(3)}s</span>
            </div>
            <div>
              <span className="text-gray-500 uppercase tracking-wider">Objects:</span>
              <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>{detections.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetectionResult
