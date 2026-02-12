import React, { useRef, useState, useEffect } from 'react'
import { Upload, Image, Video, X, AlertCircle } from 'lucide-react'
import { galleryApi } from '../services/galleryApi'
import { Project } from '../types'

interface FileUploadProps {
  onImageUpload: (file: File, model: string, galleryOptions?: GalleryOptions) => Promise<void>
  onVideoUpload: (file: File, model: string, galleryOptions?: GalleryOptions) => Promise<void>
  selectedModel: string
  isProcessing: boolean
}

interface GalleryOptions {
  saveToGallery: boolean
  title?: string
  description?: string
  projectId?: string
  tags?: string[]
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
  const [projects, setProjects] = useState<Project[]>([])
  const [galleryOptions, setGalleryOptions] = useState<GalleryOptions>({
    saveToGallery: false,
    title: '',
    description: '',
    projectId: '',
    tags: []
  })
  const [tagsInput, setTagsInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const projectsData = await galleryApi.getProjects()
      setProjects(projectsData)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const acceptedTypes = {
    image: ['image/jpeg', 'image/png', 'image/jpg'],
    video: ['video/mp4', 'video/avi', 'video/mov']
  }

  const validateFile = (file: File): string | null => {
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

      const finalGalleryOptions = galleryOptions.saveToGallery ? {
        ...galleryOptions,
        title: galleryOptions.title || selectedFile.name,
        tags: tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : []
      } : undefined

      if (isImage) {
        await onImageUpload(selectedFile, selectedModel, finalGalleryOptions)
      } else if (isVideo) {
        await onVideoUpload(selectedFile, selectedModel, finalGalleryOptions)
      }

      // Clear selection after successful processing
      setSelectedFile(null)
      setError(null)
      setGalleryOptions({
        saveToGallery: false,
        title: '',
        description: '',
        projectId: '',
        tags: []
      })
      setTagsInput('')
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
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider font-body">Upload Files</h2>

      {/* File Selection Area */}
      <div
        className={`relative border-2 border-dashed p-8 text-center transition-all ${
          dragActive
            ? 'border-accent bg-accent-muted'
            : selectedFile
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-surface-border hover:border-gray-500'
        }`}
        style={{
          borderRadius: '3px',
          borderColor: dragActive ? 'var(--accent)' : undefined,
          backgroundColor: dragActive ? 'var(--accent-muted)' : undefined,
        }}
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
                <Image className="w-12 h-12" style={{ color: 'var(--accent)' }} />
              ) : (
                <Video className="w-12 h-12" style={{ color: 'var(--accent)' }} />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-200 truncate font-mono">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <button
              onClick={clearSelection}
              className="inline-flex items-center px-3 py-1 text-xs text-gray-400 hover:text-gray-200 uppercase tracking-wider font-body"
              disabled={isProcessing}
            >
              <X className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-600 mx-auto" />
            <div>
              <p className="text-base font-semibold text-gray-300 font-body uppercase tracking-wider">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                JPEG, PNG, MP4, AVI, MOV
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Options */}
      {selectedFile && (
        <div className="mt-4 bg-surface-secondary border border-surface-border p-4" style={{ borderRadius: '3px' }}>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="saveToGallery"
              checked={galleryOptions.saveToGallery}
              onChange={(e) => setGalleryOptions(prev => ({ ...prev, saveToGallery: e.target.checked }))}
              className="h-4 w-4 rounded-none"
            />
            <label htmlFor="saveToGallery" className="ml-2 text-xs font-semibold text-gray-300 uppercase tracking-wider font-body">
              Save to Gallery
            </label>
          </div>

          {galleryOptions.saveToGallery && (
            <div className="space-y-3">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={galleryOptions.title}
                  onChange={(e) => setGalleryOptions(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={selectedFile.name}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  value={galleryOptions.description}
                  onChange={(e) => setGalleryOptions(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Project (optional)</label>
                <select
                  value={galleryOptions.projectId}
                  onChange={(e) => setGalleryOptions(prev => ({ ...prev, projectId: e.target.value }))}
                  className="input"
                >
                  <option value="">No project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., person, outdoor, test"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 p-3" style={{ borderRadius: '3px' }}>
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
            <span className="text-xs text-red-300 font-mono">{error}</span>
          </div>
        </div>
      )}

      {/* Process Button */}
      <div className="mt-4">
        <button
          onClick={handleProcess}
          disabled={!selectedFile || isProcessing || !!error}
          className="w-full btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current/30 mr-2" style={{ borderTopColor: 'currentColor', borderRadius: '2px' }}></div>
              PROCESSING...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              PROCESS FILE
            </>
          )}
        </button>
      </div>

      {/* File Type Info */}
      <div className="mt-4 text-xs text-gray-600 font-mono uppercase tracking-wider">
        <p className="font-semibold mb-1" style={{ color: 'var(--accent)' }}>Supported formats:</p>
        <p>Images: JPEG, PNG</p>
        <p>Videos: MP4, AVI, MOV</p>
        <p>No file size limit (local mode)</p>
      </div>
    </div>
  )
}

export default FileUpload
