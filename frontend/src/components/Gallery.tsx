import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Heart, Folder, Image as ImageIcon, Video, Calendar } from 'lucide-react';
import { GalleryItem, Project, GalleryFilters, GalleryStats } from '../types';
import { galleryApi } from '../services/galleryApi';

interface GalleryProps {
  className?: string;
}

type ViewMode = 'grid' | 'list';

const Gallery: React.FC<GalleryProps> = ({ className = '' }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<GalleryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadGalleryItems();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [projectsData, statsData] = await Promise.all([
        galleryApi.getProjects(),
        galleryApi.getGalleryStats()
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryItems = async () => {
    try {
      const response = await galleryApi.getGalleryItems(filters);
      setItems(response.items);
    } catch (error) {
      console.error('Failed to load gallery items:', error);
    }
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query || undefined }));
  };

  const handleProjectFilter = (projectId: string) => {
    setSelectedProject(projectId);
    setFilters(prev => ({ ...prev, project_id: projectId || undefined }));
  };

  const handleFavorite = async (itemId: string, isFavorite: boolean) => {
    try {
      await galleryApi.updateGalleryItem(itemId, { is_favorite: !isFavorite });
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, is_favorite: !isFavorite } : item
      ));
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-2 border-surface-border" style={{ borderTopColor: 'var(--accent)', borderRadius: '2px' }}></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-200 font-body uppercase tracking-wider">Gallery</h2>
          <p className="text-gray-500 mt-1 text-xs font-mono uppercase tracking-wider">
            {stats ? `${stats.total_items} items in ${stats.total_projects} projects` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? '' : 'text-gray-600 hover:text-gray-400'}`}
            style={{
              borderRadius: '2px',
              backgroundColor: viewMode === 'grid' ? 'var(--accent-muted)' : undefined,
              color: viewMode === 'grid' ? 'var(--accent)' : undefined,
              border: viewMode === 'grid' ? '1px solid var(--accent-border)' : '1px solid transparent',
            }}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? '' : 'text-gray-600 hover:text-gray-400'}`}
            style={{
              borderRadius: '2px',
              backgroundColor: viewMode === 'list' ? 'var(--accent-muted)' : undefined,
              color: viewMode === 'list' ? 'var(--accent)' : undefined,
              border: viewMode === 'list' ? '1px solid var(--accent-border)' : '1px solid transparent',
            }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface-primary border border-surface-border p-4" style={{ borderRadius: '3px' }}>
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search gallery..."
              className="input pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedProject}
            onChange={(e) => handleProjectFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 transition-colors ${showFilters ? '' : 'text-gray-600 hover:text-gray-400'}`}
            style={{
              borderRadius: '2px',
              backgroundColor: showFilters ? 'var(--accent-muted)' : undefined,
              color: showFilters ? 'var(--accent)' : undefined,
              border: showFilters ? '1px solid var(--accent-border)' : '1px solid transparent',
            }}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="label">File Type</label>
                <select
                  value={filters.file_type || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, file_type: e.target.value as 'image' | 'video' || undefined }))}
                  className="input"
                >
                  <option value="">All Types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              <div>
                <label className="label">Model Used</label>
                <select
                  value={filters.model_used || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, model_used: e.target.value || undefined }))}
                  className="input"
                >
                  <option value="">All Models</option>
                  <option value="yolov8n">YOLOv8 Nano</option>
                  <option value="yolov8s">YOLOv8 Small</option>
                  <option value="yolov8m">YOLOv8 Medium</option>
                  <option value="yolov8l">YOLOv8 Large</option>
                </select>
              </div>

              <div>
                <label className="label">Favorites Only</label>
                <input
                  type="checkbox"
                  checked={filters.is_favorite || false}
                  onChange={(e) => setFilters(prev => ({ ...prev, is_favorite: e.target.checked || undefined }))}
                  className="w-4 h-4 mt-1"
                />
              </div>

              <div>
                <label className="label">Date From</label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-300 mb-2 font-body uppercase tracking-wider">No items found</h3>
          <p className="text-gray-500 text-xs font-mono">Try adjusting your filters or upload some files to get started.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-surface-primary border border-surface-border overflow-hidden hover:border-gray-500 transition-all ${viewMode === 'list' ? 'flex' : ''}`}
              style={{ borderRadius: '3px' }}
            >
              {/* Image/Video Preview */}
              <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-video'}`}>
                {item.file_type === 'video' ? (
                  <video
                    src={item.processed_filename ? `/static/${item.processed_filename}` : undefined}
                    className="w-full h-full object-cover"
                    muted
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                  />
                ) : (
                  <img
                    src={item.processed_filename ? `/static/${item.processed_filename}` : undefined}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Overlay Icons */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  <button
                    onClick={() => handleFavorite(item.id, item.is_favorite)}
                    className={`p-1.5 transition-colors ${item.is_favorite ? 'bg-red-500/80 text-white' : 'bg-black/60 text-gray-400 hover:text-white'}`}
                    style={{ borderRadius: '2px' }}
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* File Type Badge */}
                <div className="absolute top-2 left-2">
                  {item.file_type === 'video' ? (
                    <Video className="w-4 h-4 text-white drop-shadow-lg" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-white drop-shadow-lg" />
                  )}
                </div>
              </div>

              {/* Item Info */}
              <div className={`p-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <h3 className="font-semibold text-gray-200 mb-1 truncate text-sm font-body">{item.title}</h3>

                <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2 font-mono">
                  <div className="flex items-center space-x-1">
                    <Folder className="w-3 h-3" />
                    <span>{getProjectName(item.project_id)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2 font-mono">{item.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5"
                      style={{
                        backgroundColor: 'var(--accent-muted)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                        borderRadius: '2px',
                      }}
                    >
                      {item.model_used}
                    </span>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 bg-surface-tertiary text-gray-400 border border-surface-border"
                      style={{ borderRadius: '2px' }}
                    >
                      {item.detections.length} det
                    </span>
                  </div>

                  {item.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {item.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs text-gray-500 bg-surface-tertiary px-1.5 py-0.5 font-mono"
                          style={{ borderRadius: '2px' }}
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-600 font-mono">+{item.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
