/**
 * Geolocation Data Types for Metro Station Finder
 *
 * This module defines all types related to geolocation operations,
 * location handling, and service area validation for the metro system.
 *
 * @fileoverview Geolocation-related type definitions with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import type { LOCATION_SOURCES } from "@/lib/config/constants";
import { GEOLOCATION_CONSTANTS, type GEOLOCATION_STATUSES } from "@/lib/config/constants";
import type {
  Coordinates,
  GeolocationErrorCode,
  Kilometers,
  Meters,
  Milliseconds,
} from "@/lib/types";

/**
 * Branded types for geolocation operations
 */
export type LocationId = string & { readonly __brand: "LocationId" };
export type GeolocationSessionId = string & {
  readonly __brand: "GeolocationSessionId";
};
export type ServiceAreaId = string & { readonly __brand: "ServiceAreaId" };

/**
 * Template literal types for geolocation operations
 */
export type GeolocationOperation = `geo:${"locate" | "validate" | "track" | "stop"}`;
export type LocationEvent = `location:${"found" | "updated" | "lost" | "error"}`;

/**
 * Const assertions for type safety
 */

/**
 * Location source enumeration with strict patterns
 *
 * Indicates how a location was obtained.
 * Used for tracking and validation purposes.
 */
export type LocationSource = (typeof LOCATION_SOURCES)[keyof typeof LOCATION_SOURCES];

/**
 * Geolocation status enumeration
 */
export type GeolocationStatus = (typeof GEOLOCATION_STATUSES)[keyof typeof GEOLOCATION_STATUSES];

/**
 * Geolocation options configuration with strict patterns
 *
 * Configuration for browser geolocation API requests.
 * Provides control over accuracy, timeout, and caching.
 */
export type GeolocationOptions = {
  /** Request high accuracy GPS positioning */
  readonly enableHighAccuracy?: boolean;
  /** Maximum time to wait for position (milliseconds) */
  readonly timeout?: Milliseconds;
  /** Maximum age of cached position (milliseconds) */
  readonly maximumAge?: Milliseconds;
  /** Unique session identifier */
  readonly sessionId?: GeolocationSessionId;
  /** Retry configuration */
  readonly retryConfig?: {
    readonly maxRetries: number;
    readonly retryDelay: Milliseconds;
  };
  /** Privacy settings */
  readonly privacyMode?: boolean;
};

/**
 * Search context information
 *
 * Metadata about how a location was obtained.
 * Used for debugging and analytics purposes.
 */
export type SearchContext = {
  /** Original search query */
  readonly query: string;
  /** When the search was performed */
  readonly timestamp: Milliseconds;
  /** How the location was obtained */
  readonly source: LocationSource;
};

/**
 * Location entity with strict patterns
 *
 * Represents a geographic location with metadata about
 * how it was obtained and its accuracy.
 */
export type Location = {
  /** Unique location identifier */
  readonly id: LocationId;
  /** Geographic coordinates (WGS84) */
  readonly coordinates: Coordinates;
  /** Human-readable address (if available) */
  readonly address?: string;
  /** Search context and metadata */
  readonly searchContext: SearchContext;
  /** Position accuracy in meters */
  readonly accuracy?: Meters;
  /** Location confidence level */
  readonly confidence: "high" | "medium" | "low";
  /** Creation timestamp */
  readonly createdAt: Milliseconds;
  /** Last updated timestamp */
  readonly updatedAt: Milliseconds;
  /** Discriminated union for location state */
  readonly state: "active" | "stale" | "invalid";
  /** Privacy-safe coordinates for logging */
  readonly privacySafeCoordinates?: {
    readonly lat: number;
    readonly lng: number;
  };
};

/**
 * Geolocation result with strict patterns
 *
 * Standardized result from browser geolocation operations.
 * Includes timing and accuracy information.
 */
export type GeolocationResult = {
  /** Unique result identifier */
  readonly id: string;
  /** Geographic coordinates */
  readonly coordinates: Coordinates;
  /** Position accuracy in meters */
  readonly accuracy: Meters;
  /** Timestamp when position was acquired */
  readonly timestamp: Milliseconds;
  /** How the location was obtained */
  readonly source: LocationSource;
  /** Session identifier */
  readonly sessionId?: GeolocationSessionId;
  /** Discriminated union for result status */
  readonly status: "success" | "error" | "timeout";
  /** Error information if status is error */
  readonly error?: GeolocationError;
  /** Processing time in milliseconds */
  readonly processingTime: Milliseconds;
};

