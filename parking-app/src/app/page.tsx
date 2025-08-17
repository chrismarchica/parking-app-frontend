"use client"

import * as React from "react"
import { MapPin, Search, TrendingUp, AlertCircle, ArrowRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NYCMap } from "@/components/map/nyc-map"
import { AddressSearch } from "@/components/forms/address-search"
import { CoordinateInput } from "@/components/forms/coordinate-input"
import { api, apiUtils } from "@/lib/api"
import { MapLocation, MapMarker, Borough, NYC_BOROUGHS, ParkingSign, MeterRate } from "@/lib/types"
import { constants, urlUtils } from "@/lib/utils"

export default function Home() {
  const [selectedLocation, setSelectedLocation] = React.useState<MapLocation>(constants.NYC_CENTER)
  const [searchRadius, setSearchRadius] = React.useState(500)
  // Map markers are derived from fetched data
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
  }, [])

  // Fetch parking signs near the selected location
  const { data: parkingSignsData } = useQuery<ParkingSign[]>({
    queryKey: ['home-parking-signs', selectedLocation.latitude, selectedLocation.longitude, searchRadius],
    queryFn: () => api.getParkingSigns({
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude,
      radius: searchRadius,
    }),
    enabled: apiUtils.isValidCoordinate(selectedLocation.latitude, selectedLocation.longitude),
    staleTime: 5 * 60 * 1000,
  })
  const parkingSigns: ParkingSign[] = React.useMemo(() => 
    Array.isArray(parkingSignsData) ? parkingSignsData : [], 
    [parkingSignsData]
  )

  // Fetch nearest meter for the selected location
  const { data: meterRate } = useQuery<MeterRate | undefined>({
    queryKey: ['home-meter-rate', selectedLocation.latitude, selectedLocation.longitude],
    queryFn: () => api.getMeterRate({
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude,
    }),
    enabled: apiUtils.isValidCoordinate(selectedLocation.latitude, selectedLocation.longitude),
    staleTime: 5 * 60 * 1000,
  })

  // Derive map markers from fetched data
  const mapMarkers: MapMarker[] = React.useMemo(() => {
    const markers: MapMarker[] = [
      {
        id: 'search-center',
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        type: 'search_center',
        popup: {
          title: 'Search Center',
          content: `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`,
        },
      },
    ]

    // Add parking sign markers (robust to non-array responses)
    const signsArray = Array.isArray(parkingSigns) ? parkingSigns : []
    signsArray.forEach(sign => {
      markers.push({
        id: sign.id,
        latitude: sign.latitude,
        longitude: sign.longitude,
        type: 'parking_sign',
        data: sign,
        popup: {
          title: sign.street_name || 'Parking Sign',
          content: `${sign.description}`,
        },
      })
    })

    // Add meter marker
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

    // Add borough-level violation "heat" markers (using totals by borough)
    // Fetch latest year and plot at approximate borough centroids
    const currentYear = new Date().getFullYear() - 1
    const boroughCentroids: Record<Borough, { lat: number; lon: number; label: string }> = {
      manhattan: { lat: 40.7831, lon: -73.9712, label: 'Manhattan' },
      brooklyn: { lat: 40.6782, lon: -73.9442, label: 'Brooklyn' },
      queens: { lat: 40.7282, lon: -73.7949, label: 'Queens' },
      bronx: { lat: 40.8448, lon: -73.8648, label: 'Bronx' },
      staten_island: { lat: 40.5795, lon: -74.1502, label: 'Staten Island' },
    }

    // Note: We don't have per-violation-point API, so we visualize borough totals
    // We rely on cached queries from the Violation Trends page; otherwise, skip.
    // This keeps the home page snappy.

    // Create a simple helper to attach violation summary from query cache if available
    // We avoid an extra request burst from home by not fetching here.
    // Instead, just render centroids without counts.
    NYC_BOROUGHS.forEach((borough) => {
      const c = boroughCentroids[borough]
      markers.push({
        id: `violation-${borough}`,
        latitude: c.lat,
        longitude: c.lon,
        type: 'violation',
        popup: {
          title: `${c.label} Violations`,
          content: `Latest totals by type (${currentYear}). Open Violation Trends for details.`,
        },
      })
    })

    return markers
  }, [selectedLocation, parkingSigns, meterRate])

  const isHealthy = healthData?.status === 'healthy'
  const hasError = !!healthError

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white">
        {/* Decorative backdrop */}
        <div className="pointer-events-none absolute -inset-40 opacity-30">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl bg-[radial-gradient(circle_at_center,theme(colors.white/30),transparent_60%)]" />
        </div>
        <div className="relative px-6 py-12 md:px-10 md:py-14 text-center">
          <div className="mx-auto flex w-full max-w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <span className={`inline-flex items-center gap-1 ${healthData?.status === 'healthy' ? 'text-emerald-200' : 'text-amber-200'}`}>
              <span className={`h-2 w-2 rounded-full ${healthData?.status === 'healthy' ? 'bg-emerald-300' : 'bg-amber-300'} animate-pulse`} />
              {healthData?.status === 'healthy' ? 'Live data' : 'Degraded' }
            </span>
            <span className="text-white/30">•</span>
            <span>NYC Smart Parking</span>
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight nyc-text-gradient">
            Make smarter parking decisions in NYC
          </h1>
          <p className="mt-3 text-base md:text-lg/7 max-w-3xl mx-auto text-blue-50">
            Explore parking signs, meter rates, and violation trends on a fast, interactive map.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-lg">
              <a href="/parking-signs" className="inline-flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Explore Parking Signs
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <a href="/meter-rates" className="inline-flex items-center gap-2">
                <Search className="h-5 w-5" />
                Check Meter Rates
              </a>
            </Button>
          </div>
        </div>
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
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-slate-800 dark:to-slate-900">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <MapPin className="h-4 w-4" />
                </span>
                Parking Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-extrabold nyc-text-gradient">
                {dataStatus.parking_signs.total_count.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Last updated: {apiUtils.formatLastUpdated(dataStatus.parking_signs.last_updated)}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-slate-800 dark:to-slate-900">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                  <Search className="h-4 w-4" />
                </span>
                Meter Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-extrabold nyc-text-gradient">
                {dataStatus.meter_rates.total_count.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Last updated: {apiUtils.formatLastUpdated(dataStatus.meter_rates.last_updated)}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-slate-800 dark:to-slate-900">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-600/10 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-extrabold nyc-text-gradient">
                {dataStatus.violations.total_count.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Date range: {apiUtils.formatDateRange(
                  dataStatus.violations.date_range.start,
                  dataStatus.violations.date_range.end
                )}
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
          <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0">
              <NYCMap
                center={selectedLocation}
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
