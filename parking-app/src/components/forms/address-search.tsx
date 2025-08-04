"use client"

import * as React from "react"
import { Search, MapPin, Clock, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { geocoding } from "@/lib/api"
import { MapLocation, SearchHistoryItem } from "@/lib/types"
import { storage, performanceUtils } from "@/lib/utils"

interface AddressSearchProps {
  onLocationSelect: (location: MapLocation) => void
  placeholder?: string
  className?: string
  showHistory?: boolean
}

interface SearchResult {
  lat: number
  lon: number
  display_name: string
}

export function AddressSearch({
  onLocationSelect,
  placeholder = "Search for an address in NYC...",
  className,
  showHistory = true,
}: AddressSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  // Load search history on mount
  React.useEffect(() => {
    if (showHistory) {
      setHistory(storage.getSearchHistory())
    }
  }, [showHistory])

  // Debounced search function
  const debouncedSearch = React.useMemo(
    () => performanceUtils.debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 3) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const searchResults = await geocoding.searchAddress(searchQuery)
        setResults(searchResults)
        setSelectedIndex(-1)
      } catch (error) {
        console.error("Search error:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    
    if (value.trim()) {
      debouncedSearch(value)
    } else {
      setResults([])
    }
  }

  // Handle location selection
  const handleLocationSelect = (location: MapLocation, address: string) => {
    setQuery(address)
    setIsOpen(false)
    setResults([])
    onLocationSelect(location)

    // Add to search history
    if (showHistory) {
      storage.addToSearchHistory(address, location, "address")
      setHistory(storage.getSearchHistory())
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = results.length + (showHistory ? history.length : 0)

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalItems)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems)
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (selectedIndex < results.length) {
            const result = results[selectedIndex]
            handleLocationSelect(
              { latitude: result.lat, longitude: result.lon },
              result.display_name
            )
          } else if (showHistory) {
            const historyIndex = selectedIndex - results.length
            const historyItem = history[historyIndex]
            handleLocationSelect(historyItem.location, historyItem.query)
          }
        }
        break
      case "Escape":
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle clear search
  const handleClear = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Handle clear history
  const handleClearHistory = () => {
    storage.clearSearchHistory()
    setHistory([])
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatAddress = (address: string) => {
    // Simplify long addresses for display
    const parts = address.split(",")
    if (parts.length > 3) {
      return `${parts[0]}, ${parts[1]}, ${parts[2]}`
    }
    return address
  }

  const hasResults = results.length > 0
  const hasHistory = showHistory && history.length > 0
  const shouldShowDropdown = isOpen && (hasResults || hasHistory || isLoading)

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {shouldShowDropdown && (
        <Card
          ref={resultsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto custom-scrollbar"
        >
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* Search Results */}
            {hasResults && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted">
                  Search Results
                </div>
                {results.map((result, index) => (
                  <button
                    key={`result-${index}`}
                    className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0 ${
                      index === selectedIndex ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() =>
                      handleLocationSelect(
                        { latitude: result.lat, longitude: result.lon },
                        result.display_name
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatAddress(result.display_name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Search History */}
            {hasHistory && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted flex items-center justify-between">
                  <span>Recent Searches</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleClearHistory}
                  >
                    Clear
                  </Button>
                </div>
                {history.slice(0, 5).map((item, index) => {
                  const adjustedIndex = results.length + index
                  return (
                    <button
                      key={item.id}
                      className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0 ${
                        adjustedIndex === selectedIndex ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => handleLocationSelect(item.location, item.query)}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.query}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* No results */}
            {!isLoading && !hasResults && !hasHistory && query.length >= 3 && (
              <div className="p-4 text-center">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs text-muted-foreground">
                  Try searching for a specific address or landmark in NYC
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}