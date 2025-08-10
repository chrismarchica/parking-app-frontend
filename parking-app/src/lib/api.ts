import axios, { AxiosResponse } from 'axios';
import {
  HealthCheck,
  ParkingSign,
  MeterRate,
  ViolationTrend,
  DataStatus,
  ParkingSignsRequest,
  MeterRateRequest,
  ViolationTrendsRequest,
  ApiError,
} from './types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.details || {},
    };

    console.error('API Response Error:', apiError);
    return Promise.reject(apiError);
  }
);

// API Functions
export const api = {
  // Health Check
  async checkHealth(): Promise<HealthCheck> {
    const response: AxiosResponse<HealthCheck> = await apiClient.get('/health');
    return response.data;
  },

  // Parking Signs
  async getParkingSigns(params: ParkingSignsRequest): Promise<ParkingSign[]> {
    const response: AxiosResponse<any> = await apiClient.get('/parking-signs', {
      params: {
        lat: params.lat,
        lon: params.lon,
        radius: params.radius,
      },
    });

    const raw = response.data;
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.parking_signs)
      ? raw.parking_signs
      : Array.isArray(raw?.signs)
      ? raw.signs
      : [];

    return list.map((item: any, index: number): ParkingSign => {
      const latitude = Number(item.latitude ?? item.lat);
      const longitude = Number(item.longitude ?? item.lon);
      const distance = Number(item.distance ?? item.dist ?? 0);
      const street_name = String(item.street_name ?? item.street ?? '');
      const description = String(
        item.description ??
        (Array.isArray(item.regulations) ? item.regulations.join(' ') : '') ??
        ''
      );

      return {
        id: String(item.id ?? item.sign_id ?? `${latitude},${longitude},${index}`),
        latitude,
        longitude,
        distance,
        description,
        street_name,
        sign_type: item.sign_type,
        regulations: Array.isArray(item.regulations) ? item.regulations : undefined,
        borough: item.borough,
        created_at: item.created_at,
        updated_at: item.updated_at,
      } as ParkingSign;
    });
  },

  // Meter Rates
  async getMeterRate(params: MeterRateRequest): Promise<MeterRate> {
    const response: AxiosResponse<MeterRate> = await apiClient.get('/meter-rate', {
      params: {
        lat: params.lat,
        lon: params.lon,
      },
    });
    return response.data;
  },

  // Violation Trends
  async getViolationTrends(params: ViolationTrendsRequest): Promise<ViolationTrend[]> {
    const response: AxiosResponse<ViolationTrend[]> = await apiClient.get('/violation-trends', {
      params: {
        borough: params.borough,
        year: params.year,
        ...(params.month && { month: params.month }),
      },
    });
    return response.data;
  },

  // Data Status
  async getDataStatus(): Promise<DataStatus> {
    const response: AxiosResponse<DataStatus> = await apiClient.get('/data-status');
    return response.data;
  },
};

// Geocoding API (using a free service)
export const geocoding = {
  async searchAddress(address: string): Promise<{ lat: number; lon: number; display_name: string }[]> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address + ', New York, NY'
        )}&limit=5&countrycodes=us`
      );
      
      return response.data.map((item: { lat: string; lon: string; display_name: string }) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name,
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  },

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      
      return response.data.display_name || `${lat}, ${lon}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat}, ${lon}`;
    }
  },
};

// Utility functions for API data
export const apiUtils = {
  // Validate coordinates
  isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  },

  // Check if coordinates are within NYC bounds (approximate)
  isWithinNYC(lat: number, lon: number): boolean {
    const nycBounds = {
      north: 40.9176,
      south: 40.4774,
      east: -73.7004,
      west: -74.2591,
    };

    return (
      lat >= nycBounds.south &&
      lat <= nycBounds.north &&
      lon >= nycBounds.west &&
      lon <= nycBounds.east
    );
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  // Format distance for display
  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  },

  // Format parking rate for display
  formatRate(rate: string): string {
    const numericRate = parseFloat(rate);
    if (isNaN(numericRate)) return rate;
    return `$${numericRate.toFixed(2)}`;
  },

  // Get borough from coordinates (simplified mapping)
  getBoroughFromCoordinates(lat: number, lon: number): string {
    // Simplified borough boundaries - in a real app, you'd use a proper GIS service
    if (lat > 40.7589 && lon > -73.9441) return 'manhattan';
    if (lat > 40.6892 && lat <= 40.7394 && lon <= -73.8648) return 'queens';
    if (lat > 40.5706 && lat <= 40.7394 && lon <= -73.8648) return 'brooklyn';
    if (lat > 40.7896 && lon <= -73.8648) return 'bronx';
    if (lat <= 40.5706) return 'staten_island';
    return 'unknown';
  },

  // Sort parking signs by distance
  sortByDistance<T extends { distance: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.distance - b.distance);
  },

  // Filter by radius
  filterByRadius<T extends { distance: number }>(items: T[], maxRadius: number): T[] {
    return items.filter(item => item.distance <= maxRadius);
  },

  // Format date from ISO string to M/D/YYYY format
  formatLastUpdated(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  },

  // Format date range from YYYY-MM-DD to YYYY-MM-DD to YYYY-MM-DD
  formatDateRange(startDate: string, endDate: string): string {
    try {
      // Parse dates and format them consistently
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      return `${formatDate(start)} to ${formatDate(end)}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return `${startDate} to ${endDate}`;
    }
  },
};

// Export types for easy access
export type { ApiError, HealthCheck, ParkingSign, MeterRate, ViolationTrend, DataStatus };