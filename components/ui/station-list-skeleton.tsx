/**
 * Skeleton component for station list loading states
 * Provides visual feedback during data fetching
 */
export function StationListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

/**
 * Skeleton component for station card loading states
 */
export function StationCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="flex space-x-2">
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton component for map loading states
 */
export function MapSkeleton() {
  return (
    <div className="flex h-96 w-full items-center justify-center rounded-lg border bg-muted">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}
