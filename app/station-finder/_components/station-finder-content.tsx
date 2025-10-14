"use client";

import { AlertCircle, List, Map as MapIcon, Route, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  MapErrorBoundary,
  StationErrorBoundary,
} from "@/components/error/station-error-boundary";
import { MapSuspense } from "@/components/suspense/station-list-suspense";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load the map component to reduce initial bundle size
const MetroMap = dynamic(
  () =>
    import("@/components/ui/map").then((mod) => ({ default: mod.MetroMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-xl bg-muted" />
    ),
  }
);

import { SearchInput } from "@/components/ui/search-input";
import { StationCard } from "@/components/ui/station-card";
import {
  requestCurrentLocation,
  validateServiceArea,
} from "@/lib/api/geolocation";
import { getQuotaStatus } from "@/lib/api/places";
import { getAllStations, searchStations } from "@/lib/api/stations";
import {
  COPY_DECK,
  DHAKA_SERVICE_AREA,
  SEARCH_CONSTANTS,
} from "@/lib/constants";
import type { Coordinates, Meters, Milliseconds } from "@/lib/types";
import type { Station } from "@/lib/types/station";
import { cn } from "@/lib/utils";
import { calculateDistancePure } from "@/lib/utils/distance";

/**
 * View mode type for toggling between map and list views.
 */
type ViewMode = "map" | "list";

/**
 * Station with calculated distance from user location.
 */
type StationWithDistance = {
  readonly station: Station;
  readonly distance: Meters | undefined;
};

/**
 * Map zoom levels for different contexts.
 */
const MAP_ZOOM = {
  selected: 14,
  default: 12,
} as const;

/**
 * UX timing constants
 */
const UX_TIMING = {
  rationaleDelayMs: 1000,
} as const;

const COORD_PRECISION = 6;

/**
 * Renders the empty state when no stations match search criteria.
 */
function EmptyState({ onClear }: { readonly onClear: () => void }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle
            aria-hidden="true"
            className="h-6 w-6 text-muted-foreground"
          />
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-lg">No stations found</h2>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search criteria or{" "}
            <button
              className="text-primary underline-offset-4 hover:underline"
              onClick={onClear}
              type="button"
            >
              clear all filters
            </button>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders station results in list view with distance information.
 */
function StationsList({
  stationsWithDistance,
  selectedStationId,
  onSelect,
  userLocation,
}: {
  readonly onSelect: (station: Station) => void;
  readonly selectedStationId: string | undefined;
  readonly stationsWithDistance: readonly StationWithDistance[];
  readonly userLocation?: Coordinates | undefined;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stationsWithDistance.map(({ distance, station }) => (
        <div className="space-y-2" key={station.id}>
          <StationCard
            {...(distance !== undefined ? { distance } : {})}
            isSelected={selectedStationId === station.id}
            onClick={onSelect}
            station={station}
          />
          {userLocation && (
            <div>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat.toFixed(COORD_PRECISION)},${userLocation.lng.toFixed(COORD_PRECISION)}&destination=${station.coordinates.lat.toFixed(COORD_PRECISION)},${station.coordinates.lng.toFixed(COORD_PRECISION)}&travelmode=walking`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Route aria-hidden="true" className="h-4 w-4" />
                Open Directions (walking)
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultsSection({
  viewMode,
  filteredStations,
  selectedStation,
  mapCenter,
  mapZoom,
  onSelect,
  stationsWithDistance,
  userLocation,
  isGeoLoading,
}: {
  readonly viewMode: ViewMode;
  readonly filteredStations: readonly Station[];
  readonly selectedStation?: Station | undefined;
  readonly mapCenter: Coordinates;
  readonly mapZoom: number;
  readonly onSelect: (station: Station) => void;
  readonly stationsWithDistance: readonly StationWithDistance[];
  readonly userLocation?: Coordinates | undefined;
  readonly isGeoLoading: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="bg-muted/30 py-6">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-[500px] w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      }
    >
      <section
        aria-busy={isGeoLoading}
        aria-live="polite"
        aria-relevant="additions removals"
        className="bg-muted/30"
        id="results"
      >
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {filteredStations.length === 0 && (
            <EmptyState onClear={onSelect as unknown as () => void} />
          )}

          {viewMode === "map" && filteredStations.length > 0 && (
            <div className="space-y-4">
              <div className="h-[500px] w-full overflow-hidden rounded-xl border border-border/50 shadow-lg">
                <MapErrorBoundary>
                  <MapSuspense>
                    <MetroMap
                      center={mapCenter}
                      onStationSelect={onSelect}
                      {...(selectedStation ? { selectedStation } : {})}
                      stations={[...filteredStations]}
                      zoom={mapZoom}
                    />
                  </MapSuspense>
                </MapErrorBoundary>
              </div>

              {selectedStation && userLocation && (
                <Card>
                  <CardContent className="pt-6">
                    <StationCard
                      distance={calculateDistancePure(
                        userLocation,
                        selectedStation.coordinates
                      )}
                      onClick={() => onSelect(selectedStation)}
                      station={selectedStation}
                    />
                    <div className="mt-4">
                      <a
                        className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat.toFixed(COORD_PRECISION)},${userLocation.lng.toFixed(COORD_PRECISION)}&destination=${selectedStation.coordinates.lat.toFixed(COORD_PRECISION)},${selectedStation.coordinates.lng.toFixed(COORD_PRECISION)}&travelmode=walking`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <Route aria-hidden="true" className="h-4 w-4" />
                        Open Directions (walking)
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
              {selectedStation && !userLocation && (
                <Card>
                  <CardContent className="pt-6">
                    <StationCard
                      onClick={() => onSelect(selectedStation)}
                      station={selectedStation}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === "list" && filteredStations.length > 0 && (
            <StationErrorBoundary>
              <StationsList
                onSelect={onSelect}
                selectedStationId={selectedStation?.id}
                stationsWithDistance={stationsWithDistance}
                userLocation={userLocation}
              />
            </StationErrorBoundary>
          )}
        </div>
      </section>
    </Suspense>
  );
}

/**
 * Renders the search section with input and location button.
 */
function SearchSection({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onUseLocation,
  onClearLocation,
  userLocation,
  onShowRationale,
  viewMode,
  onViewModeChange,
}: {
  readonly onClearLocation: () => void;
  readonly onClearSearch: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly onUseLocation: () => void;
  readonly searchQuery: string;
  readonly userLocation: Coordinates | undefined;
  readonly onShowRationale: () => void;
  readonly viewMode: ViewMode;
  readonly onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <section aria-label="Station search" className="bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchInput
                onChange={(e) => onSearchChange(e.target.value)}
                onClear={onClearSearch}
                placeholder="Search stations by name..."
                value={searchQuery}
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onShowRationale();
                setTimeout(() => {
                  onUseLocation();
                }, UX_TIMING.rationaleDelayMs);
              }}
              variant="outline"
            >
              <MapIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              Use My Location
            </Button>
            <div
              aria-label="View mode selection"
              className="flex gap-1 rounded-lg bg-muted p-1"
              role="radiogroup"
            >
              <Button
                aria-checked={viewMode === "map"}
                className={cn(
                  "h-9 gap-2 px-3",
                  viewMode === "map" && "bg-background shadow-sm"
                )}
                onClick={() => onViewModeChange("map")}
                role="radio"
                size="sm"
                variant={viewMode === "map" ? "secondary" : "ghost"}
              >
                <MapIcon aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </Button>
              <Button
                aria-checked={viewMode === "list"}
                className={cn(
                  "h-9 gap-2 px-3",
                  viewMode === "list" && "bg-background shadow-sm"
                )}
                onClick={() => onViewModeChange("list")}
                role="radio"
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
              >
                <List aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>
        </div>

        {(searchQuery || userLocation) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchQuery && (
              <Badge className="gap-1" variant="secondary">
                <span>Search: {searchQuery}</span>
                <button
                  aria-label="Clear search"
                  className="rounded-full hover:bg-foreground/10"
                  onClick={onClearSearch}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {userLocation && (
              <Badge className="gap-1" variant="secondary">
                <span>Sorted by distance</span>
                <button
                  aria-label="Clear location filter"
                  className="rounded-full hover:bg-foreground/10"
                  onClick={onClearLocation}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Station Finder content component with all client-side logic.
 */
export function StationFinderContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [userLocation, setUserLocation] = useState<Coordinates | undefined>();
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [messageId, setMessageId] = useState<
    keyof typeof COPY_DECK | undefined
  >(undefined);
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");

  const allStationsResponse = useMemo(() => getAllStations(), []);
  const allStations = allStationsResponse.success
    ? allStationsResponse.data
    : [];

  const quota = useMemo(() => getQuotaStatus(), []);
  const isRateLimited = quota.success ? quota.data.isRateLimited : false;

  // Handle initial station from URL params
  useEffect(() => {
    const initialStationId = searchParams.get("station");
    if (initialStationId) {
      const station = allStations.find(
        (s: Station) => s.id === initialStationId
      );
      if (station) {
        setSelectedStation(station);
      }
    }
  }, [searchParams, allStations]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) {
      return allStations;
    }

    const searchResponse = searchStations(
      searchQuery,
      SEARCH_CONSTANTS.maxResultsDefault
    );
    return searchResponse.success
      ? searchResponse.data.map(
          (r: import("@/lib/types/station").StationSearchResult) => r.station
        )
      : [];
  }, [allStations, searchQuery]);

  const stationsWithDistance = useMemo<readonly StationWithDistance[]>(() => {
    if (!userLocation) {
      return filteredStations.map((station: Station) => ({
        station,
        distance: undefined,
      }));
    }

    return filteredStations
      .map((station: Station) => ({
        station,
        distance: calculateDistancePure(userLocation, station.coordinates),
      }))
      .sort((a: StationWithDistance, b: StationWithDistance) => {
        if (a.distance === undefined || b.distance === undefined) {
          return 0;
        }
        return a.distance - b.distance;
      });
  }, [filteredStations, userLocation]);

  const handleUseMyLocation = useCallback(async () => {
    setMessageId("geoRationale");
    setIsGeoLoading(true);

    try {
      const locationResponse = await requestCurrentLocation({
        enableHighAccuracy: true,
        maximumAge: 0 as Milliseconds,
        timeout: 10_000 as Milliseconds,
      });

      if (!locationResponse.success) {
        switch (locationResponse.error.code) {
          case "GEO_UNAVAILABLE":
            setMessageId("geoUnavailable");
            break;
          case "GEO_DENIED":
            setMessageId("geoDenied");
            break;
          case "GEO_TIMEOUT":
            setMessageId("geoTimeout");
            break;
          default:
            setMessageId("providerUnavailable");
        }
        setUserLocation(undefined);
        setIsGeoLoading(false);
        return;
      }

      const coordinates = locationResponse.data.coordinates;
      const validationResponse = validateServiceArea(coordinates);

      if (!validationResponse.success) {
        setMessageId("providerUnavailable");
        setUserLocation(undefined);
        setIsGeoLoading(false);
        return;
      }

      if (validationResponse.data.isValid) {
        setMessageId("locationFound");
        setUserLocation(coordinates);
      } else {
        setMessageId("outOfArea");
        setUserLocation(undefined);
      }
    } catch {
      setMessageId("providerUnavailable");
      setUserLocation(undefined);
    } finally {
      setIsGeoLoading(false);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedStation(undefined);
  }, []);

  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  const mapCenter = useMemo<Coordinates>(() => {
    if (selectedStation) {
      return selectedStation.coordinates;
    }
    if (userLocation) {
      return userLocation;
    }
    return DHAKA_SERVICE_AREA.centroid;
  }, [selectedStation, userLocation]);

  const mapZoom = useMemo<number>(() => {
    if (selectedStation || userLocation) {
      return MAP_ZOOM.selected;
    }
    return MAP_ZOOM.default;
  }, [selectedStation, userLocation]);

  return (
    <main className="pb-4 md:pb-16">
      <output aria-live="polite" className="sr-only">
        {messageId ? COPY_DECK[messageId] : ""}
      </output>

      <SearchSection
        onClearLocation={() => setUserLocation(undefined)}
        onClearSearch={handleClearSearch}
        onSearchChange={setSearchQuery}
        onShowRationale={() => setMessageId("geoRationale")}
        onUseLocation={handleUseMyLocation}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        userLocation={userLocation}
        viewMode={viewMode}
      />

      {(isRateLimited || messageId === "providerUnavailable") && (
        <section aria-label="Manual location entry" className="bg-background">
          <div className="container mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="manual-lat"
                >
                  Latitude
                </label>
                <input
                  className="h-10 rounded-md border border-border/50 bg-background px-3 text-sm"
                  id="manual-lat"
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g., 23.7779"
                  value={manualLat}
                />
              </div>
              <div className="flex flex-col">
                <label
                  className="text-muted-foreground text-sm"
                  htmlFor="manual-lng"
                >
                  Longitude
                </label>
                <input
                  className="h-10 rounded-md border border-border/50 bg-background px-3 text-sm"
                  id="manual-lng"
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g., 90.3971"
                  value={manualLng}
                />
              </div>
              <Button
                onClick={() => {
                  const latNum = Number(manualLat);
                  const lngNum = Number(manualLng);
                  const minLat = -90;
                  const maxLat = 90;
                  const minLng = -180;
                  const maxLng = 180;
                  const valid =
                    Number.isFinite(latNum) &&
                    Number.isFinite(lngNum) &&
                    latNum >= minLat &&
                    latNum <= maxLat &&
                    lngNum >= minLng &&
                    lngNum <= maxLng;
                  if (!valid) {
                    setMessageId("providerUnavailable");
                    return;
                  }
                  const loc = {
                    lat: latNum as Coordinates["lat"],
                    lng: lngNum as Coordinates["lng"],
                  };
                  const validationResponse = validateServiceArea(loc);
                  if (
                    validationResponse.success &&
                    validationResponse.data.isValid
                  ) {
                    setMessageId("locationFound");
                    setUserLocation(loc);
                  } else {
                    setMessageId("outOfArea");
                    setUserLocation(undefined);
                  }
                }}
                type="button"
                variant="outline"
              >
                Use coordinates
              </Button>
            </div>
          </div>
        </section>
      )}

      {userLocation &&
        Array.isArray(stationsWithDistance) &&
        stationsWithDistance.length > 0 && (
          <output aria-live="polite" className="sr-only">
            Nearest station is {stationsWithDistance[0].station.name}
          </output>
        )}

      <ResultsSection
        filteredStations={filteredStations}
        isGeoLoading={isGeoLoading}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        onSelect={handleStationSelect}
        selectedStation={selectedStation}
        stationsWithDistance={stationsWithDistance}
        userLocation={userLocation}
        viewMode={viewMode}
      />
    </main>
  );
}
