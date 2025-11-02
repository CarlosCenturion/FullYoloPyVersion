export interface Detection {
  class: string
  confidence: number
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
}

export interface ModelInfo {
  id: string
  name: string
  size: string
  description: string
  filename: string
}

export interface DetectionResult {
  success: boolean
  detections: Detection[]
  image_url?: string
  video_url?: string
  original_filename?: string
  model_used: string
  processing_time: number
  image_size?: string
  total_frames?: number
  processing_fps?: number
}

export interface ApiError {
  detail: string
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'
