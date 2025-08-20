"use client"

import * as React from "react"
import Map, { NavigationControl, GeolocateControl, Marker, Popup, Source, Layer } from "react-map-gl"
import { api } from "@/lib/api"
import { Borough } from "@/lib/types"
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
  const [violationPopup, setViolationPopup] = React.useState<{
    longitude: number
    latitude: number
    title?: string
    content?: string
  } | null>(null)
  const [violationLoading, setViolationLoading] = React.useState(false)
  const [violationError, setViolationError] = React.useState<string | null>(null)
  const [mapCursor, setMapCursor] = React.useState<string>('')

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
      case 'violation':
        return '#a855f7' // violet
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
      case 'violation':
        return '⚠️'
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

  const VIOLATION_LAYER_ID = 'violation-points'

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      <Map
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        onClick={async (evt) => {
          // Handle clicks on cluster layer first (zoom in on clusters)
          const clusterFeature = evt.features?.find(f => f.layer?.id === 'violation-clusters')
          if (clusterFeature && clusterFeature.geometry.type === 'Point') {
            const [longitude, latitude] = clusterFeature.geometry.coordinates as [number, number]
            const clusterId = clusterFeature.properties?.cluster_id
            const source = evt.target.getSource('violations-source')
            
            if (source && source.getClusterExpansionZoom && clusterId !== undefined) {
              source.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
                if (err) return
                
                setViewport(prev => ({
                  ...prev,
                  longitude,
                  latitude,
                  zoom: Math.min(zoom, 16), // Cap zoom level
                }))
              })
            }
            return
          }

          // Handle clicks on individual violation markers
          const feature = evt.features?.find(f => f.layer?.id === VIOLATION_LAYER_ID)
          if (feature && feature.geometry.type === 'Point') {
            const [lon, lat] = feature.geometry.coordinates as [number, number]
            const props = feature.properties as Record<string, unknown> | undefined
            setViolationPopup({
              longitude: lon,
              latitude: lat,
              title: typeof props?.title === 'string' ? props.title : 'Violation',
              content: typeof props?.content === 'string' ? props.content : undefined,
            })
            
            // Enhanced content with fine amount and violation type
            if (props?.fine_amount && props?.violation_type) {
              const fineAmount = typeof props.fine_amount === 'number' ? props.fine_amount : 0
              const violationType = typeof props.violation_type === 'string' ? props.violation_type : ''
              const existingContent = typeof props?.content === 'string' ? props.content : ''
              
              setViolationPopup(prev => prev && {
                ...prev,
                content: existingContent || `Fine: $${fineAmount}\nType: ${violationType}`,
              })
            }
            return
          }
          handleMapClick(evt)
        }}
        onMouseMove={(evt) => {
          const overViolation = !!evt.features?.find(f => 
            f.layer?.id === VIOLATION_LAYER_ID || f.layer?.id === 'violation-clusters'
          )
          setMapCursor(overViolation ? 'pointer' : '')
        }}
        onLoad={() => setMapLoading(false)}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        attributionControl={false}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        interactive={interactive}
        interactiveLayerIds={[VIOLATION_LAYER_ID, 'violation-clusters', 'violation-cluster-count']}
        cursor={mapCursor}
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

        {/* Search radius circle (meters → pixels based on zoom/latitude) */}
        {typeof searchRadius === 'number' && searchRadius > 0 && (
          (() => {
            const metersPerPixel = 156543.03392 * Math.cos(viewport.latitude * Math.PI / 180) / Math.pow(2, viewport.zoom)
            const pixelRadius = Math.max(8, Math.round(searchRadius / metersPerPixel))
            const diameter = pixelRadius * 2
            return (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${diameter}px`,
                  height: `${diameter}px`,
                  marginLeft: `-${pixelRadius}px`,
                  marginTop: `-${pixelRadius}px`,
                  border: '2px solid #3b82f6',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  pointerEvents: 'none',
                }}
              />
            )
          })()
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

        {/* Markers (HTML) - exclude violation markers; they will be rendered via Mapbox layers */}
        {(markers || [])
          .filter(m => m.type !== 'violation')
          .filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude))
          .map((marker) => (
          <Marker
            key={`${marker.type}-${marker.id}`}
            latitude={marker.latitude}
            longitude={marker.longitude}
            anchor={(marker.type === 'violation' || marker.type === 'search_center') ? 'center' : 'bottom'}
          >
            <Button
              aria-label={`Map marker - ${marker.type}`}
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full shadow-xl border border-white/60 ring-2 ring-white/70 hover:scale-110 transition-transform"
              style={{ backgroundColor: getMarkerColor(marker.type) }}
              onClick={() => handleMarkerClick(marker)}
            >
              <span className="text-white text-base leading-none">
                {getMarkerIcon(marker.type)}
              </span>
            </Button>
          </Marker>
        ))}

        {/* Violation markers rendered as a vector layer with clustering for performance */}
        {(() => {
          const violationMarkers = (markers || [])
            .filter(m => m.type === 'violation')
            .filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude))
          if (violationMarkers.length === 0) return null

          // Create geojson with clustering data
          const geojson = {
            type: 'FeatureCollection',
            features: violationMarkers.map((m, index) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
              properties: { 
                id: `${m.id}`,
                title: m.popup?.title || '',
                content: m.popup?.content || '',
                borough: `${m.id}`.replace('violation-', ''),
                index,
                // Add violation-specific data for clustering
                violation_type: m.data?.violation_type || '',
                fine_amount: m.data?.fine_amount || 0,
              },
            })),
          } as const

          // Base circle layer for individual violations
          const circleLayer = {
            id: VIOLATION_LAYER_ID,
            type: 'circle' as const,
            filter: ['!', ['has', 'point_count']], // Only show unclustered points
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 4,
                15, 6,
                20, 8
              ],
              'circle-color': [
                'case',
                ['>', ['get', 'fine_amount'], 200], '#dc2626', // red for high fines
                ['>', ['get', 'fine_amount'], 100], '#ea580c', // orange for medium fines
                '#a855f7' // purple for low fines
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.8,
            },
          }

          // Cluster layer for grouped violations
          const clusterLayer = {
            id: 'violation-clusters',
            type: 'circle' as const,
            filter: ['has', 'point_count'],
            paint: {
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,
                10, 20,
                50, 25,
                100, 30
              ],
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#fed7d7',
                10, '#fc8181',
                50, '#f56565',
                100, '#e53e3e'
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.8,
            },
          }

          // Cluster count labels
          const clusterCountLayer = {
            id: 'violation-cluster-count',
            type: 'symbol' as const,
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
            paint: {
              'text-color': '#ffffff',
            },
          }

          return (
            <Source 
              id="violations-source" 
              type="geojson" 
              data={geojson}
              cluster={true}
              clusterMaxZoom={14}
              clusterRadius={50}
            >
              <Layer {...clusterLayer} />
              <Layer {...clusterCountLayer} />
              <Layer {...circleLayer} />
            </Source>
          )
        })()}

        {/* Popup for violation feature */}
        {violationPopup && (
          <Popup
            longitude={violationPopup.longitude}
            latitude={violationPopup.latitude}
            onClose={() => setViolationPopup(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="top"
            offset={10}
          >
            <div className="p-2">
              <h4 className="font-semibold text-sm mb-1">{violationPopup.title}</h4>
              {violationLoading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : violationError ? (
                <p className="text-xs text-destructive">{violationError}</p>
              ) : violationPopup.content ? (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{violationPopup.content}</pre>
              ) : (
                <p className="text-xs text-muted-foreground">No details available</p>
              )}
            </div>
          </Popup>
        )}

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