/**
 * Metro Station Finder Hook Types
 *
 * Custom React hooks for metro station finder functionality.
 * Focused on practical hooks without overengineering.
 *
 * @fileoverview Metro-specific hook type definitions
 * @version 1.0.0
 * @since 2025-09-28
 */

import type { MapTheme } from "@/lib/constants";
import type {
  Coordinates,
  Meters,
  Milliseconds,
  Minutes,
  StationId,
} from "@/lib/types";
import type { SearchOptions, SearchResult } from "@/lib/types/search";
import type { Station } from "@/lib/types/station";

/**
 * Hook return types for metro-specific functionality
 */

/**
 * Station search hook return type
 */
export type UseStationSearchReturn = {
  readonly results: readonly SearchResult[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly search: (query: string, options?: SearchOptions) => Promise<void>;
  readonly clearResults: () => void;
  readonly selectedStation: Station | null;
  readonly selectStation: (station: Station) => void;
};

/**
 * Geolocation hook return type
 */
export type UseGeolocationReturn = {
  readonly position: Coordinates | null;
  readonly error: GeolocationPositionError | null;
  readonly isLoading: boolean;
  readonly requestLocation: () => void;
  readonly clearLocation: () => void;
  readonly accuracy: number | null;
  readonly lastUpdated: Milliseconds | null;
};

/**
 * Map hook return type
 */
export type UseMapReturn = {
  readonly center: Coordinates;
  readonly zoom: number;
  readonly theme: MapTheme;
  readonly markers: readonly Station[];
  readonly selectedStation: Station | null;
  readonly setCenter: (coordinates: Coordinates) => void;
  readonly setZoom: (zoom: number) => void;
  readonly setTheme: (theme: MapTheme) => void;
  readonly selectStation: (station: Station | null) => void;
  readonly addMarker: (station: Station) => void;
  readonly removeMarker: (stationId: StationId) => void;
  readonly clearMarkers: () => void;
};

/**
 * Favorites hook return type
 */
export type UseFavoritesReturn = {
  readonly favorites: readonly Station[];
  readonly addFavorite: (station: Station) => void;
  readonly removeFavorite: (stationId: StationId) => void;
  readonly isFavorite: (stationId: StationId) => boolean;
  readonly clearFavorites: () => void;
  readonly toggleFavorite: (station: Station) => void;
};

/**
 * Search history hook return type
 */
export type UseSearchHistoryReturn = {
  readonly history: readonly string[];
  readonly addToHistory: (query: string) => void;
  readonly removeFromHistory: (query: string) => void;
  readonly clearHistory: () => void;
  readonly getRecentSearches: (limit?: number) => readonly string[];
};

/**
 * Theme hook return type
 */
export type UseThemeReturn = {
  readonly theme: "light" | "dark" | "system";
  readonly setTheme: (theme: "light" | "dark" | "system") => void;
  readonly toggleTheme: () => void;
  readonly isDark: boolean;
  readonly isSystem: boolean;
};

/**
 * Local storage hook return type
 */
export type UseLocalStorageReturn<T> = {
  readonly value: T | null;
  readonly setValue: (value: T | null) => void;
  readonly removeValue: () => void;
  readonly isLoading: boolean;
};

/**
 * Debounced value hook return type
 */
export type UseDebouncedValueReturn<T> = {
  readonly value: T;
  readonly debouncedValue: T;
  readonly isPending: boolean;
  readonly setValue: (value: T) => void;
};

/**
 * Async operation hook return type
 */
export type UseAsyncReturn<T, E = Error> = {
  readonly data: T | null;
  readonly error: E | null;
  readonly isLoading: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly execute: () => Promise<void>;
  readonly reset: () => void;
};

/**
 * Station details hook return type
 */
export type UseStationDetailsReturn = {
  readonly station: Station | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly loadStation: (stationId: StationId) => Promise<void>;
  readonly clearStation: () => void;
  readonly amenities: Station["amenities"] | null;
  readonly nearbyStations: readonly Station[];
};

/**
 * Route planning hook return type
 */
export type UseRoutePlanningReturn = {
  readonly origin: Station | null;
  readonly destination: Station | null;
  readonly route: readonly Station[];
  readonly fare: number | null;
  readonly duration: Minutes | null;
  readonly setOrigin: (station: Station | null) => void;
  readonly setDestination: (station: Station | null) => void;
  readonly calculateRoute: () => Promise<void>;
  readonly clearRoute: () => void;
  readonly swapStations: () => void;
  readonly isLoading: boolean;
  readonly error: string | null;
};

/**
 * Hook configuration types
 */

/**
 * Station search hook configuration
 */
export type UseStationSearchConfig = {
  readonly maxResults?: number;
  readonly includePlanned?: boolean;
  readonly sortByRelevance?: boolean;
  readonly debounceMs?: Milliseconds;
};

/**
 * Geolocation hook configuration
 */
export type UseGeolocationConfig = {
  readonly enableHighAccuracy?: boolean;
  readonly timeout?: Milliseconds;
  readonly maximumAge?: Milliseconds;
  readonly watchPosition?: boolean;
};

/**
 * Map hook configuration
 */
export type UseMapConfig = {
  readonly defaultCenter?: Coordinates;
  readonly defaultZoom?: number;
  readonly defaultTheme?: MapTheme;
  readonly maxZoom?: number;
  readonly minZoom?: number;
};

/**
 * Favorites hook configuration
 */
export type UseFavoritesConfig = {
  readonly maxFavorites?: number;
  readonly storageKey?: string;
  readonly persistToStorage?: boolean;
};

/**
 * Search history hook configuration
 */
export type UseSearchHistoryConfig = {
  readonly maxHistoryItems?: number;
  readonly storageKey?: string;
  readonly persistToStorage?: boolean;
  readonly debounceMs?: Milliseconds;
};

/**
 * Local storage hook configuration
 */
export type UseLocalStorageConfig<T> = {
  readonly defaultValue?: T;
  readonly serialize?: (value: T) => string;
  readonly deserialize?: (value: string) => T;
  readonly storageKey: string;
};

/**
 * Debounced value hook configuration
 */
export type UseDebouncedValueConfig = {
  readonly delay?: Milliseconds;
  readonly leading?: boolean;
  readonly trailing?: boolean;
};

/**
 * Async operation hook configuration
 */
export type UseAsyncConfig<T> = {
  readonly immediate?: boolean;
  readonly onSuccess?: (data: T) => void;
  readonly onError?: (error: Error) => void;
  readonly retryCount?: number;
  readonly retryDelay?: Milliseconds;
};

/**
 * Station details hook configuration
 */
export type UseStationDetailsConfig = {
  readonly includeAmenities?: boolean;
  readonly includeNearbyStations?: boolean;
  readonly nearbyRadius?: Meters;
  readonly maxNearbyStations?: number;
};

/**
 * Route planning hook configuration
 */
export type UseRoutePlanningConfig = {
  readonly includeFare?: boolean;
  readonly includeDuration?: boolean;
  readonly preferredLines?: readonly string[];
  readonly avoidTransfers?: boolean;
  readonly maxTransfers?: number;
};

/**
 * Hook error types
 */
export type HookError = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly timestamp: Milliseconds;
};

