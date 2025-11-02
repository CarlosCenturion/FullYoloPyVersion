import React from 'react'
import { Target, Clock, AlertCircle, CheckCircle, Play } from 'lucide-react'
import { Detection } from '../types'

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (detections.length === 0 && processingTime === null) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
          <p className="text-gray-600">
            Upload an image, video, or start your webcam to begin object detection
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Detection Results</h2>
        {processingTime !== null && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            {processingTime.toFixed(3)}s
          </div>
        )}
      </div>

      {detections.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center text-green-600 mb-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Found {detections.length} object{detections.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {detections.map((detection, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <Target className="w-4 h-4 text-primary-500 mr-3" />
                  <div>
                    <span className="font-medium text-gray-900 capitalize">
                      {detection.class}
                    </span>
                    <div className="text-sm text-gray-600">
                      Confidence: {(detection.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 font-mono">
                  [{detection.bbox.map(coord => coord.toFixed(0)).join(', ')}]
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Play className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            Video processed successfully. Results will be displayed here.
          </p>
        </div>
      )}

      {/* Display processed image/video */}
      {(resultImageUrl || resultVideoUrl) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processed Result</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {resultImageUrl && (
              <div className="text-center">
                <img
                  src={`http://localhost:8000${resultImageUrl}`}
                  alt="Processed result"
                  className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
                  style={{ maxHeight: '400px' }}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Image processed with object detection bounding boxes
                </p>
              </div>
            )}
            {resultVideoUrl && (
              <div className="text-center">
                <video
                  src={`http://localhost:8000${resultVideoUrl}`}
                  controls
                  className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
                <p className="text-sm text-gray-600 mt-2">
                  Video processed with object detection bounding boxes
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {processingTime !== null && detections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Processing Time:</span>
              <span className="ml-2 font-medium">{processingTime.toFixed(3)}s</span>
            </div>
            <div>
              <span className="text-gray-600">Objects Detected:</span>
              <span className="ml-2 font-medium">{detections.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetectionResult
