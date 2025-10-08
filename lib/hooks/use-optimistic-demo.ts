"use client";

import { useOptimistic, useTransition } from "react";
import type { Station } from "@/lib/types/station";

/**
 * Demo hook showcasing React 19's useOptimistic pattern
 * Demonstrates optimistic updates for station search
 */
export function useOptimisticDemo(initialStations: Station[] = []) {
  const [isPending, startTransition] = useTransition();

  const [optimisticStations, addOptimisticStation] = useOptimistic(
    initialStations,
    (prevState, newStation: Station) => {
      // Add the new station optimistically
      return [...prevState, newStation];
    }
  );

  const [optimisticQuery, setOptimisticQuery] = useOptimistic(
    "",
    (_prevState, newQuery: string) => {
      // Update query optimistically
      return newQuery;
    }
  );

  /**
   * Optimistically add a station
   * This provides instant UI feedback while the actual operation completes
   */
  const addStationOptimistically = (station: Station) => {
    startTransition(() => {
      addOptimisticStation(station);
    });
  };

  /**
   * Optimistically update search query
   * This provides instant UI feedback while search completes
   */
  const updateQueryOptimistically = (query: string) => {
    startTransition(() => {
      setOptimisticQuery(query);
    });
  };

  return {
    optimisticStations,
    optimisticQuery,
    isPending,
    addStationOptimistically,
    updateQueryOptimistically,
  };
}
