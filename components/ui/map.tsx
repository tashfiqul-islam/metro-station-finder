"use client";

import {
  AlertCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useMapAvailability } from "@/lib/hooks/use-map-availability";
import { darkModeMapStyle, lightModeMapStyle } from "@/lib/map/styles";
import type { Coordinates, Latitude, Longitude, StationId } from "@/lib/types";
import type { Station } from "@/lib/types/station";
import { cn } from "@/lib/utils";

/**
 * Props for the MetroMap component.
 * Interactive Google Maps integration with station markers and theme support.
 */
export type MapProps = {
  /** Center coordinates for map initialization */
  readonly center?: Coordinates;
  /** Initial zoom level (1-20) */
  readonly zoom?: number;
  /** Array of stations to display as markers */
  readonly stations?: Station[];
  /** Currently selected station for highlighting */
  readonly selectedStation?: Station;
  /** Callback when a station marker is clicked */
  readonly onStationSelect?: (station: Station) => void;
  /** Additional CSS classes for styling */
  readonly className?: string;
  /** Height of the map container (CSS value) */
  readonly height?: string;
};

const MARKER_SIZE = 28;
const SELECTED_ZOOM = 15;
const DEFAULT_CENTER: Coordinates = {
  lat: 23.8103 as Latitude,
  lng: 90.4125 as Longitude,
};
const DHAKA_BOUNDS = {
  north: 24.0,
  south: 23.5,
  east: 90.8,
  west: 90.0,
} as const;

/**
 * Google Maps component with theme-aware styling and station markers.
 * Provides fallback UI when maps are unavailable and handles errors gracefully.
 *
 * @example
 * ```tsx
 * <MetroMap
 *   center={dhakaCenter}
 *   stations={allStations}
 *   selectedStation={selected}
 *   onStationSelect={(station) => setSelected(station)}
 * />
 * ```
 */
