"use client"

import * as React from "react"
import { MapPin, Target } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapLocation } from "@/lib/types"
import { validation, storage } from "@/lib/utils"

interface CoordinateInputProps {
  onLocationSelect: (location: MapLocation) => void
  initialLocation?: MapLocation
  className?: string
  showRadius?: boolean
  onRadiusChange?: (radius: number) => void
  initialRadius?: number
}

export function CoordinateInput({
  onLocationSelect,
  initialLocation,
  className,
  showRadius = false,
  onRadiusChange,
  initialRadius = 500,
}: CoordinateInputProps) {
  const [latitude, setLatitude] = React.useState(
    initialLocation?.latitude?.toString() || ""
  )
  const [longitude, setLongitude] = React.useState(
    initialLocation?.longitude?.toString() || ""
  )
  const [radius, setRadius] = React.useState(initialRadius.toString())
  const [errors, setErrors] = React.useState<{
    latitude?: string
    longitude?: string
    radius?: string
  }>({})

  // Update inputs when initial location changes
  React.useEffect(() => {
    if (initialLocation) {
      setLatitude(initialLocation.latitude.toString())
      setLongitude(initialLocation.longitude.toString())
    }
  }, [initialLocation])

  // Validate inputs
  const validateInputs = () => {
    const newErrors: typeof errors = {}

    if (!latitude.trim()) {
      newErrors.latitude = "Latitude is required"
    } else if (!validation.isValidLatitude(latitude)) {
      newErrors.latitude = "Invalid latitude (-90 to 90)"
    }

    if (!longitude.trim()) {
      newErrors.longitude = "Longitude is required"
    } else if (!validation.isValidLongitude(longitude)) {
      newErrors.longitude = "Invalid longitude (-180 to 180)"
    }

    if (showRadius) {
      if (!radius.trim()) {
        newErrors.radius = "Radius is required"
      } else if (!validation.isValidRadius(radius)) {
        newErrors.radius = "Invalid radius (1-5000 meters)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateInputs()) return

    const location: MapLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    }

    onLocationSelect(location)

    if (showRadius && onRadiusChange) {
      onRadiusChange(parseFloat(radius))
    }

    // Add to search history
    storage.addToSearchHistory(
      `${latitude}, ${longitude}`,
      location,
      "coordinates"
    )
  }

  // Get current location using Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        
        setLatitude(lat.toFixed(6))
        setLongitude(lon.toFixed(6))
        
        const location: MapLocation = {
          latitude: lat,
          longitude: lon,
        }
        
        onLocationSelect(location)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("Unable to get your current location. Please check your browser permissions.")
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }

  // Handle input changes with validation
  const handleLatitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLatitude(value)
    
    if (errors.latitude && validation.isValidLatitude(value)) {
      setErrors(prev => ({ ...prev, latitude: undefined }))
    }
  }

  const handleLongitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLongitude(value)
    
    if (errors.longitude && validation.isValidLongitude(value)) {
      setErrors(prev => ({ ...prev, longitude: undefined }))
    }
  }

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRadius(value)
    
    if (errors.radius && validation.isValidRadius(value)) {
      setErrors(prev => ({ ...prev, radius: undefined }))
    }
  }

  const isFormValid = validation.isValidLatitude(latitude) && 
                     validation.isValidLongitude(longitude) &&
                     (!showRadius || validation.isValidRadius(radius))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Enter Coordinates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Latitude Input */}
            <div className="space-y-2">
              <label htmlFor="latitude" className="text-sm font-medium">
                Latitude
              </label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="40.7128"
                value={latitude}
                onChange={handleLatitudeChange}
                className={errors.latitude ? "border-destructive" : ""}
              />
              {errors.latitude && (
                <p className="text-xs text-destructive">{errors.latitude}</p>
              )}
            </div>

            {/* Longitude Input */}
            <div className="space-y-2">
              <label htmlFor="longitude" className="text-sm font-medium">
                Longitude
              </label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="-74.0060"
                value={longitude}
                onChange={handleLongitudeChange}
                className={errors.longitude ? "border-destructive" : ""}
              />
              {errors.longitude && (
                <p className="text-xs text-destructive">{errors.longitude}</p>
              )}
            </div>
          </div>

          {/* Radius Input */}
          {showRadius && (
            <div className="space-y-2">
              <label htmlFor="radius" className="text-sm font-medium">
                Search Radius (meters)
              </label>
              <Input
                id="radius"
                type="number"
                min="1"
                max="5000"
                placeholder="500"
                value={radius}
                onChange={handleRadiusChange}
                className={errors.radius ? "border-destructive" : ""}
              />
              {errors.radius && (
                <p className="text-xs text-destructive">{errors.radius}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum radius: 5,000 meters (5km)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="submit" 
              disabled={!isFormValid}
              className="flex-1"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Search Location
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              className="flex-1"
            >
              <Target className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Enter coordinates in decimal degrees format</p>
            <p>• NYC coordinates: Lat 40.4774-40.9176, Lon -74.2591--73.7004</p>
            <p>• Example: Times Square is at 40.7580, -73.9855</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}