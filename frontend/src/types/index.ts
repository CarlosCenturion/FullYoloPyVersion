export interface Detection {
  class: string
  confidence: number
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
  track_id?: number // ByteTrack persistent ID (only from /detect/track)
}

export interface ModelInfo {
  id: string
  name: string
  size: string
  description: string
  filename: string
}

export interface Snapshot {
  snapshot_url: string
  class: string
  confidence: number
  bbox: [number, number, number, number]
  track_id?: number
  timestamp: number
}

export interface SnapshotConfig {
  enabled: boolean
  classes: string[]   // empty array = all classes
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
  snapshots?: Snapshot[]
}

export interface ApiError {
  detail: string
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error'

export interface DetectionConfig {
  confidence: number          // Confidence threshold (0.0 - 1.0)
  iou: number                // IOU threshold for NMS (0.0 - 1.0)
  maxDetections: number      // Maximum number of detections
  imageSize: number          // Input image size (320, 640, 1280)
  classes?: number[]         // Filter specific classes
}

export interface DetectionPreset {
  id: string
  name: string
  description: string
  config: DetectionConfig
}

// Gallery and Projects types
export interface GalleryItem {
  id: string
  project_id?: string
  title: string
  description?: string
  file_type: 'image' | 'video'
  original_filename: string
  processed_filename: string
  thumbnail_url?: string
  model_used: string
  detection_config: DetectionConfig
  detections: Detection[]
  processing_time: number
  file_size: number
  created_at: string
  updated_at: string
  tags: string[]
  is_favorite: boolean
}

export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  created_at: string
  updated_at: string
  item_count: number
  total_detections: number
  tags: string[]
}

export interface GalleryFilters {
  search?: string
  project_id?: string
  file_type?: 'image' | 'video'
  model_used?: string
  tags?: string[]
  date_from?: string
  date_to?: string
  is_favorite?: boolean
  min_confidence?: number
  max_detections?: number
}

export interface GalleryStats {
  total_items: number
  total_projects: number
  total_detections: number
  avg_processing_time: number
  most_used_model: string
  favorite_items: number
  items_by_type: {
    image: number
    video: number
  }
  items_by_model: Record<string, number>
  recent_activity: {
    date: string
    count: number
  }[]
}

export interface CreateProjectRequest {
  name: string
  description?: string
  color?: string
  tags?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  color?: string
  tags?: string[]
}

export interface CreateGalleryItemRequest {
  project_id?: string
  title: string
  description?: string
  tags?: string[]
  save_to_gallery: boolean
}