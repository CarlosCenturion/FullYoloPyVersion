import React, { useState, useEffect } from 'react'
import { Brain, Check, AlertCircle } from 'lucide-react'
import { ModelInfo } from '../types'
import { detectionApi } from '../services/api'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelList = await detectionApi.getModels()
        setModels(modelList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600">Loading models...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header - Always visible and clickable */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Brain className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Select YOLO Model</h2>
          {models.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
              {models.find(m => m.id === selectedModel)?.name || 'None'}
            </span>
          )}
        </div>
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              <span className="ml-2 text-gray-600">Loading models...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {selectedModel === model.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary-500" />
                      </div>
                    )}

                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <p className="text-sm text-gray-500">{model.size}</p>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {model.description}
                    </p>

                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-500">
                        {model.filename}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Model Performance Guide:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• <strong>Nano:</strong> Fastest, good for real-time applications</li>
                      <li>• <strong>Small:</strong> Balanced speed and accuracy</li>
                      <li>• <strong>Medium:</strong> Higher accuracy, moderate speed</li>
                      <li>• <strong>Large:</strong> Maximum accuracy, slower processing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ModelSelector
