"use client";

import { useOptimistic, useTransition } from "react";
import type { Station } from "@/lib/types/station";

/**
 * React 19 useOptimistic hook for instant UI feedback during search
 * Demonstrates the modern optimistic updates pattern
 */
export function useOptimisticSearch(initialResults: Station[] = []) {
  const [isPending, startTransition] = useTransition();
  const [optimisticResults, addOptimisticResult] = useOptimistic(
    initialResults,
    (state, newResult: Station) => {
      // Add the new result optimistically
      return [...state, newResult];
    }
  );

  const [optimisticQuery, setOptimisticQuery] = useOptimistic("", (_state, newQuery: string) => {
    // Update query optimistically
    return newQuery;
  });

  /**
   * Optimistically update search results
   * This provides instant UI feedback while the actual search completes
   */
  const optimisticSearch = (query: string, results: Station[]) => {
    startTransition(() => {
      setOptimisticQuery(query);
      // Add results optimistically
      for (const result of results) {
        addOptimisticResult(result);
      }
    });
  };

  /**
   * Clear optimistic results
   */
  const clearOptimisticResults = () => {
    startTransition(() => {
      setOptimisticQuery("");
    });
  };

  return {
    optimisticResults,
    optimisticQuery,
    isPending,
    optimisticSearch,
    clearOptimisticResults,
  };
}

/**
 * React 19 useOptimistic hook for fare calculation
 * Provides instant UI feedback during fare calculation
 */
export function useOptimisticFare(initialFare?: number) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFare, setOptimisticFare] = useOptimistic(
    initialFare,
    (_state, newFare: number) => newFare
  );

  const optimisticCalculateFare = (fare: number) => {
    startTransition(() => {
      setOptimisticFare(fare);
    });
  };

  return {
    optimisticFare,
    isPending,
    optimisticCalculateFare,
  };
}

/**
 * Generic optimistic state hook for UI feedback during async operations
 */
export function useOptimisticState<T>(initialState: T) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, addOptimisticUpdate] = useOptimistic(
    initialState,
    (currentState, update: Partial<T>) => ({
      ...currentState,
      ...update,
    })
  );

  const updateOptimistic = (update: Partial<T>) => {
    startTransition(() => {
      addOptimisticUpdate(update);
    });
  };

  return {
    optimisticState,
    isPending,
    updateOptimistic,
  } as const;
}
