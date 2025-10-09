import { Suspense } from "react";
import { MRT6_STATIONS } from "@/lib/data/stations";
import type { Station } from "@/lib/types/station";

/**
 * Server Component for station list
 * No Suspense or use() needed for static data
 */
export function StationListSuspense() {
  const stations = MRT6_STATIONS;
  const displayStationCount = 5;
  return (
    <div className="station-data-server">
      <h2>Station Data (Server Component)</h2>
      <p>Total stations: {stations.length}</p>
      <ul>
        {stations.slice(0, displayStationCount).map((station: Station) => (
          <li key={station.id}>
            {station.name} - {station.line}
          </li>
        ))}
      </ul>
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