/**
 * Service area configuration
 *
 * Defines the geographic boundaries where metro services
 * are available. Used for location validation.
 */
export type ServiceArea = {
  /** Service area radius in kilometers */
  readonly radius: Kilometers;
  /** Center point of service area */
  readonly centroid: Coordinates;
};

/**
 * Service area validation result
 *
 * Result of checking whether a location is within
 * the metro service coverage area.
 */
export type ServiceAreaValidation = {
  /** Whether location is within service area */
  readonly isValid: boolean;
  /** Distance from service area center */
  readonly distance: Kilometers;
  /** Service area configuration used */
  readonly serviceArea: ServiceArea;
};

/**
 * Walking directions information
 *
 * Contains URL and instructions for walking directions
 * to the nearest metro station.
 */
export type WalkingDirections = {
  /** Google Maps directions URL */
  readonly url: string;
  /** Step-by-step instructions */
  readonly instructions: string;
};

/**
 * Geolocation error details
 *
 * Structured error information for geolocation failures.
 * Maps browser error codes to application error types.
 */
export type GeolocationError = {
  /** Application error code */
  readonly code: GeolocationErrorCode;
  /** Human-readable error message */
  readonly message: string;
  /** Browser error code (if applicable) */
  readonly browserCode?: number;
  /** Recovery suggestion */
  readonly hint?: string;
};

/**
 * Geolocation state with strict patterns
 *
 * Tracks the current state of geolocation operations
 * for user interface feedback.
 */
export type GeolocationState = {
  /** Current operational status */
  readonly status: GeolocationStatus;
  /** Current position (if available) */
  readonly position?: GeolocationResult;
  /** Error information (if applicable) */
  readonly error?: GeolocationError;
  /** Whether permission was explicitly denied */
  readonly permissionDenied: boolean;
  /** Last update timestamp */
  readonly lastUpdate: Milliseconds;
  /** Session identifier */
  readonly sessionId?: GeolocationSessionId;
  /** Retry count */
  readonly retryCount: number;
  /** Discriminated union for state details */
  readonly stateDetails?:
    | { type: "tracking"; watchId: number }
    | { type: "error"; errorCode: GeolocationErrorCode }
    | { type: "success"; accuracy: Meters };
};

/**
 * Geolocation capabilities check
 *
 * Information about browser geolocation support
 * and permission status.
 */
export type GeolocationCapabilities = {
  /** Whether geolocation API is supported */
  readonly isSupported: boolean;
  /** Whether running in secure context (HTTPS) */
  readonly isSecureContext: boolean;
  /** Current permission state */
  readonly permissionState: "granted" | "denied" | "prompt" | "unknown";
  /** Whether high accuracy is available */
  readonly hasHighAccuracy: boolean;
};

/**
 * Distance calculation result
 *
 * Result of calculating distance between two geographic points.
 * Uses Haversine formula for great-circle distance.
 */
export type DistanceCalculation = {
  /** Distance in meters */
  readonly distanceMeters: Meters;
  /** Distance in kilometers */
  readonly distanceKilometers: Kilometers;
  /** Estimated walking time in minutes */
  readonly walkingTimeMinutes: number;
  /** Calculation method used */
  readonly method: "haversine";
};

/**
 * Type guards for Geolocation types with strict patterns
 */

/**
 * Type guard for LocationSource
 *
 * @param value The value to check
 * @returns True if value is a valid LocationSource
 */
export function isLocationSource(value: unknown): value is LocationSource {
  return (
    typeof value === "string" &&
    (value === "geolocation" || value === "manual" || value === "search")
  );
}

/**
 * Type guard for GeolocationOptions
 *
 * @param value The value to check
 * @returns True if value is valid GeolocationOptions
 */
export function isGeolocationOptions(value: unknown): value is GeolocationOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const options = value as {
    enableHighAccuracy?: unknown;
    timeout?: unknown;
    maximumAge?: unknown;
  };

  return (
    (options.enableHighAccuracy === undefined || typeof options.enableHighAccuracy === "boolean") &&
    (options.timeout === undefined || typeof options.timeout === "number") &&
    (options.maximumAge === undefined || typeof options.maximumAge === "number")
  );
}

