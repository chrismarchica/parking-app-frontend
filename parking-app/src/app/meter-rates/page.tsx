"use client"

import * as React from "react"
import { Search, MapPin, Clock, CreditCard, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NYCMap } from "@/components/map/nyc-map"
import { AddressSearch } from "@/components/forms/address-search"
import { CoordinateInput } from "@/components/forms/coordinate-input"
import { api, apiUtils } from "@/lib/api"
import { MapLocation, MapMarker } from "@/lib/types"
import { constants, urlUtils, validation } from "@/lib/utils"

function MeterRatesContent() {
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
  
  const [showCoordinateInput, setShowCoordinateInput] = React.useState(false)

  // Fetch meter rate data
  const {
    data: meterRate,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['meter-rate', searchLocation.latitude, searchLocation.longitude],
    queryFn: () => api.getMeterRate({
      lat: searchLocation.latitude,
      lon: searchLocation.longitude,
    }),
    enabled: apiUtils.isValidCoordinate(searchLocation.latitude, searchLocation.longitude),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Create map markers
  const mapMarkers = React.useMemo((): MapMarker[] => {
    const markers: MapMarker[] = [
      // Search center marker
      {
        id: 'search-center',
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        type: 'search_center',
        popup: {
          title: 'Search Location',
          content: `${searchLocation.latitude.toFixed(4)}, ${searchLocation.longitude.toFixed(4)}`,
        },
      },
    ]

    // Meter marker
    if (meterRate) {
      markers.push({
        id: meterRate.id,
        latitude: meterRate.latitude,
        longitude: meterRate.longitude,
        type: 'meter',
        data: meterRate,
        popup: {
          title: `Meter - ${meterRate.street_name}`,
          content: `${apiUtils.formatDistance(meterRate.distance)} away - ${meterRate.status}`,
        },
      })
    }

    return markers
  }, [searchLocation, meterRate])

  // Handle location selection
  const handleLocationSelect = React.useCallback((location: MapLocation) => {
    setSearchLocation(location)
    
    // Update URL parameters
    const params = new URLSearchParams()
    params.set('lat', location.latitude.toString())
    params.set('lon', location.longitude.toString())
    if (location.address) params.set('address', location.address)
    
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [])

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'inactive':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'inactive':
      case 'maintenance':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meter Rates</h1>
        <p className="text-muted-foreground">
          Find the nearest parking meter and check rates, hours, and payment options
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
                />
              )}
            </CardContent>
          </Card>

          {/* Search Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Search Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Latitude:</span>{" "}
                  {searchLocation.latitude.toFixed(6)}
                </div>
                <div>
                  <span className="font-medium">Longitude:</span>{" "}
                  {searchLocation.longitude.toFixed(6)}
                </div>
                {searchLocation.address && (
                  <div>
                    <span className="font-medium">Address:</span>{" "}
                    {searchLocation.address}
                  </div>
                )}
              </div>
              
              {meterRate && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = urlUtils.createShareableURL(
                        { latitude: meterRate.latitude, longitude: meterRate.longitude },
                        'meter-rates'
                      )
                      navigator.clipboard.writeText(url)
                    }}
                    className="w-full"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Share Meter Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => refetch()} className="w-full" disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? "Searching..." : "Search Again"}
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <a href={`/parking-signs?lat=${searchLocation.latitude}&lon=${searchLocation.longitude}`}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Parking Signs
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0">
              <NYCMap
                center={searchLocation}
                zoom={constants.MAP_ZOOM.STREET}
                markers={mapMarkers}
                onLocationSelect={handleLocationSelect}
                height="600px"
                className="h-full rounded-xl overflow-hidden"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Nearest Meter</h2>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Search Error</span>
                <span className="text-sm">
                  {error instanceof Error ? error.message : 'Failed to find meter rates'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Searching for nearest meter...</p>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && !meterRate && (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meter Found</h3>
              <p className="text-muted-foreground mb-4">
                No parking meter was found near the selected location.
              </p>
              <p className="text-sm text-muted-foreground">
                Try searching in a different area or check if there are parking signs instead.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Meter Details */}
        {meterRate && (
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  {meterRate.street_name}
                </CardTitle>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(meterRate.status)}`}>
                  {getStatusIcon(meterRate.status)}
                  {meterRate.status
                    ? meterRate.status.charAt(0).toUpperCase() + meterRate.status.slice(1)
                    : 'Unknown'}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Distance: {apiUtils.formatDistance(meterRate.distance)}</div>
                    <div>Coordinates: {meterRate.latitude.toFixed(6)}, {meterRate.longitude.toFixed(6)}</div>
                    {meterRate.borough && <div>Borough: {meterRate.borough}</div>}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Details
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {meterRate.meter_type && <div>Type: {meterRate.meter_type}</div>}
                    {meterRate.max_time_limit && <div>Max Time: {meterRate.max_time_limit}</div>}
                  </div>
                </div>
              </div>

              {/* Rate Schedule */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Rate Schedule
                </h4>
                <div className="grid gap-3">
                  {meterRate.rate_schedule.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{schedule.hours}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {apiUtils.formatRate(schedule.rate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          per {schedule.rate_type === 'hourly' ? 'hour' : schedule.rate_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              {meterRate.payment_methods && meterRate.payment_methods.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Methods
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {meterRate.payment_methods.map((method, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">💡 Parking Tips</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Always check nearby parking signs for additional restrictions</li>
                  <li>• Consider using mobile payment apps for convenience</li>
                  <li>• Check if the meter is active during your planned parking time</li>
                  {meterRate.status === 'maintenance' && (
                    <li>• ⚠️ This meter is under maintenance - find an alternative</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function MeterRatesPage() {
  return (
    <React.Suspense fallback={
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meter Rates</h1>
          <p className="text-muted-foreground">
            Find the nearest parking meter and check rates, hours, and payment options
          </p>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <MeterRatesContent />
    </React.Suspense>
  )
}
