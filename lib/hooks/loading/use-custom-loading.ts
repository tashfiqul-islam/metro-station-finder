"use client";

import { useCallback, useState } from "react";

const MAX_PROGRESS = 100;
const MIN_PROGRESS = 0;
const DEFAULT_DELAY_MS = 500;

/**
 * Loading state configuration
 */
type LoadingConfig = {
  readonly message?: string;
  readonly progress?: number;
  readonly type?: "spinner" | "progress" | "skeleton" | "pulse";
  readonly duration?: number;
};

/**
 * Custom loading behavior hook
 * Provides contextual loading indicators for different operations
 */
export function useCustomLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingConfig>>({});

  /**
   * Start loading for a specific operation
   */
  const startLoading = useCallback((operationId: string, config: LoadingConfig = {}) => {
    setLoadingStates((prev) => ({
      ...prev,
      [operationId]: {
        type: "spinner",
        message: "Loading...",
        progress: 0,
        ...config,
      },
    }));
  }, []);

  /**
   * Update loading progress
   */
  const updateProgress = useCallback((operationId: string, progress: number, message?: string) => {
    setLoadingStates((prev) => ({
      ...prev,
      [operationId]: {
        ...prev[operationId],
        progress: Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, progress)),
        ...(message && { message }),
      },
    }));
  }, []);

  /**
   * Complete loading for an operation
   */
  const completeLoading = useCallback((operationId: string, message?: string) => {
    setLoadingStates((prev) => ({
      ...prev,
      [operationId]: {
        ...prev[operationId],
        progress: 100,
        ...(message && { message }),
      },
    }));

    // Clear loading state after a short delay
    setTimeout(() => {
      setLoadingStates((prev) => {
        const newState = { ...prev };
        delete newState[operationId];
        return newState;
      });
    }, DEFAULT_DELAY_MS);
  }, []);

  /**
   * Stop loading for an operation
   */
  const stopLoading = useCallback((operationId: string) => {
    setLoadingStates((prev) => {
      const newState = { ...prev };
      delete newState[operationId];
      return newState;
    });
  }, []);

  /**
   * Get loading state for an operation
   */
  const getLoadingState = useCallback(
    (operationId: string) => loadingStates[operationId],
    [loadingStates]
  );

  /**
   * Check if any operation is loading
   */
  const isLoading = Object.keys(loadingStates).length > 0;

  /**
   * Get all loading states
   */
  const getAllLoadingStates = useCallback(() => loadingStates, [loadingStates]);

  return {
    startLoading,
    updateProgress,
    completeLoading,
    stopLoading,
    getLoadingState,
    isLoading,
    getAllLoadingStates,
  } as const;
}

/**
 * Hook for station search loading
 */
export function useStationSearchLoading() {
  const { startLoading, updateProgress, completeLoading, stopLoading } = useCustomLoading();

  const startSearchLoading = useCallback(
    (query: string) => {
      startLoading("station-search", {
        type: "progress",
        message: `Searching for "${query}"...`,
        progress: 0,
      });
    },
    [startLoading]
  );

  const updateSearchProgress = useCallback(
    (progress: number, message?: string) => {
      updateProgress("station-search", progress, message);
    },
    [updateProgress]
  );

  const completeSearchLoading = useCallback(
    (resultCount: number) => {
      completeLoading("station-search", `Found ${resultCount} stations`);
    },
    [completeLoading]
  );

  const stopSearchLoading = useCallback(() => {
    stopLoading("station-search");
  }, [stopLoading]);

  return {
    startSearchLoading,
    updateSearchProgress,
    completeSearchLoading,
    stopSearchLoading,
  } as const;
}

/**
 * Hook for fare calculation loading
 */
export function useFareCalculationLoading() {
  const { startLoading, updateProgress, completeLoading, stopLoading } = useCustomLoading();

  const startFareLoading = useCallback(
    (origin: string, destination: string) => {
      startLoading("fare-calculation", {
        type: "progress",
        message: `Calculating fare from ${origin} to ${destination}...`,
        progress: 0,
      });
    },
    [startLoading]
  );

  const updateFareProgress = useCallback(
    (progress: number, message?: string) => {
      updateProgress("fare-calculation", progress, message);
    },
    [updateProgress]
  );

  const completeFareLoading = useCallback(
    (fare: number) => {
      completeLoading("fare-calculation", `Fare: ৳${fare}`);
    },
    [completeLoading]
  );

  const stopFareLoading = useCallback(() => {
    stopLoading("fare-calculation");
  }, [stopLoading]);

  return {
    startFareLoading,
    updateFareProgress,
    completeFareLoading,
    stopFareLoading,
  } as const;
}

/**
 * Hook for map loading
 */
export function useMapLoading() {
  const { startLoading, completeLoading, stopLoading } = useCustomLoading();

  const startMapLoading = useCallback(() => {
    startLoading("map-loading", {
      type: "skeleton",
      message: "Loading map...",
    });
  }, [startLoading]);

  const completeMapLoading = useCallback(() => {
    completeLoading("map-loading", "Map loaded");
  }, [completeLoading]);

  const stopMapLoading = useCallback(() => {
    stopLoading("map-loading");
  }, [stopLoading]);

  return {
    startMapLoading,
    completeMapLoading,
    stopMapLoading,
  } as const;
}
