"use client";

import { useDeferredValue, useMemo, useTransition } from "react";
import type { Station } from "@/lib/types/station";

/**
 * Enhanced search hook with useDeferredValue for optimal performance
 * Keeps search input responsive while deferring heavy operations
 */
export function useDeferredSearch(query: string, results: Station[]) {
  const [isPending, startTransition] = useTransition();

  // Defer the query to keep input responsive
  const deferredQuery = useDeferredValue(query);

  // Defer the results to prevent blocking during rapid changes
  const deferredResults = useDeferredValue(results);

  // Check if we're showing stale data
  const isStale = query !== deferredQuery;

  // Memoize filtered results to prevent unnecessary re-renders
  const filteredResults = useMemo(() => {
    if (!deferredQuery.trim()) {
      return deferredResults;
    }

    return deferredResults.filter(
      (station) =>
        station.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
        station.line.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [deferredQuery, deferredResults]);

  return {
    deferredQuery,
    deferredResults: filteredResults,
    isStale,
    isPending,
    startTransition,
  } as const;
}

/**
 * Hook for deferred map rendering
 * Prevents map from blocking during rapid state changes
 */
export function useDeferredMap(center: { lat: number; lng: number }, zoom: number) {
  const deferredCenter = useDeferredValue(center);
  const deferredZoom = useDeferredValue(zoom);
  const isStale = center !== deferredCenter || zoom !== deferredZoom;

  return {
    deferredCenter,
    deferredZoom,
    isStale,
  } as const;
}

/**
 * Hook for deferred station list rendering
 * Keeps station selection responsive during filtering
 */
export function useDeferredStationList(stations: Station[], selectedId?: string) {
  const deferredStations = useDeferredValue(stations);
  const deferredSelectedId = useDeferredValue(selectedId);
  const isStale = stations !== deferredStations || selectedId !== deferredSelectedId;

  return {
    deferredStations,
    deferredSelectedId,
    isStale,
  } as const;
}