/**
 * Type guard for GeolocationResult
 *
 * @param value The value to check
 * @returns True if value is valid GeolocationResult
 */
export function isGeolocationResult(value: unknown): value is GeolocationResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as {
    coordinates?: unknown;
    accuracy?: unknown;
    timestamp?: unknown;
    source?: unknown;
  };

  return (
    "coordinates" in value &&
    "accuracy" in value &&
    "timestamp" in value &&
    "source" in value &&
    typeof result.accuracy === "number" &&
    typeof result.timestamp === "number" &&
    isLocationSource(result.source) &&
    result.accuracy >= 0 &&
    result.timestamp >= 0
  );
}

/**
 * Type guard for ServiceAreaValidation
 *
 * @param value The value to check
 * @returns True if value is valid ServiceAreaValidation
 */
export function isServiceAreaValidation(value: unknown): value is ServiceAreaValidation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const validation = value as {
    isValid?: unknown;
    distance?: unknown;
    serviceArea?: unknown;
  };

  return (
    "isValid" in value &&
    "distance" in value &&
    "serviceArea" in value &&
    typeof validation.isValid === "boolean" &&
    typeof validation.distance === "number" &&
    validation.distance >= 0
  );
}

/**
 * Utility functions for Geolocation operations
 */

/**
 * Create default geolocation options
 *
 * @param overrides Optional property overrides
 * @returns Complete GeolocationOptions object
 */
export function createDefaultGeolocationOptions(
  overrides?: Partial<GeolocationOptions>
): GeolocationOptions {
  return {
    enableHighAccuracy: true,
    timeout: GEOLOCATION_CONSTANTS.defaultTimeout,
    maximumAge: GEOLOCATION_CONSTANTS.defaultMaxAge,
    ...overrides,
  };
}

/**
 * Calculate walking time from distance
 *
 * @param distance Distance in meters
 * @returns Walking time in minutes
 */
export function calculateWalkingTime(distance: Meters): number {
  return Math.ceil(distance / GEOLOCATION_CONSTANTS.walkingSpeedMPerMin);
}

/**
 * Format distance for display
 *
 * @param distance Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distance: Meters): string {
  if (distance < GEOLOCATION_CONSTANTS.metersToKilometers) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / GEOLOCATION_CONSTANTS.metersToKilometers).toFixed(1)}km`;
}

/**
 * Create walking directions URL
 *
 * @param origin Origin coordinates
 * @param destination Destination coordinates
 * @returns Google Maps walking directions URL
 */
export function createWalkingDirectionsUrl(origin: Coordinates, destination: Coordinates): string {
  const baseUrl = "https://www.google.com/maps/dir/";
  const originParam = `${origin.lat},${origin.lng}`;
  const destParam = `${destination.lat},${destination.lng}`;
  const params = new URLSearchParams({
    travelmode: "walking",
  });

  return `${baseUrl}${originParam}/${destParam}?${params.toString()}`;
}

/**
 * Check if coordinates are within service area
 *
 * @param _coordinates Coordinates to check (placeholder for future implementation)
 * @param _serviceArea Service area configuration (placeholder for future implementation)
 * @returns True if coordinates are within service area
 */
export function isWithinServiceArea(_coordinates: Coordinates, _serviceArea: ServiceArea): boolean {
  // This would use the Haversine formula to calculate distance
  // Implementation would be in the distance utility functions
  return true; // Placeholder - actual implementation in utils
}

/**
 * Create search context
 *
 * @param query Search query string
 * @param source Location source
 * @returns SearchContext object
 */
export function createSearchContext(query: string, source: LocationSource): SearchContext {
  return {
    query,
    timestamp: Date.now() as Milliseconds,
    source,
  };
}

/**
 * Map browser geolocation error to application error
 *
 * @param browserError Browser GeolocationPositionError
 * @returns Application GeolocationError
 */
export function mapBrowserGeolocationError(browserError: {
  code: number;
  message: string;
}): GeolocationError {
  const errorMap = {
    1: {
      code: "GEO_DENIED" as const,
      message: "Location access denied by user",
      hint: "Please enable location access in your browser settings",
    },
    2: {
      code: "GEO_UNAVAILABLE" as const,
      message: "Location information unavailable",
      hint: "Check your internet connection and try again",
    },
    3: {
      code: "GEO_TIMEOUT" as const,
      message: "Location request timed out",
      hint: "Try again or enter your location manually",
    },
  };

  const mappedError = errorMap[browserError.code as keyof typeof errorMap];

  return {
    code: mappedError?.code ?? ("GEO_ERROR" as const),
    message: mappedError?.message ?? "Unknown geolocation error",
    browserCode: browserError.code,
    hint: mappedError?.hint,
  };
}

