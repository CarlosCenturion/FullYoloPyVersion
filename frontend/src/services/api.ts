import axios, { AxiosResponse } from 'axios'
import { ModelInfo, DetectionResult, ApiError, DetectionConfig, SnapshotConfig } from '../types'

interface GalleryOptions {
  saveToGallery: boolean
  title?: string
  description?: string
  projectId?: string
  tags?: string[]
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
})

// Request interceptor for adding headers
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 413) {
      throw new Error('File too large. Please choose a smaller file.')
    }
    if (error.response?.status === 400) {
      const apiError = error.response.data as ApiError
      throw new Error(apiError.detail || 'Bad request')
    }
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.')
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.')
    }
    throw new Error(error.message || 'Network error')
  }
)

export const detectionApi = {
  // Get available models
  getModels: async (): Promise<ModelInfo[]> => {
    const response: AxiosResponse<ModelInfo[]> = await api.get('/api/models')
    return response.data
  },

  // Detect objects in image
  detectImage: async (file: File, model: string, config?: DetectionConfig, galleryOptions?: GalleryOptions, snapshotConfig?: SnapshotConfig): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    // Add config parameters if provided
    if (config) {
      formData.append('confidence', config.confidence.toString())
      formData.append('iou', config.iou.toString())
      formData.append('max_det', config.maxDetections.toString())
      formData.append('imgsz', config.imageSize.toString())
    }

    // Add gallery options if provided
    if (galleryOptions) {
      formData.append('save_to_gallery', galleryOptions.saveToGallery.toString())
      if (galleryOptions.title) {
        formData.append('gallery_title', galleryOptions.title)
      }
      if (galleryOptions.description) {
        formData.append('gallery_description', galleryOptions.description)
      }
      if (galleryOptions.projectId) {
        formData.append('gallery_project_id', galleryOptions.projectId)
      }
      if (galleryOptions.tags && galleryOptions.tags.length > 0) {
        formData.append('gallery_tags', galleryOptions.tags.join(','))
      }
    }

    // Add snapshot config if provided
    if (snapshotConfig?.enabled) {
      formData.append('snapshot_enabled', 'true')
      if (snapshotConfig.classes.length > 0) {
        formData.append('snapshot_classes', snapshotConfig.classes.join(','))
      }
    }

    const response: AxiosResponse<DetectionResult> = await api.post(
      '/api/detect/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Detect objects in video
  detectVideo: async (file: File, model: string, config?: DetectionConfig, galleryOptions?: GalleryOptions): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    // Add config parameters if provided
    if (config) {
      formData.append('confidence', config.confidence.toString())
      formData.append('iou', config.iou.toString())
      formData.append('max_det', config.maxDetections.toString())
      formData.append('imgsz', config.imageSize.toString())
    }

    // Add gallery options if provided
    if (galleryOptions) {
      formData.append('save_to_gallery', galleryOptions.saveToGallery.toString())
      if (galleryOptions.title) {
        formData.append('gallery_title', galleryOptions.title)
      }
      if (galleryOptions.description) {
        formData.append('gallery_description', galleryOptions.description)
      }
      if (galleryOptions.projectId) {
        formData.append('gallery_project_id', galleryOptions.projectId)
      }
      if (galleryOptions.tags && galleryOptions.tags.length > 0) {
        formData.append('gallery_tags', galleryOptions.tags.join(','))
      }
    }

    const response: AxiosResponse<DetectionResult> = await api.post(
      '/api/detect/video',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Detect and track objects in an image frame (ByteTrack)
  detectWithTracking: async (file: File, model: string, config?: DetectionConfig, snapshotConfig?: SnapshotConfig): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

    if (config) {
      formData.append('confidence', config.confidence.toString())
      formData.append('iou', config.iou.toString())
      formData.append('max_det', config.maxDetections.toString())
      formData.append('imgsz', config.imageSize.toString())
    }

    // Add snapshot config if provided
    if (snapshotConfig?.enabled) {
      formData.append('snapshot_enabled', 'true')
      if (snapshotConfig.classes.length > 0) {
        formData.append('snapshot_classes', snapshotConfig.classes.join(','))
      }
    }

    const response: AxiosResponse<DetectionResult> = await api.post(
      '/api/detect/track',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Reset ByteTrack tracker state
  resetTracking: async (model: string): Promise<void> => {
    const formData = new FormData()
    formData.append('model', model)
    await api.post('/api/detect/track/reset', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Clear all snapshots from disk
  clearSnapshots: async (): Promise<{ success: boolean; deleted: number }> => {
    const response = await api.delete('/api/snapshots')
    return response.data
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

export default api
