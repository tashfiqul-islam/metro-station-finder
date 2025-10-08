import { Suspense } from "react";
import { StationDataServer } from "@/components/server/station-data";
import { StationListSkeleton } from "@/components/ui/station-list-skeleton";

/**
 * React 19 Suspense boundary for station list streaming
 * Demonstrates modern streaming and lazy loading patterns
 */
export function StationListSuspense() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <StationListSkeleton />
          <StationListSkeleton />
          <StationListSkeleton />
        </div>
      }
    >
      <StationDataServer />
    </Suspense>
  );
}

/**
 * React 19 Suspense boundary for map loading
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
 * React 19 Suspense boundary for search results
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
