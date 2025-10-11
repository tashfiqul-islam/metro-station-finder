import { Suspense } from "react";
import { MRT6_STATIONS } from "@/lib/data/stations";
import type { Station } from "@/lib/types/station";

/**
 * Server Component for station list
 * Optimized for performance with minimal rendering
 */
export function StationListSuspense() {
  const stations = MRT6_STATIONS;
  const displayStationCount = 3; // Reduced for better performance
  const featuredStations = stations.filter((station: Station) =>
    ["farmgate", "mirpur-10", "motijheel"].includes(station.id)
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {featuredStations
        .slice(0, displayStationCount)
        .map((station: Station) => (
          <div
            className="rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
            key={station.id}
          >
            <h3 className="font-semibold text-foreground">{station.name}</h3>
            <p className="text-muted-foreground text-sm">{station.line}</p>
            <p className="text-muted-foreground text-xs">
              Order: {station.order}
            </p>
          </div>
        ))}
    </div>
  );
}

/**
 * Suspense boundary for map loading
 * Provides fallback UI while map loads
 */
export function MapSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 w-full items-center justify-center rounded-lg border bg-muted">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Suspense boundary for search results
 * Provides fallback UI while search completes
 */
export function SearchResultsSuspense({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
