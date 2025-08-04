import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BookmarkedLocation, SearchHistoryItem, MapLocation } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local Storage utilities
export const storage = {
  // Bookmarks
  getBookmarks(): BookmarkedLocation[] {
    if (typeof window === 'undefined') return [];
    try {
      const bookmarks = localStorage.getItem('nyc-parking-bookmarks');
      return bookmarks ? JSON.parse(bookmarks) : [];
    } catch {
      return [];
    }
  },

  saveBookmark(location: Omit<BookmarkedLocation, 'id' | 'created_at'>): void {
    if (typeof window === 'undefined') return;
    const bookmarks = this.getBookmarks();
    const newBookmark: BookmarkedLocation = {
      ...location,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    bookmarks.push(newBookmark);
    localStorage.setItem('nyc-parking-bookmarks', JSON.stringify(bookmarks));
  },

  removeBookmark(id: string): void {
    if (typeof window === 'undefined') return;
    const bookmarks = this.getBookmarks().filter(b => b.id !== id);
    localStorage.setItem('nyc-parking-bookmarks', JSON.stringify(bookmarks));
  },

  // Search History
  getSearchHistory(): SearchHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const history = localStorage.getItem('nyc-parking-search-history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  },

  addToSearchHistory(query: string, location: MapLocation, type: 'address' | 'coordinates'): void {
    if (typeof window === 'undefined') return;
    const history = this.getSearchHistory();
    const newItem: SearchHistoryItem = {
      id: crypto.randomUUID(),
      query,
      location,
      timestamp: new Date().toISOString(),
      type,
    };
    
    // Remove duplicates and keep only the latest 20 items
    const filteredHistory = history.filter(item => item.query !== query);
    filteredHistory.unshift(newItem);
    const limitedHistory = filteredHistory.slice(0, 20);
    
    localStorage.setItem('nyc-parking-search-history', JSON.stringify(limitedHistory));
  },

  clearSearchHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('nyc-parking-search-history');
  },

  // Theme
  getTheme(): 'light' | 'dark' | 'system' {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('nyc-parking-theme') as 'light' | 'dark' | 'system') || 'system';
  },

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nyc-parking-theme', theme);
  },
};

// Date and time utilities
export const dateUtils = {
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  isRecent(dateString: string, hoursThreshold: number = 24): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours <= hoursThreshold;
  },

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
};

// Validation utilities
export const validation = {
  isValidLatitude(lat: string | number): boolean {
    const num = typeof lat === 'string' ? parseFloat(lat) : lat;
    return !isNaN(num) && num >= -90 && num <= 90;
  },

  isValidLongitude(lon: string | number): boolean {
    const num = typeof lon === 'string' ? parseFloat(lon) : lon;
    return !isNaN(num) && num >= -180 && num <= 180;
  },

  isValidRadius(radius: string | number): boolean {
    const num = typeof radius === 'string' ? parseFloat(radius) : radius;
    return !isNaN(num) && num > 0 && num <= 5000; // Max 5km radius
  },

  isValidYear(year: string | number): boolean {
    const num = typeof year === 'string' ? parseInt(year) : year;
    const currentYear = new Date().getFullYear();
    return !isNaN(num) && num >= 2018 && num <= currentYear;
  },

  isValidAddress(address: string): boolean {
    return address.trim().length >= 3;
  },
};

// Export utilities
export const exportUtils = {
  downloadJSON(data: unknown, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadCSV(data: Record<string, unknown>[], filename: string): void {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    const csvString = [headers, ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// URL utilities
export const urlUtils = {
  createShareableURL(location: MapLocation, type: 'parking-signs' | 'meter-rates' = 'parking-signs'): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      lat: location.latitude.toString(),
      lon: location.longitude.toString(),
      ...(location.address && { address: location.address }),
    });
    
    return `${baseUrl}/${type}?${params.toString()}`;
  },

  parseLocationFromURL(): MapLocation | null {
    if (typeof window === 'undefined') return null;
    
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lon = params.get('lon');
    const address = params.get('address');
    
    if (lat && lon && validation.isValidLatitude(lat) && validation.isValidLongitude(lon)) {
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        address: address || undefined,
      };
    }
    
    return null;
  },
};

// Error handling utilities
export const errorUtils = {
  getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unexpected error occurred';
  },

  isNetworkError(error: unknown): boolean {
    return error instanceof Error && (
      error.message.includes('Network Error') ||
      error.message.includes('fetch') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout')
    );
  },

  isApiError(error: unknown): error is { status: number; message: string; code: string } {
    return (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      'message' in error &&
      'code' in error
    );
  },
};

// Performance utilities
export const performanceUtils = {
  debounce<T extends (...args: never[]) => unknown>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  throttle<T extends (...args: never[]) => unknown>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
};

// Constants
export const constants = {
  NYC_CENTER: { latitude: 40.7128, longitude: -74.0060 },
  DEFAULT_RADIUS: 500, // meters
  MAX_RADIUS: 5000, // meters
  SEARCH_DEBOUNCE_MS: 300,
  API_TIMEOUT_MS: 10000,
  TOAST_DURATION_MS: 4000,
  MAP_ZOOM: {
    CITY: 10,
    NEIGHBORHOOD: 14,
    STREET: 16,
    BUILDING: 18,
  },
};