"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * View Transitions configuration for smooth animations
 */
type ViewTransitionConfig = {
  readonly duration?: number;
  readonly easing?: string;
  readonly name?: string;
};

/**
 * Hook for managing View Transitions
 * Provides utilities for smooth page and component transitions
 */
export function useViewTransitions() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if View Transitions API is supported
    setIsSupported(typeof document !== "undefined" && "startViewTransition" in document);
  }, []);

  /**
   * Start a view transition with custom configuration
   */
  const startTransition = useCallback(
    (callback: () => void, config?: ViewTransitionConfig) => {
      if (!isSupported) {
        callback();
        return;
      }

      const transition = document.startViewTransition(callback);

      if (config?.name) {
        transition.ready.then(() => {
          // Apply custom transition name
          document.documentElement.style.setProperty(
            "--view-transition-name",
            config.name || "default"
          );
        });
      }

      return transition;
    },
    [isSupported]
  );

  /**
   * Start a shared element transition between two components
   */
  const startSharedTransition = useCallback(
    (callback: () => void, sharedName: string) => startTransition(callback, { name: sharedName }),
    [startTransition]
  );

  /**
   * Start a page transition with default configuration
   */
  const startPageTransition = useCallback(
    (callback: () => void) =>
      startTransition(callback, {
        duration: 300,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      }),
    [startTransition]
  );

  return {
    isSupported,
    startTransition,
    startSharedTransition,
    startPageTransition,
  } as const;
}

/**
 * Hook for station selection transitions
 * Provides smooth transitions when selecting stations
 */
export function useStationTransitions() {
  const { startSharedTransition } = useViewTransitions();

  const transitionToStation = useCallback(
    (stationId: string, callback: () => void) =>
      startSharedTransition(callback, `station-${stationId}`),
    [startSharedTransition]
  );

  const transitionToFare = useCallback(
    (originId: string, destinationId: string, callback: () => void) =>
      startSharedTransition(callback, `fare-${originId}-${destinationId}`),
    [startSharedTransition]
  );

  return {
    transitionToStation,
    transitionToFare,
  } as const;
}

/**
 * Hook for navigation transitions
 * Provides smooth transitions between pages
 */
export function useNavigationTransitions() {
  const { startPageTransition } = useViewTransitions();

  const transitionToPage = useCallback(
    (_page: string, callback: () => void) => startPageTransition(callback),
    [startPageTransition]
  );

  return {
    transitionToPage,
  } as const;
}
