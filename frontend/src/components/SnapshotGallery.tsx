import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { Trash2, X, ChevronLeft, ChevronRight, Crop, Clock } from 'lucide-react'
import gsap from 'gsap'
import { Snapshot } from '../types'

interface SnapshotGalleryProps {
  snapshots: Snapshot[]
  onClear: () => void
  onSnapshotClick?: (snapshot: Snapshot) => void
  expanded?: boolean
}

const formatVideoTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({ snapshots, onClear, onSnapshotClick, expanded }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  const selected = selectedIndex !== null ? snapshots[selectedIndex] : null

  // Animate new snapshots in with GSAP
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const newCount = snapshots.length - prevCountRef.current
    if (newCount > 0 && prevCountRef.current > 0) {
      // New items are prepended, so they're the first N children
      const children = containerRef.current.children
      const toAnimate = Array.from(children).slice(0, newCount)
      gsap.fromTo(toAnimate, {
        opacity: 0,
        scale: 0.8,
        y: -10,
      }, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.35,
        stagger: 0.04,
        ease: 'back.out(1.4)',
      })
    }
    prevCountRef.current = snapshots.length
  }, [snapshots.length])

  // Reset counter when snapshots are cleared
  useEffect(() => {
    if (snapshots.length === 0) {
      prevCountRef.current = 0
    }
  }, [snapshots.length])

  const navigateNext = () => {
    if (selectedIndex !== null && selectedIndex < snapshots.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const navigatePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleThumbnailClick = useCallback((snap: Snapshot, index: number) => {
    if (onSnapshotClick) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
        setSelectedIndex(index)
      } else {
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null
          onSnapshotClick(snap)
        }, 250)
      }
    } else {
      setSelectedIndex(index)
    }
  }, [onSnapshotClick])

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider font-body">
            Snapshots
          </h2>
          <span
            className="text-xs font-mono px-1.5 py-0.5"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-muted)',
              border: '1px solid var(--accent-border)',
              borderRadius: '2px',
            }}
          >
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-red-400 transition-colors"
          style={{ borderRadius: '2px' }}
          title="Clear all snapshots"
        >
          <Trash2 className="w-3 h-3" />
          CLEAR
        </button>
      </div>

      {/* Snapshot Masonry Grid - preserves original aspect ratio */}
      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-y-auto pr-1"
        style={{
          columnCount: expanded ? 5 : 3,
          columnGap: '8px',
        }}
      >
        {snapshots.map((snap, index) => (
          <button
            key={`${snap.snapshot_url}-${index}`}
            onClick={() => handleThumbnailClick(snap, index)}
            className="group relative bg-surface-secondary border overflow-hidden hover:border-accent transition-colors w-full"
            style={{
              borderRadius: '2px',
              marginBottom: '8px',
              breakInside: 'avoid',
              display: 'inline-block',
              borderColor: snap.face_match ? 'rgba(255, 0, 255, 0.5)' : undefined,
              boxShadow: snap.face_match ? '0 0 6px rgba(255, 0, 255, 0.2)' : undefined,
            }}
            title={onSnapshotClick
              ? `Click: seek to ${snap.videoTime !== undefined ? formatVideoTime(snap.videoTime) : 'position'} | Double-click: enlarge`
              : `Click to enlarge`
            }
          >
            <img
              src={`http://localhost:8000${snap.snapshot_url}`}
              alt={snap.class}
              className="w-full h-auto block"
              loading="lazy"
            />
            {/* Bottom overlay: class + confidence */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {snap.class}
              </span>
              <span className="text-[10px] font-mono text-gray-400 ml-1">
                {(snap.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {/* Video time badge */}
            {snap.videoTime !== undefined && (
              <div
                className="absolute top-0 left-0 flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-mono"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--accent)' }}
              >
                <Clock className="w-2 h-2" />
                @{formatVideoTime(snap.videoTime)}
              </div>
            )}
            {/* Track ID badge */}
            {snap.track_id !== undefined && (
              <div
                className="absolute top-0 right-0 px-1 py-0.5 text-[9px] font-mono"
                style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}
              >
                #{snap.track_id}
              </div>
            )}
            {/* Face match badge */}
            {snap.face_match && (
              <div
                className="absolute bottom-6 right-0 px-1 py-0.5 text-[9px] font-mono font-bold animate-pulse"
                style={{
                  backgroundColor: 'rgba(255, 0, 255, 0.8)',
                  color: '#ffffff',
                  borderRadius: '2px 0 0 0',
                }}
              >
                MATCH {snap.face_similarity ? `${(snap.face_similarity * 100).toFixed(0)}%` : ''}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selected && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className={`relative ${expanded ? 'max-w-2xl' : 'max-w-lg'} w-full mx-4 bg-surface-primary border border-surface-border p-4`}
            style={{ borderRadius: '3px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image */}
            <div className="text-center mb-3">
              <img
                src={`http://localhost:8000${selected.snapshot_url}`}
                alt={selected.class}
                className="max-w-full h-auto mx-auto border border-surface-border"
                style={{ maxHeight: expanded ? '60vh' : '400px', borderRadius: '2px' }}
              />
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-gray-500 uppercase tracking-wider">Class:</span>
                <span className="ml-2 font-semibold capitalize" style={{ color: 'var(--accent)' }}>{selected.class}</span>
              </div>
              <div>
                <span className="text-gray-500 uppercase tracking-wider">Conf:</span>
                <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>{(selected.confidence * 100).toFixed(1)}%</span>
              </div>
              {selected.track_id !== undefined && (
                <div>
                  <span className="text-gray-500 uppercase tracking-wider">Track ID:</span>
                  <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>#{selected.track_id}</span>
                </div>
              )}
              {selected.videoTime !== undefined && (
                <div>
                  <span className="text-gray-500 uppercase tracking-wider">Video @:</span>
                  <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>{formatVideoTime(selected.videoTime)}</span>
                </div>
              )}
              {selected.face_match && (
                <div>
                  <span className="text-gray-500 uppercase tracking-wider">Face:</span>
                  <span className="ml-2 font-semibold" style={{ color: '#ff00ff' }}>
                    MATCH {selected.face_similarity ? `${(selected.face_similarity * 100).toFixed(0)}%` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Seek button in lightbox */}
            {onSnapshotClick && selected.videoTime !== undefined && (
              <button
                onClick={() => {
                  onSnapshotClick(selected)
                  setSelectedIndex(null)
                }}
                className="w-full mt-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'var(--accent-muted)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '3px',
                }}
              >
                Seek to @{formatVideoTime(selected.videoTime)}
              </button>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-3 pt-3 border-t border-surface-border">
              <button
                onClick={navigatePrev}
                disabled={selectedIndex <= 0}
                className="flex items-center gap-1 px-3 py-1 text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                PREV
              </button>
              <span className="text-xs font-mono text-gray-500">
                {selectedIndex + 1} / {snapshots.length}
              </span>
              <button
                onClick={navigateNext}
                disabled={selectedIndex >= snapshots.length - 1}
                className="flex items-center gap-1 px-3 py-1 text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                NEXT
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SnapshotGallery
