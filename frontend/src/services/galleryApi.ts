import { GalleryItem, Project, GalleryFilters, GalleryStats } from '../types';

const API_BASE = '/api/gallery';

export class GalleryApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request('/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string; color?: string; tags?: string[] }): Promise<Project> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; description?: string; color?: string; tags?: string[] }): Promise<Project> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Gallery Items
  async getGalleryItems(filters: GalleryFilters = {}): Promise<{
    items: GalleryItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const query = params.toString();
    return this.request(`/gallery${query ? `?${query}` : ''}`);
  }

  async getGalleryItem(id: string): Promise<GalleryItem> {
    return this.request(`/gallery/${id}`);
  }

  async createGalleryItem(data: any): Promise<GalleryItem> {
    return this.request('/gallery', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGalleryItem(id: string, data: {
    title?: string;
    description?: string;
    project_id?: string;
    tags?: string[];
    is_favorite?: boolean;
  }): Promise<GalleryItem> {
    return this.request(`/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGalleryItem(id: string): Promise<void> {
    await this.request(`/gallery/${id}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getGalleryStats(): Promise<GalleryStats> {
    return this.request('/gallery/stats');
  }
}

export const galleryApi = new GalleryApiService();
