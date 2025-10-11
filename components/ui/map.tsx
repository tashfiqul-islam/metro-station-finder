"use client";

import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import {
  AlertCircle,
  Loader2,
  Maximize2,
  Navigation,
  RotateCcw,
} from "lucide-react";
import { useTheme } from "next-themes";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMapProviderWrapper } from "@/components/providers/lazy-map-provider";
import { Card, CardContent } from "@/components/ui/card";
import { useMapAvailability } from "@/lib/hooks/use-map-availability";
import { darkModeMapStyle, lightModeMapStyle } from "@/lib/map/styles";
import type { Coordinates, Latitude, Longitude } from "@/lib/types";
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
  readonly stations?: readonly Station[];
  /** Currently selected station for highlighting */
  readonly selectedStation?: Station;
  /** Callback when a station marker is clicked */
  readonly onStationSelect?: (station: Station) => void;
  /** Additional CSS classes for styling */
  readonly className?: string;
  /** Height of the map container (CSS value) */
  readonly height?: string;
};

const SELECTED_ZOOM = 15;
const DEFAULT_MAP_HEIGHT = "600px";
// Dhaka city center (Shahbagh area - central location)
const DEFAULT_CENTER: Coordinates = {
  lat: 23.7461 as Latitude,
  lng: 90.3742 as Longitude,
};
// Bangladesh bounds - covers entire country (optimized coordinates)
const BANGLADESH_BOUNDS = {
  north: 26.634, // Northernmost point (Sylhet region)
  south: 20.743, // Southernmost point (Cox's Bazar area)
  east: 92.673, // Easternmost point (Chittagong Hill Tracts)
  west: 88.007, // Westernmost point (Rajshahi region)
} as const;

/**
 * Internal map controls component for reset and fullscreen functionality.
 * Separated for cleaner code organization and performance optimization.
 */
const MapControls = memo(function MapControlsComponent({
  center,
  zoom,
  mapContainerRef,
}: {
  readonly center: Coordinates;
  readonly zoom: number;
  readonly mapContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const map = useMap();

  const handleReset = useCallback(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  const handleFullscreen = useCallback(() => {
    if (!mapContainerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapContainerRef.current.requestFullscreen();
    }
  }, [mapContainerRef]);

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <button
        aria-label="Toggle fullscreen"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background/90 backdrop-blur-sm",
          "transition-all duration-200 hover:bg-accent hover:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={handleFullscreen}
        type="button"
      >
        <Maximize2 aria-hidden="true" className="h-4 w-4" />
      </button>
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
  );
});

/**
 * Theme-aware map effects component.
 * Handles dynamic theme switching and camera animations.
 * Optimized to prevent jitter during map interactions.
 */
const MapEffects = memo(function MapEffectsComponent({
  mapStyle,
  selectedStation,
}: {
  readonly mapStyle: google.maps.MapTypeStyle[];
  readonly selectedStation?: Station;
}) {
  const map = useMap();
  const isInitialMount = useRef(true);
  const isDragging = useRef(false);
  const lastStyleRef = useRef<google.maps.MapTypeStyle[]>(mapStyle);

  // Track drag state to prevent updates during interaction
  useEffect(() => {
    if (!map) {
      return;
    }

    const handleDragStart = () => {
      isDragging.current = true;
    };

    const handleDragEnd = () => {
      isDragging.current = false;
    };

    const dragStartListener = map.addListener("dragstart", handleDragStart);
    const dragEndListener = map.addListener("dragend", handleDragEnd);

    return () => {
      dragStartListener.remove();
      dragEndListener.remove();
    };
  }, [map]);

  // Set initial styles and update when theme changes
  useEffect(() => {
    if (!map) {
      return;
    }

    // Always set styles on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastStyleRef.current = mapStyle;
      map.setOptions({ styles: mapStyle });
      return;
    }

    // Skip if dragging or styles haven't changed
    if (isDragging.current || lastStyleRef.current === mapStyle) {
      return;
    }

    lastStyleRef.current = mapStyle;
    // Use requestIdleCallback for non-blocking updates
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        map.setOptions({ styles: mapStyle });
      });
    } else {
      requestAnimationFrame(() => {
        map.setOptions({ styles: mapStyle });
      });
    }
  }, [map, mapStyle]);

  // Pan and zoom to selected station with smooth animation
  useEffect(() => {
    if (map && selectedStation) {
      map.panTo(selectedStation.coordinates);
      map.setZoom(SELECTED_ZOOM);
    }
  }, [map, selectedStation]);

  return null;
});

/**
 * Google Maps component with theme-aware styling and station markers.
 * Uses modern declarative React components from @vis.gl/react-google-maps.
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
const MetroMapInner = memo(function MetroMapComponent({
  center = DEFAULT_CENTER,
  zoom = 12,
  selectedStation,
  className,
  height = DEFAULT_MAP_HEIGHT,
}: MapProps) {
  const { resolvedTheme } = useTheme();
  const { available, reason } = useMapAvailability();
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Apply theme-specific map styling (memoized to prevent re-renders)
  const mapStyle = useMemo(
    () => (resolvedTheme === "dark" ? darkModeMapStyle : lightModeMapStyle),
    [resolvedTheme]
  );

  // Memoize map options to prevent unnecessary re-renders
  const mapOptions = useMemo(
    () => ({
      clickableIcons: false,
      disableDefaultUI: false,
      fullscreenControl: false,
      gestureHandling: "greedy" as const,
      keyboardShortcuts: true,
      mapTypeControl: false,
      restriction: {
        latLngBounds: BANGLADESH_BOUNDS,
        strictBounds: false,
      },
      streetViewControl: false,
      zoomControl: true,
    }),
    []
  );

  // Station markers will be added in Phase 7 for directions feature
  // (showing route from user destination to nearest metro station)

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
          <button
            aria-label="Retry Map"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm",
              "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => {
              // Best-effort retry by soft reload (avoid restricted global)
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Retry Map
          </button>
          <div className="text-muted-foreground text-xs">
            Showing station list instead
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      aria-label="Interactive map of Bangladesh metro stations"
      className={cn("relative h-full", className)}
      data-slot="metro-map"
      ref={mapContainerRef}
      role="application"
      style={{ height }}
    >
      {/* Modern declarative GoogleMap component with proper TypeScript support */}
      <GoogleMap
        className="h-full w-full overflow-hidden rounded-xl"
        defaultCenter={center}
        defaultZoom={zoom}
        onTilesLoaded={() => setIsLoading(false)}
        {...mapOptions}
      >
        {/* Map effects for theme and selection handling */}
        <MapEffects
          mapStyle={mapStyle}
          {...(selectedStation ? { selectedStation } : {})}
        />

        {/* Map controls overlay */}
        <MapControls
          center={center}
          mapContainerRef={mapContainerRef}
          zoom={zoom}
        />
      </GoogleMap>

      {/* Loading overlay with smooth fade-out */}
      {isLoading && (
        <output
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/90 backdrop-blur-sm transition-opacity duration-300"
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin text-primary"
            />
            <span>Loading map...</span>
          </div>
        </output>
      )}
    </div>
  );
});

/**
 * MetroMap component wrapped with lazy Google Maps provider for better bfcache compatibility.
 */
export const MetroMap = memo(function MetroMapWrapper(props: MapProps) {
  return (
    <LazyMapProviderWrapper>
      <MetroMapInner {...props} />
    </LazyMapProviderWrapper>
  );
});