/**
 * Check geolocation capabilities
 *
 * @returns GeolocationCapabilities object
 */
export function checkGeolocationCapabilities(): GeolocationCapabilities {
  const isSupported = "geolocation" in navigator;
  const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : false;

  return {
    isSupported,
    isSecureContext,
    permissionState: "unknown", // Would be determined by permissions API
    hasHighAccuracy: isSupported && isSecureContext,
  };
}

/**
 * Validate geolocation accuracy
 *
 * @param accuracy Accuracy in meters
 * @returns True if accuracy is acceptable
 */
export function isAccuracyAcceptable(accuracy: Meters): boolean {
  return accuracy <= GEOLOCATION_CONSTANTS.maxAccuracyMeters;
}

/**
 * Create location from coordinates
 *
 * @param coordinates Geographic coordinates
 * @param source Location source
 * @param accuracy Position accuracy (optional)
 * @returns Location object
 */
export function createLocation(
  coordinates: Coordinates,
  source: LocationSource,
  accuracy?: Meters
): Location {
  const now = Date.now() as Milliseconds;
  const location: Location = {
    id: createLocationId(),
    coordinates,
    searchContext: createSearchContext("", source),
    confidence: "medium",
    createdAt: now,
    updatedAt: now,
    state: "active",
  };

  // Only add accuracy if it's defined (exactOptionalPropertyTypes compliance)
  if (accuracy !== undefined) {
    return { ...location, accuracy };
  }

  return location;
}

/**
 * Privacy-safe location logging
 *
 * Creates a privacy-safe version of location data for logging.
 * Rounds coordinates to protect user privacy.
 *
 * @param location Location to sanitize
 * @returns Privacy-safe location data
 */
export function createPrivacySafeLocation(location: Location): {
  readonly source: LocationSource;
  readonly accuracy?: number;
  readonly hasAddress: boolean;
} {
  const safeLocation = {
    source: location.searchContext.source,
    hasAddress: Boolean(location.address),
  };

  // Only add accuracy if it's defined (exactOptionalPropertyTypes compliance)
  if (location.accuracy !== undefined) {
    return { ...safeLocation, accuracy: location.accuracy };
  }

  return safeLocation;
}

/**
 * Advanced utility types for geolocation operations with strict patterns
 */

/**
 * Extract coordinates from location object
 */
export type LocationCoordinates<T extends Location> = T["coordinates"];

/**
 * Extract accuracy from geolocation result
 */
export type GeolocationAccuracy<T extends GeolocationResult> = T["accuracy"];

/**
 * Create partial location for updates
 */
export type PartialLocation = Partial<Pick<Location, "state" | "updatedAt" | "confidence">>;

/**
 * Geolocation strategy pattern
 */
export type GeolocationStrategy = {
  readonly locate: (options: GeolocationOptions) => Promise<GeolocationResult>;
  readonly validate: (location: Location) => boolean;
  readonly track: (callback: (location: Location) => void) => GeolocationSessionId;
  readonly stop: (sessionId: GeolocationSessionId) => void;
};

/**
 * Geolocation factory functions with strict patterns
 */
export const createLocationId = (): LocationId =>
  `loc_${Date.now()}_${Math.random()
    .toString(GEOLOCATION_CONSTANTS.base36)
    .slice(
      GEOLOCATION_CONSTANTS.idStartIndex,
      GEOLOCATION_CONSTANTS.idStartIndex + GEOLOCATION_CONSTANTS.idLength
    )}` as LocationId;

export const createGeolocationSessionId = (): GeolocationSessionId =>
  `session_${Date.now()}_${Math.random()
    .toString(GEOLOCATION_CONSTANTS.base36)
    .slice(
      GEOLOCATION_CONSTANTS.idStartIndex,
      GEOLOCATION_CONSTANTS.idStartIndex + GEOLOCATION_CONSTANTS.idLength
    )}` as GeolocationSessionId;