export function MetroMap({
  center = DEFAULT_CENTER,
  zoom = 12,
  stations = [],
  selectedStation,
  onStationSelect,
  className,
  height = "400px",
}: MapProps) {
  const { theme, resolvedTheme } = useTheme();
  const { available, reason } = useMapAvailability();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Apply theme-specific map styling
  const mapStyle = useMemo(() => {
    const currentTheme = resolvedTheme || theme;
    return currentTheme === "dark" ? darkModeMapStyle : lightModeMapStyle;
  }, [theme, resolvedTheme]);

  // Determine marker color based on selection state and current theme
  const getMarkerColor = useCallback(
    (isSelected: boolean): string => {
      const isDark = resolvedTheme === "dark";

      if (isSelected) {
        return isDark ? "#60a5fa" : "#3b82f6";
      }

      return isDark ? "#3b82f6" : "#1d4ed8";
    },
    [resolvedTheme]
  );

  // Generate SVG marker icon with theme-appropriate colors
  const createMarkerIcon = useCallback(
    (isSelected: boolean): google.maps.Icon => {
      const color = getMarkerColor(isSelected);
      const svg = `
        <svg width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      `;

      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new window.google.maps.Size(MARKER_SIZE, MARKER_SIZE),
        anchor: new window.google.maps.Point(MARKER_SIZE / 2, MARKER_SIZE / 2),
      };
    },
    [getMarkerColor]
  );

  // Initialize Google Maps instance on component mount
  useEffect(() => {
    if (!(available && mapRef.current) || mapLoaded) {
      return;
    }

    const initializeMap = () => {
      try {
        if (typeof window === "undefined" || !window.google) {
          throw new Error("Google Maps API not loaded");
        }

        const map = new window.google.maps.Map(
          mapRef.current as HTMLDivElement,
          {
            center,
            zoom,
            styles: mapStyle,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            keyboardShortcuts: true,
            restriction: {
              latLngBounds: DHAKA_BOUNDS,
              strictBounds: false,
            },
          }
        );

        googleMapRef.current = map;
        setMapLoaded(true);
        setMapError(null);
      } catch (error) {
        setMapError(
          error instanceof Error ? error.message : "Failed to load map"
        );
      }
    };

    initializeMap();
  }, [available, center, zoom, mapStyle, mapLoaded]);

  // Re-apply map styling when user changes theme
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setOptions({ styles: mapStyle });
    }
  }, [mapStyle, mapLoaded]);

  // Create a new map marker for a station
  const createNewMarker = useCallback(
    (station: Station, map: google.maps.Map, isSelected: boolean) => {
      const marker = new window.google.maps.Marker({
        position: station.coordinates,
        map,
        title: station.name,
        icon: createMarkerIcon(isSelected),
        animation: isSelected ? window.google.maps.Animation.BOUNCE : null,
        optimized: true,
      });

      marker.addListener("click", () => {
        onStationSelect?.(station);
      });

      return marker;
    },
    [createMarkerIcon, onStationSelect]
  );

  // Update marker appearance when selection state changes
  const updateExistingMarker = useCallback(
    (marker: google.maps.Marker, isSelected: boolean) => {
      marker.setIcon(createMarkerIcon(isSelected));
      marker.setAnimation(
        isSelected ? window.google.maps.Animation.BOUNCE : null
      );
    },
    [createMarkerIcon]
  );

  // Clean up markers for stations no longer in the list
  const removeStaleMarkers = useCallback(
    (
      currentMarkers: Map<string, google.maps.Marker>,
      stationIds: Set<string>
    ) => {
      for (const [id, marker] of currentMarkers.entries()) {
        if (!stationIds.has(id)) {
          marker.setMap(null);
          currentMarkers.delete(id as StationId);
        }
      }
    },
    []
  );

  // Sync markers with current station list and selection state
  useEffect(() => {
    if (!(googleMapRef.current && mapLoaded && stations.length)) {
      return;
    }

    const map = googleMapRef.current;
    const currentMarkers = markersRef.current;
    const selectedId = selectedStation?.id;
    const stationIdSet = new Set(stations.map((s) => s.id as string));

    // Update or create marker for each station
    for (const station of stations) {
      const existingMarker = currentMarkers.get(station.id);
      const isSelected = selectedId === station.id;

      if (existingMarker) {
        updateExistingMarker(existingMarker, isSelected);
      } else {
        const newMarker = createNewMarker(station, map, isSelected);
        currentMarkers.set(station.id, newMarker);
      }
    }

    // Remove markers for stations no longer present
    removeStaleMarkers(currentMarkers, stationIdSet);
  }, [
    stations,
    selectedStation,
    mapLoaded,
    createNewMarker,
    updateExistingMarker,
    removeStaleMarkers,
  ]);

  // Pan and zoom to selected station when selection changes
  useEffect(() => {
    if (googleMapRef.current && selectedStation) {
      googleMapRef.current.panTo(selectedStation.coordinates);
      googleMapRef.current.setZoom(SELECTED_ZOOM);
    }
  }, [selectedStation]);

  // Remove all markers when component unmounts
  useEffect(
    () => () => {
      for (const marker of markersRef.current.values()) {
        marker.setMap(null);
      }
      markersRef.current.clear();
    },
    []
  );

  // Reset map to initial center and zoom level
  const handleReset = useCallback(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter(center);
      googleMapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  // Show fallback message when maps cannot be loaded
  if (!available) {
    return (
      <Card
        className={cn(
          "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
          className
        )}
        style={{ height }}
      >
        <CardContent className="flex h-full flex-col items-center justify-center py-12 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mb-4 h-12 w-12 text-muted-foreground"
          />
          <h3 className="mb-2 font-semibold text-card-foreground text-lg">
            Map Unavailable
          </h3>
          <p className="mb-4 max-w-md text-muted-foreground text-sm">
            {reason === "disabled-by-env" && "Maps are currently disabled."}
            {reason === "missing-api-key" && "Google Maps API key is required."}
            {reason === "offline" &&
              "You're currently offline. Maps require an internet connection."}
            {reason === "ok" && "Map is loading..."}
          </p>
          <div className="text-muted-foreground text-xs">
            Showing station list instead
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display error message with retry option
  if (mapError) {
    return (
      <Card
        className={cn(
          "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm",
          className
        )}
        style={{ height }}
      >
        <CardContent className="flex h-full flex-col items-center justify-center py-12 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mb-4 h-12 w-12 text-destructive"
          />
          <h3 className="mb-2 font-semibold text-card-foreground text-lg">
            Map Error
          </h3>
          <p className="mb-4 max-w-md text-muted-foreground text-sm">
            {mapError}
          </p>
          <button
            className={cn(
              "rounded-lg border border-border bg-background px-4 py-2 text-sm transition-colors hover:bg-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => {
              setMapError(null);
              setMapLoaded(false);
            }}
            type="button"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn("relative h-full", className)}
      data-slot="metro-map"
      style={{ height }}
    >
      {/* Map container */}
      <div
        aria-label="Interactive map showing metro stations"
        className="h-full w-full overflow-hidden rounded-xl"
        ref={mapRef}
        role="img"
      />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          aria-label="Reset map view"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background/90 backdrop-blur-sm",
            "transition-all duration-200 hover:bg-accent hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={handleReset}
          type="button"
        >
          <Navigation aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Map attribution */}
      <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between rounded-lg bg-background/80 px-2 py-1 text-muted-foreground text-xs backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="h-3 w-3" />
          <span>{stations.length} stations</span>
        </div>
        <a
          aria-label="Open in Google Maps"
          className="flex items-center gap-1 transition-colors hover:text-foreground"
          href="https://maps.google.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span>Google Maps</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin text-primary"
            />
            <span>Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
