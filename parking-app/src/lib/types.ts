// API Response Types
export interface HealthCheck {
  status: 'healthy' | 'error';
  timestamp: string;
  services?: {
    database?: 'connected' | 'disconnected';
    api?: 'online' | 'offline';
  };
}

export interface ParkingSign {
  id: string;
  latitude: number;
  longitude: number;
  distance: number;
  description: string;
  street_name: string;
  sign_type?: string;
  regulations?: string[];
  borough?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeterRate {
  id: string;
  latitude: number;
  longitude: number;
  distance: number;
  rate_schedule: {
    hours: string;
    rate: string;
    rate_type: 'hourly' | 'daily' | 'monthly';
  }[];
  status: 'active' | 'inactive' | 'maintenance';
  street_name: string;
  meter_type?: string;
  max_time_limit?: string;
  payment_methods?: string[];
  borough?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ViolationTrend {
  borough: string;
  year: number;
  month?: number;
  violation_type: string;
  count: number;
  total_fines: number;
  average_fine: number;
  trend_direction: 'up' | 'down' | 'stable';
  percentage_change?: number;
}

export interface Violation {
  id: string;
  latitude: number;
  longitude: number;
  violation_type: string;
  fine_amount: number;
  issue_date: string;
  vehicle_make?: string;
  vehicle_color?: string;
  street_name?: string;
  house_number?: string;
  intersecting_street?: string;
  borough: string;
  plate_number?: string;
  plate_type?: string;
  issuing_agency?: string;
  violation_status?: 'paid' | 'pending' | 'dismissed';
  payment_date?: string;
}

export interface DataStatus {
  parking_signs: {
    total_count: number;
    last_updated: string;
    coverage_areas: string[];
  };
  meter_rates: {
    total_count: number;
    last_updated: string;
    coverage_areas: string[];
  };
  violations: {
    total_count: number;
    last_updated: string;
    date_range: {
      start: string;
      end: string;
    };
  };
}

// API Request Types
export interface ParkingSignsRequest {
  lat: number;
  lon: number;
  radius: number; // in meters
}

export interface MeterRateRequest {
  lat: number;
  lon: number;
}

export interface ViolationTrendsRequest {
  borough: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
  year: number;
  month?: number;
}

export interface ViolationsRequest {
  lat?: number;
  lon?: number;
  radius?: number; // in meters
  borough?: Borough;
  violation_type?: string;
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  limit?: number; // max number of results
  offset?: number; // for pagination
}

// UI Component Types
export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface SearchFilters {
  radius?: number;
  signType?: string;
  borough?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface BookmarkedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  type: 'parking_sign' | 'meter' | 'custom';
  created_at: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  location: MapLocation;
  timestamp: string;
  type: 'address' | 'coordinates';
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  month?: string;
  year?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface TrendChartData {
  borough: string;
  data: ChartDataPoint[];
  totalViolations: number;
  averageFine: number;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// NYC Boroughs
export const NYC_BOROUGHS = [
  'manhattan',
  'brooklyn',
  'queens',
  'bronx',
  'staten_island'
] as const;

export type Borough = typeof NYC_BOROUGHS[number];

// Map Marker Types
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'parking_sign' | 'meter' | 'search_center' | 'violation';
  data?: ParkingSign | MeterRate;
  popup?: {
    title: string;
    content: string;
  };
}

// Form Validation Types
export interface CoordinateInput {
  latitude: string;
  longitude: string;
  radius?: string;
}

export interface AddressSearchInput {
  address: string;
  radius?: string;
}

// Export/Import Types
export interface ExportData {
  type: 'parking_signs' | 'meter_rates' | 'violation_trends';
  data: ParkingSign[] | MeterRate[] | ViolationTrend[];
  filters: SearchFilters;
  exportDate: string;
  location?: MapLocation;
}