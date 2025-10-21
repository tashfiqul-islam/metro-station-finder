"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useOptimistic, useTransition } from "react";
import type { Station } from "@/lib/types/station";

/**
 * Router Select Component pattern for station selection
 * Synchronizes selected stations with URL parameters
 */
export function useRouterSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current selections from URL
  const originId = searchParams.get("origin") || "";
  const destinationId = searchParams.get("destination") || "";

  // Optimistic state for instant UI feedback
  const [optimisticOrigin, setOptimisticOrigin] = useOptimistic(
    originId,
    (_, newOrigin: string) => newOrigin
  );

  const [optimisticDestination, setOptimisticDestination] = useOptimistic(
    destinationId,
    (_, newDestination: string) => newDestination
  );

  /**
   * Select origin station with URL synchronization
   */
  const selectOrigin = useCallback(
    (station: Station) => {
      setOptimisticOrigin(station.id);

      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.set("origin", station.id);
        router.push(`?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, setOptimisticOrigin]
  );

  /**
   * Select destination station with URL synchronization
   */
  const selectDestination = useCallback(
    (station: Station) => {
      setOptimisticDestination(station.id);

      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.set("destination", station.id);
        router.push(`?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, setOptimisticDestination]
  );

  /**
   * Swap origin and destination stations
   */
  const swapStations = useCallback(() => {
    if (!(originId && destinationId)) {
      return;
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("origin", destinationId);
      params.set("destination", originId);
      router.push(`?${params.toString()}`, { scroll: false });
    });
  }, [originId, destinationId, searchParams, router]);

  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("origin");
      params.delete("destination");
      router.push(`?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router]);

  /**
   * Get shareable URL for current selection
   */
  const getShareableUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [searchParams]);

  return {
    // Current selections
    originId,
    destinationId,

    // Optimistic selections for instant UI feedback
    optimisticOrigin,
    optimisticDestination,

    // Actions
    selectOrigin,
    selectDestination,
    swapStations,
    clearSelections,
    getShareableUrl,

    // State
    isPending,
  } as const;
}

/**
 * Hook for fare calculator with URL synchronization
 */
export function useFareCalculatorRouter() {
  const { selectOrigin, selectDestination, swapStations, clearSelections } = useRouterSelect();
  const [isPending, startTransition] = useTransition();

  /**
   * Calculate fare with URL synchronization
   */
  const calculateFare = useCallback((_originId: string, _destinationId: string) => {
    startTransition(() => {
      // This would trigger fare calculation
      // The URL already contains the station IDs
    });
  }, []);

  return {
    selectOrigin,
    selectDestination,
    swapStations,
    clearSelections,
    calculateFare,
    isPending,
  } as const;
}
