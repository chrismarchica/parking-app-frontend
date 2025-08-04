"use client"

import * as React from "react"
import Map, { NavigationControl, GeolocateControl, Marker, Popup } from "react-map-gl"
import { MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapLocation, MapMarker } from "@/lib/types"
import { constants } from "@/lib/utils"

interface NYCMapProps {
  center?: MapLocation
  zoom?: number
  markers?: MapMarker[]
  onLocationSelect?: (location: MapLocation) => void
  onMarkerClick?: (marker: MapMarker) => void
  showControls?: boolean
  height?: string
  interactive?: boolean
  searchRadius?: number
  className?: string
}

export function NYCMap({
  center = constants.NYC_CENTER,
  zoom = constants.MAP_ZOOM.CITY,
  markers = [],
  onLocationSelect,
  onMarkerClick,
  showControls = true,
  height = "500px",
  interactive = true,
  searchRadius,
  className,
}: NYCMapProps) {
  const [viewport, setViewport] = React.useState({
    latitude: center.latitude,
    longitude: center.longitude,
    zoom,
  })
  
  const [selectedMarker, setSelectedMarker] = React.useState<MapMarker | null>(null)
  const [userLocation, setUserLocation] = React.useState<MapLocation | null>(null)
  const [mapLoading, setMapLoading] = React.useState(true)

  // Update viewport when center changes
  React.useEffect(() => {
    setViewport(prev => ({
      ...prev,
      latitude: center.latitude,
      longitude: center.longitude,
    }))
  }, [center])

  const handleMapClick = React.useCallback((event: { lngLat: { lng: number; lat: number } }) => {
    if (!interactive || !onLocationSelect) return
    
    const { lng, lat } = event.lngLat
    onLocationSelect({
      latitude: lat,
      longitude: lng,
    })
  }, [interactive, onLocationSelect])

  const handleMarkerClick = React.useCallback((marker: MapMarker) => {
    setSelectedMarker(marker)
    if (onMarkerClick) {
      onMarkerClick(marker)
    }
  }, [onMarkerClick])

  const handleGeolocateSuccess = React.useCallback((position: GeolocationPosition) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
    setUserLocation(location)
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }, [onLocationSelect])

  const getMarkerColor = (type: MapMarker['type']) => {
    switch (type) {
      case 'parking_sign':
        return '#ef4444' // red
      case 'meter':
        return '#22c55e' // green
      case 'search_center':
        return '#3b82f6' // blue
      default:
        return '#6b7280' // gray
    }
  }

  const getMarkerIcon = (type: MapMarker['type']) => {
    switch (type) {
      case 'parking_sign':
        return '🚫'
      case 'meter':
        return '🅿️'
      case 'search_center':
        return '📍'
      default:
        return '📍'
    }
  }

  // Get Mapbox token from environment variable
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!mapboxToken) {
    return (
      <Card className={className} style={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPinOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
            <p className="text-sm text-muted-foreground">
              Mapbox token not configured. Please set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      <Map
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        onClick={handleMapClick}
        onLoad={() => setMapLoading(false)}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        attributionControl={false}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        interactive={interactive}
      >
        {/* Controls */}
        {showControls && (
          <>
            <NavigationControl position="top-right" />
            <GeolocateControl
              position="top-right"
              onGeolocate={handleGeolocateSuccess}
              trackUserLocation
            />
          </>
        )}

        {/* Search radius circle */}
        {searchRadius && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${searchRadius * 2}px`,
              height: `${searchRadius * 2}px`,
              marginLeft: `-${searchRadius}px`,
              marginTop: `-${searchRadius}px`,
              border: '2px solid #3b82f6',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="center"
          >
            <div className="relative">
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-blue-600 rounded-full animate-ping opacity-75" />
            </div>
          </Marker>
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            latitude={marker.latitude}
            longitude={marker.longitude}
            anchor="bottom"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white shadow-lg hover:scale-110 transition-transform"
              style={{ backgroundColor: getMarkerColor(marker.type) }}
              onClick={() => handleMarkerClick(marker)}
            >
              <span className="text-white text-xs">
                {getMarkerIcon(marker.type)}
              </span>
            </Button>
          </Marker>
        ))}

        {/* Popup for selected marker */}
        {selectedMarker && selectedMarker.popup && (
          <Popup
            latitude={selectedMarker.latitude}
            longitude={selectedMarker.longitude}
            onClose={() => setSelectedMarker(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            offset={25}
          >
            <div className="p-2">
              <h4 className="font-semibold text-sm mb-1">
                {selectedMarker.popup.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedMarker.popup.content}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {mapLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  )
}