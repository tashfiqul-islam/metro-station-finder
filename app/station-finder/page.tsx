"use client";

import { AlertCircle, ArrowLeft, List, Map as MapIcon, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetroMap } from "@/components/ui/map";
import { SearchInput } from "@/components/ui/search-input";
import { StationCard } from "@/components/ui/station-card";
import { DHAKA_SERVICE_AREA } from "@/lib/constants";
import { getOperationalStations } from "@/lib/data/stations";
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
}: {
  readonly onSelect: (station: Station) => void;
  readonly selectedStationId: string | undefined;
  readonly stationsWithDistance: readonly StationWithDistance[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stationsWithDistance.map(({ distance, station }) => (
        <StationCard
          {...(distance !== undefined ? { distance } : {})}
          isSelected={selectedStationId === station.id}
          key={station.id}
          onClick={onSelect}
          station={station}
        />
      ))}
    </div>
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

  // Get all operational stations
  const allStations = getOperationalStations();

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
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude as Coordinates["lat"],
          lng: position.coords.longitude as Coordinates["lng"],
        });
      },
      () => {
        // Geolocation error - silently handle
      }
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

        {/* Search Section */}
        <SearchSection
          onClearLocation={() => setUserLocation(undefined)}
          onClearSearch={handleClearSearch}
          onSearchChange={setSearchQuery}
          onUseLocation={handleUseMyLocation}
          searchQuery={searchQuery}
          userLocation={userLocation}
        />

        {/* Results Section */}
        <section
          aria-live="polite"
          aria-relevant="additions removals"
          className="bg-muted/30"
          id="results"
        >
          <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {/* Empty State */}
            {filteredStations.length === 0 && (
              <EmptyState onClear={handleClearSearch} />
            )}

            {/* Map View */}
            {viewMode === "map" && filteredStations.length > 0 && (
              <div className="space-y-4">
                <div className="h-[500px] w-full overflow-hidden rounded-xl border border-border/50 shadow-lg">
                  <MetroMap
                    center={mapCenter}
                    onStationSelect={handleStationSelect}
                    {...(selectedStation ? { selectedStation } : {})}
                    stations={[...filteredStations]}
                    zoom={mapZoom}
                  />
                </div>

                {/* Selected Station Info */}
                {selectedStation && userLocation && (
                  <Card>
                    <CardContent className="pt-6">
                      <StationCard
                        distance={calculateDistancePure(
                          userLocation,
                          selectedStation.coordinates
                        )}
                        onClick={() => setSelectedStation(undefined)}
                        station={selectedStation}
                      />
                    </CardContent>
                  </Card>
                )}
                {selectedStation && !userLocation && (
                  <Card>
                    <CardContent className="pt-6">
                      <StationCard
                        onClick={() => setSelectedStation(undefined)}
                        station={selectedStation}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && filteredStations.length > 0 && (
              <StationsList
                onSelect={handleStationSelect}
                selectedStationId={selectedStation?.id}
                stationsWithDistance={stationsWithDistance}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
