import React, { useState } from 'react'
import { Trash2, X, ChevronLeft, ChevronRight, Crop } from 'lucide-react'
import { Snapshot } from '../types'

interface SnapshotGalleryProps {
  snapshots: Snapshot[]
  onClear: () => void
}

const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({ snapshots, onClear }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selected = selectedIndex !== null ? snapshots[selectedIndex] : null

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

      {/* Snapshot Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
        {snapshots.map((snap, index) => (
          <button
            key={`${snap.snapshot_url}-${index}`}
            onClick={() => setSelectedIndex(index)}
            className="group relative bg-surface-secondary border border-surface-border overflow-hidden hover:border-accent transition-colors"
            style={{ borderRadius: '2px', aspectRatio: '1' }}
          >
            <img
              src={`http://localhost:8000${snap.snapshot_url}`}
              alt={snap.class}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {snap.class}
              </span>
              <span className="text-[10px] font-mono text-gray-400 ml-1">
                {(snap.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {snap.track_id !== undefined && (
              <div
                className="absolute top-0 right-0 px-1 py-0.5 text-[9px] font-mono"
                style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}
              >
                #{snap.track_id}
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
            className="relative max-w-lg w-full mx-4 bg-surface-primary border border-surface-border p-4"
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
                style={{ maxHeight: '400px', borderRadius: '2px' }}
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
            </div>

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
