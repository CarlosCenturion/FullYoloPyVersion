import axios, { AxiosResponse } from 'axios'
import { ModelInfo, DetectionResult, ApiError } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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
  detectImage: async (file: File, model: string): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

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
  detectVideo: async (file: File, model: string): Promise<DetectionResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', model)

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

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

export default api
