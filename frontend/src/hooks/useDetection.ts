import { useState, useCallback } from 'react'
import { Detection, DetectionResult, DetectionConfig } from '../types'
import { detectionApi } from '../services/api'

interface UseDetectionReturn {
  detections: Detection[]
  processingTime: number | null
  isProcessing: boolean
  error: string | null
  resultImageUrl: string | null
  resultVideoUrl: string | null
  isVideoReady: boolean
  processImage: (file: File, model: string, config?: DetectionConfig) => Promise<void>
  processVideo: (file: File, model: string, config?: DetectionConfig) => Promise<void>
  clearResults: () => void
}

export const useDetection = (): UseDetectionReturn => {
  const [detections, setDetections] = useState<Detection[]>([])
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  const clearResults = useCallback(() => {
    setDetections([])
    setProcessingTime(null)
    setError(null)
    setResultImageUrl(null)
    setResultVideoUrl(null)
    setIsVideoReady(false)
  }, [])

  const processImage = useCallback(async (file: File, model: string, config?: DetectionConfig) => {
    setIsProcessing(true)
    setError(null)

    try {
      const result: DetectionResult = await detectionApi.detectImage(file, model, config)

      if (result.success) {
        setDetections(result.detections)
        setProcessingTime(result.processing_time)
        setResultImageUrl(result.image_url || null)
        setResultVideoUrl(null)
      } else {
        throw new Error('Detection failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      clearResults()
    } finally {
      setIsProcessing(false)
    }
  }, [clearResults])

  const processVideo = useCallback(async (file: File, model: string, config?: DetectionConfig) => {
    setIsProcessing(true)
    setError(null)

    try {
      const result: DetectionResult = await detectionApi.detectVideo(file, model, config)

      if (result.success) {
        setDetections([]) // Videos don't return per-frame detections
        setProcessingTime(result.processing_time)
        setResultImageUrl(null)

        // Extract filename from video_url
        const videoUrl = result.video_url
        if (videoUrl) {
          const filename = videoUrl.split('/').pop()
          if (filename) {
            // Poll for video readiness
            await pollVideoStatus(filename)
            setResultVideoUrl(videoUrl)
          }
        }
      } else {
        throw new Error('Video processing failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      clearResults()
    } finally {
      setIsProcessing(false)
    }
  }, [clearResults])

  const pollVideoStatus = useCallback(async (filename: string, maxAttempts: number = 30) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:8000/api/video/status/${filename}`)
        const status = await response.json()

        if (status.ready) {
          return // Video is ready
        }

        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.warn(`Failed to check video status (attempt ${attempt + 1}):`, error)
        // Continue polling even if status check fails
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    throw new Error('Video processing timed out')
  }, [])

  return {
    detections,
    processingTime,
    isProcessing,
    error,
    resultImageUrl,
    resultVideoUrl,
    isVideoReady,
    processImage,
    processVideo,
    clearResults,
  }
}
