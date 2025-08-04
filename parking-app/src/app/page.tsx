"use client"

import * as React from "react"
import { MapPin, Search, TrendingUp, AlertCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NYCMap } from "@/components/map/nyc-map"
import { AddressSearch } from "@/components/forms/address-search"
import { CoordinateInput } from "@/components/forms/coordinate-input"
import { api } from "@/lib/api"
import { MapLocation, MapMarker } from "@/lib/types"
import { constants, urlUtils } from "@/lib/utils"

export default function Home() {
  const [selectedLocation, setSelectedLocation] = React.useState<MapLocation>(constants.NYC_CENTER)
  const [searchRadius, setSearchRadius] = React.useState(500)
  const [mapMarkers, setMapMarkers] = React.useState<MapMarker[]>([])
  const [showCoordinateInput, setShowCoordinateInput] = React.useState(false)

  // Health check query
  const { data: healthData, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: api.checkHealth,
    retry: 2,
    staleTime: 30000, // 30 seconds
  })

  // Data status query
  const { data: dataStatus } = useQuery({
    queryKey: ['data-status'],
    queryFn: api.getDataStatus,
    enabled: healthData?.status === 'healthy',
  })

  // Load location from URL on mount
  React.useEffect(() => {
    const locationFromURL = urlUtils.parseLocationFromURL()
    if (locationFromURL) {
      setSelectedLocation(locationFromURL)
    }
  }, [])

  // Handle location selection
  const handleLocationSelect = React.useCallback((location: MapLocation) => {
    setSelectedLocation(location)
    
    // Add search center marker
    const searchMarker: MapMarker = {
      id: 'search-center',
      latitude: location.latitude,
      longitude: location.longitude,
      type: 'search_center',
      popup: {
        title: 'Search Center',
        content: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      },
    }
    
    setMapMarkers([searchMarker])
  }, [])

  const isHealthy = healthData?.status === 'healthy'
  const hasError = !!healthError

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight nyc-text-gradient">
          NYC Smart Parking
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find parking signs, meter rates, and violation trends across New York City.
          Get real-time information to make smarter parking decisions.
        </p>
      </div>

      {/* Health Status Banner */}
      {hasError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">API Connection Error</span>
              <span className="text-sm">
                Unable to connect to parking data service. Some features may be unavailable.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {dataStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parking Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataStatus.parking_signs.total_count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(dataStatus.parking_signs.last_updated).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meter Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataStatus.meter_rates.total_count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(dataStatus.meter_rates.last_updated).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataStatus.violations.total_count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {dataStatus.violations.date_range.start} to{" "}
                {dataStatus.violations.date_range.end}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="space-y-4">
          {/* Address Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Location
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
                  initialLocation={selectedLocation}
                  showRadius={true}
                  onRadiusChange={setSearchRadius}
                  initialRadius={searchRadius}
                />
              )}
            </CardContent>
          </Card>

          {/* Current Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Selected Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Latitude:</span>{" "}
                  {selectedLocation.latitude.toFixed(6)}
                </div>
                <div>
                  <span className="font-medium">Longitude:</span>{" "}
                  {selectedLocation.longitude.toFixed(6)}
                </div>
                {selectedLocation.address && (
                  <div>
                    <span className="font-medium">Address:</span>{" "}
                    {selectedLocation.address}
                  </div>
                )}
                <div>
                  <span className="font-medium">Search Radius:</span>{" "}
                  {searchRadius}m
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                asChild 
                className="w-full justify-start" 
                variant="outline"
                disabled={!isHealthy}
              >
                <a href={`/parking-signs?lat=${selectedLocation.latitude}&lon=${selectedLocation.longitude}&radius=${searchRadius}`}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Parking Signs
                </a>
              </Button>
              
              <Button 
                asChild 
                className="w-full justify-start" 
                variant="outline"
                disabled={!isHealthy}
              >
                <a href={`/meter-rates?lat=${selectedLocation.latitude}&lon=${selectedLocation.longitude}`}>
                  <Search className="h-4 w-4 mr-2" />
                  Check Meter Rates
                </a>
              </Button>
              
              <Button 
                asChild 
                className="w-full justify-start" 
                variant="outline"
                disabled={!isHealthy}
              >
                <a href="/violation-trends">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Violation Trends
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-0">
              <NYCMap
                center={selectedLocation}
                zoom={constants.MAP_ZOOM.NEIGHBORHOOD}
                markers={mapMarkers}
                onLocationSelect={handleLocationSelect}
                height="600px"
                searchRadius={searchRadius}
                className="h-full rounded-lg"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Parking Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search for parking signs around any location in NYC. Get detailed 
              information about parking regulations and restrictions.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/parking-signs">Explore Parking Signs</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-500" />
              Meter Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Find nearby parking meters and check their rates, hours of operation,
              and payment methods.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/meter-rates">Check Meter Rates</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Violation Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analyze parking violation trends by borough and year. Understand 
              patterns to avoid common parking mistakes.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/violation-trends">View Trends</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
