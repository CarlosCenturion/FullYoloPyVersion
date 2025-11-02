import React, { useRef, useState } from 'react'
import { Upload, Image, Video, X, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  onImageUpload: (file: File, model: string) => Promise<void>
  onVideoUpload: (file: File, model: string) => Promise<void>
  selectedModel: string
  isProcessing: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({
  onImageUpload,
  onVideoUpload,
  selectedModel,
  isProcessing,
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = {
    image: ['image/jpeg', 'image/png', 'image/jpg'],
    video: ['video/mp4', 'video/avi', 'video/mov']
  }

  const maxFileSize = 50 * 1024 * 1024 // 50MB

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return 'File size must be less than 50MB'
    }

    const isImage = acceptedTypes.image.includes(file.type)
    const isVideo = acceptedTypes.video.includes(file.type)

    if (!isImage && !isVideo) {
      return 'Please select a valid image or video file'
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    try {
      const isImage = acceptedTypes.image.includes(selectedFile.type)
      const isVideo = acceptedTypes.video.includes(selectedFile.type)

      if (isImage) {
        await onImageUpload(selectedFile, selectedModel)
      } else if (isVideo) {
        await onVideoUpload(selectedFile, selectedModel)
      }

      // Clear selection after successful processing
      setSelectedFile(null)
      setError(null)
    } catch (err) {
      // Error is handled by the parent component
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h2>

      {/* File Selection Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.mp4,.avi,.mov"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              {acceptedTypes.image.includes(selectedFile.type) ? (
                <Image className="w-12 h-12 text-green-500" />
              ) : (
                <Video className="w-12 h-12 text-green-500" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <button
              onClick={clearSelection}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-600">
                Supports images (JPG, PNG) and videos (MP4, AVI, MOV) up to 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Process Button */}
      <div className="mt-4">
        <button
          onClick={handleProcess}
          disabled={!selectedFile || isProcessing || !!error}
          className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Process File
            </>
          )}
        </button>
      </div>

      {/* File Type Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p className="font-medium mb-1">Supported formats:</p>
        <p>Images: JPEG, PNG</p>
        <p>Videos: MP4, AVI, MOV</p>
        <p>Maximum file size: 50MB</p>
      </div>
    </div>
  )
}

export default FileUpload
