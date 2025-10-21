"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import type { Station } from "@/lib/types/station";

/**
 * Enhanced optimistic update configuration
 */
type OptimisticConfig<T> = {
  readonly initialState: T;
  readonly updateFn: (currentState: T, update: Partial<T>) => T;
  readonly onError?: (error: Error, originalState: T) => void;
  readonly onSuccess?: (finalState: T) => void;
  readonly retryCount?: number;
  readonly retryDelay?: number;
};

/**
 * Enhanced optimistic state hook with error handling and retry logic
 */
export function useEnhancedOptimistic<T>({
  initialState,
  updateFn,
  onError,
  onSuccess,
  retryCount = 3,
  retryDelay = 1000,
}: OptimisticConfig<T>) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, addOptimisticUpdate] = useOptimistic(initialState, updateFn);

  const [error, setError] = useState<Error | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);

  /**
   * Update state optimistically with error handling
   */
  const updateOptimistic = useCallback(
    async (update: Partial<T>, asyncOperation?: () => Promise<void>) => {
      setError(null);

      startTransition(() => {
        addOptimisticUpdate(update);
      });

      if (asyncOperation) {
        try {
          await asyncOperation();
          onSuccess?.(optimisticState);
          setRetryAttempts(0);
        } catch (err) {
          const errorInstance = err instanceof Error ? err : new Error("Unknown error");
          setError(errorInstance);
          onError?.(errorInstance, initialState);

          // Retry logic
          if (retryAttempts < retryCount) {
            setTimeout(
              () => {
                setRetryAttempts((prev) => prev + 1);
                updateOptimistic(update, asyncOperation);
              },
              retryDelay * (retryAttempts + 1)
            );
          }
        }
      }
    },
    [
      addOptimisticUpdate,
      onSuccess,
      onError,
      retryAttempts,
      retryCount,
      retryDelay,
      optimisticState,
      initialState,
    ]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryAttempts(0);
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setError(null);
    setRetryAttempts(0);
    startTransition(() => {
      addOptimisticUpdate(initialState);
    });
  }, [addOptimisticUpdate, initialState]);

  return {
    optimisticState,
    isPending,
    error,
    retryAttempts,
    updateOptimistic,
    clearError,
    reset,
  } as const;
}

/**
 * Hook for optimistic search with error handling
 */
export function useOptimisticSearchWithError(initialResults: Station[] = []) {
  return useEnhancedOptimistic({
    initialState: initialResults,
    updateFn: (currentState, update) => {
      if (update && typeof update === "object" && "results" in update) {
        return update.results as Station[];
      }
      if (update && typeof update === "object" && "query" in update) {
        const query = (update as { query: string }).query;
        return currentState.filter((station) =>
          station?.name.toLowerCase().includes(query.toLowerCase())
        );
      }
      return currentState;
    },
    onError: (_error, _originalState) => {
      // Could show toast notification here
    },
    onSuccess: (_finalState) => {
      // Search completed successfully
    },
  });
}

/**
 * Hook for optimistic fare calculation with error handling
 */
export function useOptimisticFareWithError(initialFare?: number) {
  return useEnhancedOptimistic({
    initialState: initialFare,
    updateFn: (currentState, update) => {
      if (update && typeof update === "object" && "fare" in update) {
        return (update as { fare: number }).fare;
      }
      return currentState;
    },
    onError: (_error, _originalState) => {
      // Could show error toast here
    },
    onSuccess: (_finalState) => {
      // Fare calculated successfully
    },
  });
}