/**
 * Hook state types
 */
export type HookState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: HookError };

/**
 * Hook event types
 */
export type HookEvent<T = unknown> = {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: Milliseconds;
};

/**
 * Hook subscription types
 */
export type HookSubscription<T> = {
  readonly unsubscribe: () => void;
  readonly getValue: () => T;
  readonly subscribe: (callback: (value: T) => void) => void;
};

/**
 * Utility types for hooks
 */

/**
 * Extract return type from hook function
 */
export type HookReturnType<T extends (...args: unknown[]) => unknown> =
  ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>;

/**
 * Extract configuration type from hook function
 */
export type HookConfigType<T extends (config?: unknown) => unknown> =
  T extends (config: infer C) => unknown ? C : never;

/**
 * Create hook with default configuration
 */
export type HookWithDefaults<T, C> = T & {
  readonly withDefaults: (config: Partial<C>) => T;
};

/**
 * Type guards for hook types
 */
export function isHookError(value: unknown): value is HookError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "timestamp" in value &&
    typeof (value as HookError).code === "string" &&
    typeof (value as HookError).message === "string" &&
    typeof (value as HookError).timestamp === "number"
  );
}

export function isHookState<T>(value: unknown): value is HookState<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as HookState<T>).status === "string" &&
    ["idle", "loading", "success", "error"].includes(
      (value as HookState<T>).status
    )
  );
}

export function isHookEvent<T>(value: unknown): value is HookEvent<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "payload" in value &&
    "timestamp" in value &&
    typeof (value as HookEvent<T>).type === "string" &&
    typeof (value as HookEvent<T>).timestamp === "number"
  );
}

/**
 * Hook factory types
 */
export type HookFactory<T, C = unknown> = (config?: C) => T;

export type HookFactoryWithDefaults<T, C> = HookFactory<T, C> & {
  readonly withDefaults: (config: Partial<C>) => HookFactory<T, C>;
};

/**
 * Hook composition types
 */
export type ComposedHook<T1, T2, R> = (hook1: T1, hook2: T2) => R;

export type HookComposer<T extends readonly unknown[], R> = (...hooks: T) => R;

/**
 * Hook middleware types
 */
export type HookMiddleware<T> = (hook: T) => T;

export type HookMiddlewareChain<T> = readonly HookMiddleware<T>[];

/**
 * Hook validation types
 */
export type HookValidator<T> = (value: T) => boolean;

export type HookValidationResult = {
  readonly isValid: boolean;
  readonly errors: readonly string[];
};

/**
 * Hook performance types
 */
export type HookPerformanceMetrics = {
  readonly renderCount: number;
  readonly lastRenderTime: Milliseconds;
  readonly averageRenderTime: Milliseconds;
  readonly memoryUsage: number;
};

export type HookPerformanceTracker = {
  readonly startTracking: () => void;
  readonly stopTracking: () => void;
  readonly getMetrics: () => HookPerformanceMetrics;
  readonly resetMetrics: () => void;
};
