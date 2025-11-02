import React from 'react'
import { Camera, Upload, Play, Settings } from 'lucide-react'
import ModelSelector from './components/ModelSelector'
import WebcamStream from './components/WebcamStream'
import FileUpload from './components/FileUpload'
import DetectionResult from './components/DetectionResult'
import { useDetection } from './hooks/useDetection'

type TabType = 'webcam' | 'upload'

function App() {
  const [activeTab, setActiveTab] = React.useState<TabType>('webcam')
  const [selectedModel, setSelectedModel] = React.useState('yolov8n')

  const {
    detections,
    processingTime,
    isProcessing,
    error,
    resultImageUrl,
    resultVideoUrl,
    isVideoReady,
    processImage,
    processVideo,
    clearResults
  } = useDetection()

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    clearResults()
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    clearResults()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
           Object Detection by Centurion Carlos
          </h1>
          <p className="text-lg text-gray-600">
            Explore and test YOLO models for real-time object detection
          </p>
        </div>

       

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="grid bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button
                onClick={() => handleTabChange('webcam')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'webcam'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Camera className="w-4 h-4 mr-2" />
                Webcam
              </button>
              <button
                onClick={() => handleTabChange('upload')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              {activeTab === 'webcam' ? (
                <WebcamStream
                  selectedModel={selectedModel}
                  onDetection={processImage}
                  isProcessing={isProcessing}
                />
              ) : (
                <FileUpload
                  onImageUpload={processImage}
                  onVideoUpload={processVideo}
                  selectedModel={selectedModel}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Results Section */}
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
            </div>
          </div>
        </div>

         {/* Model Selector */}
         <div className="mb-8 mt-8">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Built by Centurion Carlos with React, TypeScript, FastAPI, and Ultralytics YOLO</p>
        </footer>
      </div>
    </div>
  )
}

export default App
