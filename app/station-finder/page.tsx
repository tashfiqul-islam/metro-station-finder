"use client";

import {
  AlertCircle,
  ArrowLeft,
  List,
  Map as MapIcon,
  Route,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetroMap } from "@/components/ui/map";
import { SearchInput } from "@/components/ui/search-input";
import { StationCard } from "@/components/ui/station-card";
import { getQuotaStatus } from "@/lib/api/places";
import { DHAKA_SERVICE_AREA } from "@/lib/constants";
import { getOperationalStations } from "@/lib/data/stations";
import { isWithinServiceArea } from "@/lib/hooks/use-geolocation";
import type { Coordinates, Meters } from "@/lib/types";
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

// Precision for directions URL lat/lng values
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
                <MetroMap
                  center={mapCenter}
                  onStationSelect={onSelect}
                  {...(selectedStation ? { selectedStation } : {})}
                  stations={[...filteredStations]}
                  zoom={mapZoom}
                />
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
            <StationsList
              onSelect={onSelect}
              selectedStationId={selectedStation?.id}
              stationsWithDistance={stationsWithDistance}
              userLocation={userLocation}
            />
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
}: {
  readonly onClearLocation: () => void;
  readonly onClearSearch: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly onUseLocation: () => void;
  readonly searchQuery: string;
  readonly userLocation: Coordinates | undefined;
}) {
  return (
    <section aria-label="Station search" className="bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
            onClick={onUseLocation}
            variant="outline"
          >
            <MapIcon aria-hidden="true" className="mr-2 h-4 w-4" />
            Use My Location
          </Button>
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
 * Station Finder page for discovering and exploring metro stations.
 * Features search, interactive map, list view, and geolocation support.
 */
export default function StationFinderPage() {
  const searchParams = useSearchParams();
  const initialStationId = searchParams.get("station");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [userLocation, setUserLocation] = useState<Coordinates | undefined>();
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [messageId, setMessageId] = useState<string | undefined>(undefined);
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");

  // Get all operational stations
  const allStations = getOperationalStations();
  // Quota status (computed on demand; adapter is synchronous)
  const quota = useMemo(() => getQuotaStatus(), []);
  const isRateLimited = quota.success ? quota.data.isRateLimited : false;

  // Initialize selected station from URL parameter
  useEffect(() => {
    if (initialStationId) {
      const station = allStations.find((s) => s.id === initialStationId);
      if (station) {
        setSelectedStation(station);
      }
    }
  }, [initialStationId, allStations]);

  /**
   * Filter stations based on search query.
   * Searches station name and aliases for matches.
   */
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) {
      return allStations;
    }

    const query = searchQuery.toLowerCase();
    return allStations.filter((station) => {
      const matchName = station.name.toLowerCase().includes(query);
      const matchAlias = station.aliases.some((alias) =>
        alias.toLowerCase().includes(query)
      );
      return matchName || matchAlias;
    });
  }, [allStations, searchQuery]);

  /**
   * Calculate distances and sort stations by proximity to user location.
   */
  const stationsWithDistance = useMemo<readonly StationWithDistance[]>(() => {
    if (!userLocation) {
      return filteredStations.map((station) => ({
        station,
        distance: undefined,
      }));
    }

    return filteredStations
      .map((station) => ({
        station,
        distance: calculateDistancePure(userLocation, station.coordinates),
      }))
      .sort((a, b) => {
        if (a.distance === undefined || b.distance === undefined) {
          return 0;
        }
        return a.distance - b.distance;
      });
  }, [filteredStations, userLocation]);

  /**
   * Request user's current geolocation.
   */
  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setMessageId("err.provider_unavailable");
      return;
    }
    // Show rationale before prompting
    setMessageId("note.geo_denied");
    setIsGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude as Coordinates["lat"],
          lng: position.coords.longitude as Coordinates["lng"],
        };
        // Validate service area (25 km from centroid)
        if (isWithinServiceArea(loc)) {
          setMessageId(undefined);
          setUserLocation(loc);
        } else {
          setMessageId("err.out_of_area");
          setUserLocation(undefined);
        }
        setIsGeoLoading(false);
      },
      () => {
        setIsGeoLoading(false);
        setMessageId("note.geo_denied");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
  }, []);

  /**
   * Clear search query and reset selected station.
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedStation(undefined);
  }, []);

  /**
   * Handle station selection from map or list.
   */
  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  /**
   * Calculate center coordinates for map display.
   */
  const mapCenter = useMemo<Coordinates>(() => {
    if (selectedStation) {
      return selectedStation.coordinates;
    }
    if (userLocation) {
      return userLocation;
    }
    return DHAKA_SERVICE_AREA.centroid;
  }, [selectedStation, userLocation]);

  /**
   * Calculate zoom level based on selection state.
   */
  const mapZoom = useMemo<number>(() => {
    if (selectedStation || userLocation) {
      return MAP_ZOOM.selected;
    }
    return MAP_ZOOM.default;
  }, [selectedStation, userLocation]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button asChild size="icon" variant="ghost">
              <Link href="/">
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Back to home</span>
              </Link>
            </Button>
            <h1 className="font-semibold text-foreground text-lg">
              Station Finder
            </h1>
            <Badge className="hidden sm:inline-flex" variant="secondary">
              {filteredStations.length} station
              {filteredStations.length !== 1 ? "s" : ""}
            </Badge>
            {isRateLimited && (
              <Badge className="hidden sm:inline-flex" variant="secondary">
                Autocomplete disabled
              </Badge>
            )}
          </div>

          {/* View Mode Toggle */}
          <div
            aria-label="View mode selection"
            className="flex gap-1 rounded-lg bg-muted p-1"
            role="radiogroup"
          >
            <Button
              aria-checked={viewMode === "map"}
              className={cn(
                "h-8 gap-2 px-3",
                viewMode === "map" && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode("map")}
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
                "h-8 gap-2 px-3",
                viewMode === "list" && "bg-background shadow-sm"
              )}
              onClick={() => setViewMode("list")}
              role="radio"
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
            >
              <List aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Skip to Results Link */}
        <a
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50"
          href="#results"
        >
          Skip to results
        </a>

        {/* Live region for geolocation and system messages */}
        <output aria-live="polite" className="sr-only">
          {messageId ? messageId : ""}
        </output>

        {/* Search Section */}
        <SearchSection
          onClearLocation={() => setUserLocation(undefined)}
          onClearSearch={handleClearSearch}
          onSearchChange={setSearchQuery}
          onUseLocation={handleUseMyLocation}
          searchQuery={searchQuery}
          userLocation={userLocation}
        />

        {/* Manual lat/lng fallback when Places disabled or rate-limited */}
        {(isRateLimited || messageId === "err.provider_unavailable") && (
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
                      setMessageId("err.invalid_coordinates");
                      return;
                    }
                    const loc = {
                      lat: latNum as Coordinates["lat"],
                      lng: lngNum as Coordinates["lng"],
                    };
                    if (isWithinServiceArea(loc)) {
                      setMessageId(undefined);
                      setUserLocation(loc);
                    } else {
                      setMessageId("err.out_of_area");
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

        {/* Announce nearest station when location is set */}
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
    </div>
  );
}
