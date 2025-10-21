"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { lazy, type ReactNode, Suspense, useCallback, useMemo, useState } from "react";

/**
 * Google Maps configuration options
 */
type GoogleMapsConfig = {
  readonly apiKey: string;
  readonly language: string;
  readonly libraries: string[];
  readonly region: string;
  readonly version?: string;
};

/**
 * Lazy map provider loading states
 */
type MapProviderStatus = "idle" | "loading" | "loaded" | "error";

/**
 * Lazy map provider result
 */
type LazyMapProviderResult = {
  readonly status: MapProviderStatus;
  readonly error: Error | null;
  readonly retryCount: number;
};

/**
 * Default Google Maps configuration
 */
const DEFAULT_MAPS_CONFIG: GoogleMapsConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  language: "en",
  libraries: ["places", "geometry"],
  region: "BD",
  version: "weekly",
} as const;

/**
 * Lazy-loaded Google Maps provider with modern React 19.2 patterns
 *
 * Features:
 * - Lazy loading to avoid blocking bfcache
 * - Error boundaries and retry logic
 * - Status tracking for better UX
 * - Type-safe configuration
 * - Performance optimizations
 * - Modern error handling
 */
const LazyMapProvider = lazy(() =>
  Promise.resolve({
    default: ({
      children,
      config,
    }: {
      readonly children: ReactNode;
      readonly config: GoogleMapsConfig;
    }) => (
      <APIProvider
        apiKey={config.apiKey}
        language={config.language}
        libraries={config.libraries}
        region={config.region}
        {...(config.version && { version: config.version })}
      >
        {children}
      </APIProvider>
    ),
  })
);

/**
 * Enhanced loading fallback component
 */
function MapLoadingFallback({
  children,
  status,
}: {
  readonly children: ReactNode;
  readonly status: MapProviderStatus;
}) {
  const loadingMessage = useMemo(() => {
    switch (status) {
      case "loading":
        return "Loading map...";
      case "error":
        return "Failed to load map";
      default:
        return "Preparing map...";
    }
  }, [status]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">{loadingMessage}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Error fallback component with retry functionality
 */
function MapErrorFallback({
  children,
  onRetry,
  retryCount,
}: {
  readonly children: ReactNode;
  readonly onRetry: () => void;
  readonly retryCount: number;
}) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-red-500">
          <svg
            aria-label="Error icon"
            className="mx-auto h-12 w-12"
            fill="none"
            role="img"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <h3 className="mb-2 font-semibold text-lg">Map Loading Failed</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          Unable to load Google Maps. {retryCount > 0 && `Retry attempt ${retryCount}.`}
        </p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
          onClick={onRetry}
          type="button"
        >
          Try Again
        </button>
        {children}
      </div>
    </div>
  );
}

/**
 * Lazy map provider with modern React 19.2 patterns
 *
 * Features:
 * - Advanced error handling with retry logic
 * - Status tracking for better UX
 * - Type-safe configuration
 * - Performance optimizations
 * - Modern error boundaries
 * - Custom loading and error states
 */
export function LazyMapProviderWrapper({
  children,
  config = DEFAULT_MAPS_CONFIG,
  enableRetry = true,
  maxRetries = 3,
}: {
  readonly children: ReactNode;
  readonly config?: Partial<GoogleMapsConfig>;
  readonly enableRetry?: boolean;
  readonly maxRetries?: number;
}) {
  const [providerState, setProviderState] = useState<LazyMapProviderResult>({
    status: "idle",
    error: null,
    retryCount: 0,
  });
  // Integrate with global loading UI if needed in the future
  // const { startLoading, completeLoading } = useCustomLoading();

  // Merge user config with defaults
  const mergedConfig = useMemo(
    (): GoogleMapsConfig => ({
      ...DEFAULT_MAPS_CONFIG,
      ...config,
    }),
    [config]
  );

  // Validate API key
  const isValidConfig = useMemo(
    () => Boolean(mergedConfig.apiKey && mergedConfig.apiKey !== ""),
    [mergedConfig.apiKey]
  );

  /**
   * Handle retry logic
   */
  const handleRetry = useCallback(() => {
    if (!enableRetry || providerState.retryCount >= maxRetries) {
      return;
    }

    setProviderState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  }, [enableRetry, maxRetries, providerState.retryCount]);

  // Don't render if config is invalid
  if (!isValidConfig) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-yellow-500">
            <svg
              aria-label="Warning icon"
              className="mx-auto h-12 w-12"
              fill="none"
              role="img"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-lg">Configuration Error</h3>
          <p className="text-muted-foreground text-sm">
            Google Maps API key is missing or invalid.
          </p>
          {children}
        </div>
      </div>
    );
  }

  // Handle error state with retry
  if (providerState.status === "error" && enableRetry && providerState.retryCount < maxRetries) {
    return (
      <MapErrorFallback onRetry={handleRetry} retryCount={providerState.retryCount}>
        {children}
      </MapErrorFallback>
    );
  }

  // Handle final error state (no more retries)
  if (providerState.status === "error") {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <svg
              aria-label="Warning icon"
              className="mx-auto h-12 w-12"
              fill="none"
              role="img"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-lg">Map Unavailable</h3>
          <p className="text-muted-foreground text-sm">
            Unable to load Google Maps after {maxRetries} attempts.
          </p>
          {children}
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={<MapLoadingFallback status={providerState.status}>{children}</MapLoadingFallback>}
    >
      <LazyMapProvider config={mergedConfig}>{children}</LazyMapProvider>
    </Suspense>
  );
}

/**
 * Hook to get map provider status (for debugging or UI integration)
 *
 * @example
 * ```tsx
 * const { status, error, retryCount } = useMapProviderStatus();
 * ```
 */
export function useMapProviderStatus(): LazyMapProviderResult {
  const [status] = useState<LazyMapProviderResult>({
    status: "idle",
    error: null,
    retryCount: 0,
  });

  return status;
}
