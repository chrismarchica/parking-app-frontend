import {
  HealthCheck,
  ParkingSign,
  MeterRate,
  ViolationTrend,
  Violation,
  DataStatus,
  ParkingSignsRequest,
  MeterRateRequest,
  ViolationTrendsRequest,
  ViolationsRequest,
} from './types';
import { loadParkingSignsRaw } from './data/parkingSignsProvider';
import { loadMeterZonesRaw } from './data/meterRatesProvider';
import { loadViolationTrendsSample } from './data/violationTrendsProvider';

// Client-only API shim (no Python backend)
export const api = {
  async checkHealth(): Promise<HealthCheck> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { api: 'online' },
    } as HealthCheck;
  },

  async getParkingSigns(params: ParkingSignsRequest): Promise<ParkingSign[]> {
    const raw = await loadParkingSignsRaw();
    const list = raw
      .map((s) => ({
        id: s.sign_id,
        latitude: s.latitude,
        longitude: s.longitude,
        distance: 0,
        description: s.sign_description,
        street_name: s.street_name,
        borough: s.borough?.toLowerCase(),
      })) as ParkingSign[];
    // compute distances client-side to preserve existing UI expectations
    const { filterByRadius } = await import('./utils/geospatial');
    const filtered = filterByRadius(list, params.lat, params.lon, params.radius);
    // map back to ParkingSign.distance property name
    return filtered.map((f) => ({ ...f, distance: f.distance_meters }));
  },

  async getMeterRate(params: MeterRateRequest): Promise<MeterRate> {
    const raw = await loadMeterZonesRaw();
    const { calculateDistance } = await import('./utils/geospatial');
    let best: { item: any; distance: number } | null = null;
    for (const item of raw) {
      const d = calculateDistance([params.lat, params.lon], [item.lat, item.long]);
      if (!best || d < best.distance) best = { item, distance: d };
    }
    if (!best) throw new Error('No meter found');
    const z = best.item;
    return {
      id: z.meter_number,
      latitude: z.lat,
      longitude: z.long,
      distance: best.distance,
      rate_schedule: [{ hours: z.meter_hours, rate: '0', rate_type: 'hourly' }],
      status: (z.status || 'unknown').toLowerCase() as MeterRate['status'],
      street_name: z.on_street,
      borough: z.borough?.toLowerCase(),
    } as MeterRate;
  },

  async getViolationTrends(params: ViolationTrendsRequest): Promise<ViolationTrend[]> {
    const payload = await loadViolationTrendsSample();
    // Adapt sample payload to ViolationTrend[]
    const year = params.year ?? new Date().getFullYear() - 1;
    return payload.trends.map((t) => ({
      borough: (params.borough || payload.filters.borough || 'manhattan').toString(),
      year,
      violation_type: t.violation_type,
      count: t.count,
      total_fines: Math.round(t.count * t.avg_fine),
      average_fine: t.avg_fine,
      trend_direction: 'stable',
    }));
  },

  async getViolations(_params: ViolationsRequest): Promise<Violation[]> {
    // Not implemented in original backend; return empty for now
    return [];
  },

  async getDataStatus(): Promise<DataStatus> {
    // Compute from static assets
    const [signs, meters] = await Promise.all([
      loadParkingSignsRaw().catch(() => []),
      loadMeterZonesRaw().catch(() => []),
    ]);
    const now = new Date().toISOString();
    return {
      parking_signs: {
        total_count: signs.length,
        last_updated: now,
        coverage_areas: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      },
      meter_rates: {
        total_count: meters.length,
        last_updated: now,
        coverage_areas: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
      },
      violations: {
        total_count: 0,
        last_updated: now,
        date_range: { start: '2020-01-01', end: now.slice(0, 10) },
      },
    } as DataStatus;
  },
};

// Geocoding API (kept client-side via OSM Nominatim)
export const geocoding = {
  async searchAddress(address: string): Promise<{ lat: number; lon: number; display_name: string }[]> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', New York, NY')}&limit=5&countrycodes=us`
    );
    if (!res.ok) throw new Error('Failed to geocode address');
    const data: { lat: string; lon: string; display_name: string }[] = await res.json();
    return data.map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name,
    }));
  },

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    if (!res.ok) return `${lat}, ${lon}`;
    const data = await res.json();
    return data.display_name || `${lat}, ${lon}`;
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
export type { ApiError, HealthCheck, ParkingSign, MeterRate, ViolationTrend, Violation, DataStatus };