export const createServiceAreaId = (): ServiceAreaId =>
  `area_${Date.now()}_${Math.random()
    .toString(GEOLOCATION_CONSTANTS.base36)
    .slice(
      GEOLOCATION_CONSTANTS.idStartIndex,
      GEOLOCATION_CONSTANTS.idStartIndex + GEOLOCATION_CONSTANTS.idLength
    )}` as ServiceAreaId;

/**
 * Geolocation validation with branded types with strict patterns
 */
export function validateLocationId(value: string): value is LocationId {
  return (
    typeof value === "string" &&
    value.startsWith("loc_") &&
    value.length > GEOLOCATION_CONSTANTS.minIdLength
  );
}

export function validateGeolocationSessionId(value: string): value is GeolocationSessionId {
  return (
    typeof value === "string" &&
    value.startsWith("session_") &&
    value.length > GEOLOCATION_CONSTANTS.minSessionIdLength
  );
}

/**
 * Geolocation calculation with error handling with strict patterns
 */
export type GeolocationCalculationResult<T = Location> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: GeolocationError };

/**
 * Geolocation event types with strict patterns
 */
export type GeolocationEvent<T = unknown> = {
  readonly type: LocationEvent;
  readonly payload: T;
  readonly timestamp: Milliseconds;
  readonly sessionId: GeolocationSessionId;
};

/**
 * Geolocation subscription types with strict patterns
 */
export type GeolocationSubscription<T> = {
  readonly unsubscribe: () => void;
  readonly getValue: () => T;
  readonly subscribe: (callback: (value: T) => void) => void;
};

/**
 * Geolocation middleware types with strict patterns
 */
export type GeolocationMiddleware<T> = (location: T) => T;

export type GeolocationMiddlewareChain<T> = readonly GeolocationMiddleware<T>[];

/**
 * Geolocation performance metrics with strict patterns
 */
export type GeolocationPerformanceMetrics = {
  readonly locationTime: Milliseconds;
  readonly validationTime: Milliseconds;
  readonly totalTime: Milliseconds;
  readonly accuracy: Meters;
  readonly batteryUsage: number;
};

/**
 * Geolocation configuration types with strict patterns
 */
export type GeolocationConfig = {
  readonly enableHighAccuracy: boolean;
  readonly timeout: Milliseconds;
  readonly maximumAge: Milliseconds;
  readonly enableCaching: boolean;
  readonly cacheTimeout: Milliseconds;
  readonly privacyMode: boolean;
  readonly maxRetries: number;
  readonly retryDelay: Milliseconds;
};

/**
 * Geolocation factory with configuration with strict patterns
 */
export const createGeolocationFactory = (config: GeolocationConfig) => ({
  createLocation: (data: Omit<Location, "id" | "createdAt" | "updatedAt">): Location => ({
    ...data,
    id: createLocationId(),
    createdAt: Date.now() as Milliseconds,
    updatedAt: Date.now() as Milliseconds,
  }),
  createGeolocationResult: (
    data: Omit<GeolocationResult, "id" | "processingTime">
  ): GeolocationResult => ({
    ...data,
    id: `result_${Date.now()}_${Math.random()
      .toString(GEOLOCATION_CONSTANTS.base36)
      .slice(
        GEOLOCATION_CONSTANTS.idStartIndex,
        GEOLOCATION_CONSTANTS.idStartIndex + GEOLOCATION_CONSTANTS.idLength
      )}`,
    processingTime: 0 as Milliseconds,
  }),
  createSession: (): GeolocationSessionId => createGeolocationSessionId(),
  config,
});

/**
 * Geolocation utility types with strict patterns
 */
export type GeolocationUtility<T> = {
  readonly validate: (value: T) => boolean;
  readonly sanitize: (value: T) => T;
  readonly format: (value: T) => string;
  readonly parse: (value: string) => T | null;
};

/**
 * Geolocation error handling with strict patterns
 */
export type GeolocationErrorHandler = {
  readonly handle: (error: GeolocationError) => void;
  readonly recover: (error: GeolocationError) => Promise<Location | null>;
  readonly retry: (operation: () => Promise<Location>) => Promise<Location>;
};

/**
 * Geolocation privacy utilities with strict patterns
 */
export type GeolocationPrivacyUtils = {
  readonly anonymize: (location: Location) => Location;
  readonly obfuscate: (coordinates: Coordinates) => Coordinates;
  readonly sanitize: (location: Location) => Partial<Location>;
};
