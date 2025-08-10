"use client"

import * as React from "react"
import { Search, MapPin, Download, Filter, AlertCircle, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NYCMap } from "@/components/map/nyc-map"
import { AddressSearch } from "@/components/forms/address-search"
import { CoordinateInput } from "@/components/forms/coordinate-input"
import { api, apiUtils } from "@/lib/api"
import { MapLocation, MapMarker } from "@/lib/types"
import { constants, urlUtils, exportUtils, validation } from "@/lib/utils"

function ParkingSignsContent() {
  const searchParams = useSearchParams()
  
  // Initialize state from URL parameters
  const [searchLocation, setSearchLocation] = React.useState<MapLocation>(() => {
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const address = searchParams.get('address')
    
    if (lat && lon && validation.isValidLatitude(lat) && validation.isValidLongitude(lon)) {
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        address: address || undefined,
      }
    }
    return constants.NYC_CENTER
  })
  
  const [searchRadius, setSearchRadius] = React.useState(() => {
    const radius = searchParams.get('radius')
    return radius && validation.isValidRadius(radius) ? parseInt(radius) : 500
  })
  
  const [sortBy, setSortBy] = React.useState<'distance' | 'street_name'>('distance')
  const [filterBorough, setFilterBorough] = React.useState<string>('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [showCoordinateInput, setShowCoordinateInput] = React.useState(false)

  // Fetch parking signs
  const {
    data: parkingSigns = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['parking-signs', searchLocation.latitude, searchLocation.longitude, searchRadius],
    queryFn: () => api.getParkingSigns({
      lat: searchLocation.latitude,
      lon: searchLocation.longitude,
      radius: searchRadius,
    }),
    enabled: apiUtils.isValidCoordinate(searchLocation.latitude, searchLocation.longitude),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Create map markers from parking signs
  const mapMarkers = React.useMemo((): MapMarker[] => {
    const markers: MapMarker[] = [
      // Search center marker
      {
        id: 'search-center',
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        type: 'search_center',
        popup: {
          title: 'Search Center',
          content: `${searchLocation.latitude.toFixed(4)}, ${searchLocation.longitude.toFixed(4)}`,
        },
      },
    ]

    // Parking sign markers
    parkingSigns.forEach((sign) => {
      markers.push({
        id: sign.id,
        latitude: sign.latitude,
        longitude: sign.longitude,
        type: 'parking_sign',
        data: sign,
        popup: {
          title: sign.street_name || 'Parking Sign',
          content: `${sign.description} (${apiUtils.formatDistance(sign.distance)} away)`,
        },
      })
    })

    return markers
  }, [searchLocation, parkingSigns])

  // Filter and sort parking signs
  const filteredAndSortedSigns = React.useMemo(() => {
    let filtered = [...parkingSigns]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (sign) =>
          sign.description.toLowerCase().includes(term) ||
          sign.street_name.toLowerCase().includes(term) ||
          (sign.borough && sign.borough.toLowerCase().includes(term))
      )
    }

    // Filter by borough
    if (filterBorough !== 'all') {
      filtered = filtered.filter((sign) => sign.borough === filterBorough)
    }

    // Sort
    if (sortBy === 'distance') {
      filtered.sort((a, b) => a.distance - b.distance)
    } else if (sortBy === 'street_name') {
      filtered.sort((a, b) => a.street_name.localeCompare(b.street_name))
    }

    return filtered
  }, [parkingSigns, searchTerm, filterBorough, sortBy])

  // Handle location selection
  const handleLocationSelect = React.useCallback((location: MapLocation) => {
    setSearchLocation(location)
    
    // Update URL parameters
    const params = new URLSearchParams()
    params.set('lat', location.latitude.toString())
    params.set('lon', location.longitude.toString())
    if (location.address) params.set('address', location.address)
    params.set('radius', searchRadius.toString())
    
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [searchRadius])

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    const exportData = {
      type: 'parking_signs' as const,
      data: filteredAndSortedSigns,
      filters: {
        radius: searchRadius,
        borough: filterBorough,
        searchTerm,
        sortBy,
      },
      exportDate: new Date().toISOString(),
      location: searchLocation,
    }

    const filename = `parking-signs-${new Date().toISOString().split('T')[0]}`
    
    if (format === 'json') {
      exportUtils.downloadJSON(exportData, filename)
    } else {
      const csvData = filteredAndSortedSigns.map(sign => ({
        id: sign.id,
        street_name: sign.street_name,
        description: sign.description,
        latitude: sign.latitude,
        longitude: sign.longitude,
        distance_meters: sign.distance,
        borough: sign.borough || '',
        sign_type: sign.sign_type || '',
      }))
      exportUtils.downloadCSV(csvData, filename)
    }
  }

  const hasResults = filteredAndSortedSigns.length > 0
  const totalResults = parkingSigns.length
  const filteredResults = filteredAndSortedSigns.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parking Signs</h1>
        <p className="text-muted-foreground">
          Find parking signs and regulations around any location in NYC
        </p>
      </div>

      {/* Search Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {/* Location Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddressSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Search for an address in NYC..."
              />
              
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCoordinateInput(!showCoordinateInput)}
                >
                  {showCoordinateInput ? "Use Address Search" : "Use Coordinates"}
                </Button>
              </div>

              {showCoordinateInput && (
                <CoordinateInput
                  onLocationSelect={handleLocationSelect}
                  initialLocation={searchLocation}
                  showRadius={true}
                  onRadiusChange={setSearchRadius}
                  initialRadius={searchRadius}
                />
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Sort
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search term */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search in results</label>
                <Input
                  placeholder="Search descriptions, streets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Borough filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Borough</label>
                <Select value={filterBorough} onValueChange={setFilterBorough}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Boroughs</SelectItem>
                    <SelectItem value="manhattan">Manhattan</SelectItem>
                    <SelectItem value="brooklyn">Brooklyn</SelectItem>
                    <SelectItem value="queens">Queens</SelectItem>
                    <SelectItem value="bronx">Bronx</SelectItem>
                    <SelectItem value="staten_island">Staten Island</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select value={sortBy} onValueChange={(value: 'distance' | 'street_name') => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="street_name">Street Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Results</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                    disabled={!hasResults}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json')}
                    disabled={!hasResults}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    filteredResults
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isLoading ? 'Searching...' : `of ${totalResults} signs found`}
                </div>
                <div className="text-xs text-muted-foreground">
                  within {searchRadius}m radius
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0">
              <NYCMap
                center={searchLocation}
                zoom={constants.MAP_ZOOM.NEIGHBORHOOD}
                markers={mapMarkers}
                onLocationSelect={handleLocationSelect}
                height="600px"
                searchRadius={searchRadius}
                className="h-full rounded-xl overflow-hidden"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Search Results</h2>
          {hasResults && (
            <Button variant="outline" onClick={() => refetch()}>
              <Search className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Search Error</span>
                <span className="text-sm">
                  {error instanceof Error ? error.message : 'Failed to search for parking signs'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Searching for parking signs...</p>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && !hasResults && totalResults === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Parking Signs Found</h3>
              <p className="text-muted-foreground mb-4">
                No parking signs were found within {searchRadius}m of the selected location.
              </p>
              <Button onClick={() => setSearchRadius(1000)}>
                Expand Search to 1km
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filtered No Results */}
        {!isLoading && !error && !hasResults && totalResults > 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Match Your Filters</h3>
              <p className="text-muted-foreground mb-4">
                {totalResults} signs found, but none match your current filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterBorough('all')
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results List */}
        {hasResults && (
          <div className="grid gap-4">
            {filteredAndSortedSigns.map((sign) => (
              <Card key={sign.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">{sign.street_name}</h3>
                        <span className="text-sm font-medium text-muted-foreground">
                          {apiUtils.formatDistance(sign.distance)} away
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {sign.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        {sign.borough && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {sign.borough}
                          </span>
                        )}
                        {sign.sign_type && (
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                            {sign.sign_type}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Coordinates:</span>
                        <br />
                        {sign.latitude.toFixed(6)}, {sign.longitude.toFixed(6)}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = urlUtils.createShareableURL(
                            { latitude: sign.latitude, longitude: sign.longitude },
                            'parking-signs'
                          )
                          navigator.clipboard.writeText(url)
                        }}
                        className="w-full"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Share Location
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParkingSignsPage() {
  return (
    <React.Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parking Signs</h1>
          <p className="text-muted-foreground">
            Find parking signs and regulations around any location in NYC
          </p>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ParkingSignsContent />
    </React.Suspense>
  )
}