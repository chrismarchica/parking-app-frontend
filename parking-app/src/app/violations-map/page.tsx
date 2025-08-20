"use client"

import * as React from "react"
import { MapPin, Filter, Download, Search, Calendar, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NYCMap } from "@/components/map/nyc-map"
import { AddressSearch } from "@/components/forms/address-search"
import { api } from "@/lib/api"
import { Violation, Borough, NYC_BOROUGHS, MapLocation, MapMarker } from "@/lib/types"
import { exportUtils, constants } from "@/lib/utils"

export default function ViolationsMapPage() {
  // State for map and filters
  const [searchLocation, setSearchLocation] = React.useState<MapLocation>(constants.NYC_CENTER)
  const [searchRadius, setSearchRadius] = React.useState(1000) // 1km default
  const [selectedBorough, setSelectedBorough] = React.useState<Borough | 'all'>('all')
  const [selectedViolationType, setSelectedViolationType] = React.useState<string>('all')
  const [dateRange, setDateRange] = React.useState<{
    start: string
    end: string
  }>({
    start: '', // No start date filter initially
    end: '', // No end date filter initially
  })
  const [limit, setLimit] = React.useState(500)

  // Fetch violations based on current filters
  const {
    data: violations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'violations', 
      searchLocation.latitude, 
      searchLocation.longitude, 
      searchRadius, 
      selectedBorough, 
      selectedViolationType,
      dateRange.start,
      dateRange.end,
      limit
    ],
    queryFn: async () => {
      const params = {
        lat: searchLocation.latitude,
        lon: searchLocation.longitude,
        radius: searchRadius,
        borough: selectedBorough !== 'all' ? selectedBorough : undefined,
        violation_type: selectedViolationType !== 'all' ? selectedViolationType : undefined,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
        limit,
      }
      console.log('Fetching violations with params:', params)
      const result = await api.getViolations(params)
      console.log('Violations API response:', result)
      return result
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  })

  // Convert violations to map markers with optimizations
  const violationMarkers: MapMarker[] = React.useMemo(() => {
    // For performance, limit markers if there are too many
    const maxMarkers = 5000
    const markersToShow = violations.length > maxMarkers 
      ? violations.slice(0, maxMarkers) 
      : violations
    
    return markersToShow.map(violation => ({
      id: `violation-${violation.id}`,
      latitude: violation.latitude,
      longitude: violation.longitude,
      type: 'violation' as const,
      data: violation,
      popup: {
        title: violation.violation_type,
        content: `Fine: $${violation.fine_amount}\nDate: ${new Date(violation.issue_date).toLocaleDateString()}\nLocation: ${violation.street_name || 'Unknown'}\nVehicle: ${violation.vehicle_make || ''} ${violation.vehicle_color || ''}`.trim(),
      },
    }))
  }, [violations])

  // Check if we're showing limited results
  const isLimitedResults = violations.length > 5000

  // Get unique violation types for filter
  const violationTypes = React.useMemo(() => {
    const types = new Set(violations.map(v => v.violation_type))
    return Array.from(types).sort()
  }, [violations])

  // Calculate statistics
  const statistics = React.useMemo(() => {
    if (!violations.length) return null

    const totalFines = violations.reduce((sum, v) => sum + v.fine_amount, 0)
    const avgFine = totalFines / violations.length
    const typeCount = new Map<string, number>()
    violations.forEach(v => {
      typeCount.set(v.violation_type, (typeCount.get(v.violation_type) || 0) + 1)
    })
    const mostCommon = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1])[0]

    return {
      total: violations.length,
      totalFines,
      avgFine,
      mostCommon: mostCommon ? { type: mostCommon[0], count: mostCommon[1] } : null,
    }
  }, [violations])

  // Handle location search
  const handleLocationSelect = (location: MapLocation) => {
    setSearchLocation(location)
  }

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    const exportData = {
      type: 'violations' as const,
      data: violations,
      filters: {
        location: searchLocation,
        radius: searchRadius,
        borough: selectedBorough,
        violation_type: selectedViolationType,
        date_range: dateRange,
      },
      exportDate: new Date().toISOString(),
    }

    const filename = `violations-${searchLocation.latitude.toFixed(4)}-${searchLocation.longitude.toFixed(4)}-${searchRadius}m-${new Date().toISOString().split('T')[0]}`
    
    if (format === 'json') {
      exportUtils.downloadJSON(exportData, filename)
    } else {
      const csvData = violations.map(violation => ({
        id: violation.id,
        latitude: violation.latitude,
        longitude: violation.longitude,
        violation_type: violation.violation_type,
        fine_amount: violation.fine_amount,
        issue_date: violation.issue_date,
        vehicle_make: violation.vehicle_make || '',
        vehicle_color: violation.vehicle_color || '',
        street_name: violation.street_name || '',
        house_number: violation.house_number || '',
        borough: violation.borough,
        plate_number: violation.plate_number || '',
        issuing_agency: violation.issuing_agency || '',
        violation_status: violation.violation_status || '',
      }))
      exportUtils.downloadCSV(csvData, filename)
    }
  }

  const hasData = violations.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Violations Map</h1>
        <p className="text-muted-foreground">
          Explore individual parking violations plotted on the map
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Location</label>
            <AddressSearch
              onLocationSelect={handleLocationSelect}
              placeholder="Enter an address or neighborhood in NYC"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Radius */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Radius</label>
              <Select value={searchRadius.toString()} onValueChange={(value) => setSearchRadius(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">500m</SelectItem>
                  <SelectItem value="1000">1km</SelectItem>
                  <SelectItem value="2000">2km</SelectItem>
                  <SelectItem value="5000">5km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Borough Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Borough</label>
              <Select value={selectedBorough} onValueChange={(value: Borough | 'all') => setSelectedBorough(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boroughs</SelectItem>
                  {NYC_BOROUGHS.map((borough) => (
                    <SelectItem key={borough} value={borough}>
                      {borough.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Violation Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Violation Type</label>
              <Select value={selectedViolationType} onValueChange={setSelectedViolationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {violationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Results</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="2000">2,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date (Optional)</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                placeholder="Leave empty for all dates"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date (Optional)</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                placeholder="Leave empty for all dates"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={!hasData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={!hasData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Data Error</span>
              <span className="text-sm">
                {error instanceof Error ? error.message : 'Failed to load violations'}
              </span>
            </div>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer">Debug Info</summary>
              <pre className="text-xs mt-1 p-2 bg-background rounded">
                {JSON.stringify({
                  searchLocation,
                  searchRadius,
                  selectedBorough,
                  dateRange,
                  limit
                }, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Debug Info for Development */}
      {process.env.NODE_ENV === 'development' && !isLoading && !error && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Debug: API Response</span>
            </div>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer">Query Details</summary>
              <pre className="text-xs mt-1 p-2 bg-white rounded">
                Location: {searchLocation.latitude}, {searchLocation.longitude}
                Radius: {searchRadius}m
                Borough: {selectedBorough}
                Date Range: {dateRange.start} to {dateRange.end}
                Violations Found: {violations.length}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <div className="text-sm font-medium text-muted-foreground">Total Violations</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {statistics.total.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-muted-foreground">Total Fines</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                ${statistics.totalFines.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-muted-foreground">Average Fine</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                ${statistics.avgFine.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium text-muted-foreground">Most Common</div>
              </div>
              <div className="text-sm font-bold mt-1 leading-tight">
                {statistics.mostCommon?.type || 'N/A'}
                {statistics.mostCommon && (
                  <div className="text-xs font-normal text-muted-foreground">
                    {statistics.mostCommon.count} violations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading violations...</p>
        </div>
      )}

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Violations Map
            {hasData && (
              <span className="text-sm font-normal text-muted-foreground">
                ({violationMarkers.length}{isLimitedResults ? ' of ' + violations.length : ''} violations shown)
                {isLimitedResults && (
                  <span className="text-amber-600 ml-2">
                    • Limited for performance
                  </span>
                )}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NYCMap
            center={searchLocation}
            zoom={constants.MAP_ZOOM.NEIGHBORHOOD}
            markers={violationMarkers}
            onLocationSelect={handleLocationSelect}
            searchRadius={searchRadius}
            height="600px"
            className="rounded-lg overflow-hidden"
          />
        </CardContent>
      </Card>

      {/* No Data */}
      {!isLoading && !error && !hasData && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Violations Found</h3>
            <p className="text-muted-foreground mb-4">
              No violations were found for the selected location and filters.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Try adjusting your search:</p>
              <p>• Increase the search radius</p>
              <p>• Expand the date range</p>
              <p>• Remove violation type or borough filters</p>
              <p>• Search in a different area</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
