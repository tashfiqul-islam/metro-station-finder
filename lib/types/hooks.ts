/**
 * Metro Station Finder Hook Types
 *
 * Type definitions for implemented React hooks in lib/hooks/
 * Aligned with MRT-6 Phase 1 production scope (17 stations).
 *
 * @fileoverview Hook type definitions matching actual implementations
 * @version 1.0.0
 * @since 2025-09-30
 */

import type { FareInput } from "@/lib/config/schemas";
import type { Coordinates, Meters, StationId } from "@/lib/types";
import type { Station } from "@/lib/types/station";

/**
 * Geolocation permission states from Permissions API
 */
export type GeolocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

/**
 * Geolocation state discriminated union
 */
export type GeolocationState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly coords: Coordinates;
      readonly accuracy: number;
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Google Places prediction result
 */
export type PlacePrediction = {
  readonly description: string;
  readonly placeId: string;
};

/**
 * Google Places API state
 */
export type PlacesState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly predictions: readonly PlacePrediction[];
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Map availability reasons for fallback UI
 */
export type MapUnavailableReason = "disabled-by-env" | "missing-api-key" | "offline" | "ok";

/**
 * Map availability result
 */
export type MapAvailability = {
  readonly available: boolean;
  readonly reason: MapUnavailableReason;
};

/**
 * Nearest station calculation result
 */
export type NearestStation = {
  readonly stationId: string;
  readonly distanceMeters: Meters;
  readonly coordinates: Coordinates;
};

/**
 * Theme preference type
 */
export type ThemePreference = "light" | "dark" | "system";

/**
 * Theme hook return type
 */
export type UseThemeReturn = {
  readonly theme: ThemePreference;
  readonly setTheme: (theme: ThemePreference) => void;
};

/**
 * Geolocation hook return type
 */
export type UseGeolocationReturn = {
  readonly state: GeolocationState;
  readonly isCloseTo: (target: Coordinates, radiusMeters: number) => boolean;
};

/**
 * Google Places hook return type
 */
export type UseGooglePlacesReturn = {
  readonly state: PlacesState;
  readonly search: (query: string) => void;
};

/**
 * Live region politeness levels for screen readers
 */
export type AriaPoliteness = "polite" | "assertive";

/**
 * Live region hook return type
 */
export type UseLiveRegionReturn = {
  readonly announce: (message: string) => void;
};

/**
 * Query params state hook return type (generic)
 */
export type UseQueryParamsStateReturn<T> = {
  readonly parse: () => T;
  readonly set: (values: unknown, options?: { replace?: boolean }) => void;
  readonly stringify: (values: unknown) => string;
};

/**
 * Station search options
 */
export type StationSearchOptions = {
  readonly query: string;
  readonly limit?: number;
};

/**
 * Map availability options
 */
export type MapAvailabilityOptions = {
  readonly isOnline?: boolean;
  readonly quotaExceeded?: boolean;
};

/**
 * Fare calculator options
 */
export type FareCalculatorOptions = {
  readonly origin?: StationId;
  readonly destination?: StationId;
};

/**
 * Type guards for hook types
 */

export function isGeolocationState(value: unknown): value is GeolocationState {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as GeolocationState).status === "string" &&
    ["idle", "loading", "success", "error"].includes((value as GeolocationState).status)
  );
}

export function isPlacesState(value: unknown): value is PlacesState {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as PlacesState).status === "string" &&
    ["idle", "loading", "success", "error"].includes((value as PlacesState).status)
  );
}

export function isMapAvailability(value: unknown): value is MapAvailability {
  return (
    typeof value === "object" &&
    value !== null &&
    "available" in value &&
    "reason" in value &&
    typeof (value as MapAvailability).available === "boolean" &&
    typeof (value as MapAvailability).reason === "string"
  );
}

export function isNearestStation(value: unknown): value is NearestStation {
  return (
    typeof value === "object" &&
    value !== null &&
    "stationId" in value &&
    "distanceMeters" in value &&
    "coordinates" in value &&
    typeof (value as NearestStation).stationId === "string" &&
    typeof (value as NearestStation).distanceMeters === "number"
  );
}

/**
 * Exported hook function signatures for reference
 */

export type UseDebouncedValue = <T>(value: T, delayMs: number) => T;

export type UseThrottledCallback = <Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number
) => (...args: Args) => void;

export type UseDebouncedCallback = <Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
) => (...args: Args) => void;

export type UseStationSearch = (options: StationSearchOptions) => readonly Station[];

export type UseFareCalculator = (options: FareCalculatorOptions) => FareInput | undefined;

export type UseGeolocation = () => UseGeolocationReturn;

export type UseGeolocationPermission = () => GeolocationPermissionState;

export type UseGooglePlaces = () => UseGooglePlacesReturn;

export type UseTheme = () => UseThemeReturn;

export type UseOnlineStatus = () => boolean;

export type UseLiveRegion = (polite?: AriaPoliteness) => UseLiveRegionReturn;

export type UseMapAvailability = (options?: MapAvailabilityOptions) => MapAvailability;

export type UseNearestStation = (origin?: Coordinates) => NearestStation | undefined;
