/**
 * Core Type Definitions for Metro Station Finder
 *
 * This module defines the foundational branded types and core domain types
 * used throughout the application. All types follow strict TypeScript
 * with branded types for type safety at domain boundaries.
 *
 * @fileoverview Core type definitions with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import {
  COORDINATE_BOUNDS,
  ID_CONSTANTS,
  VALIDATION_PATTERNS,
} from "@/lib/constants";

/**
 * Template literal types for operations
 */
export type CoreOperation =
  `core:${"validate" | "create" | "transform" | "serialize"}`;
export type ValidationOperation =
  `validate:${"type" | "range" | "format" | "constraint"}`;

/**
 * Branded type factory types
 */
export type BrandedTypeFactory<T, U> = (value: T) => U;
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

/**
 * Branded types for domain safety at boundaries
 *
 * These types prevent accidental mixing of different domain concepts
 * that have the same underlying primitive type (e.g., string, number).
 * Enhanced with strict TypeScript patterns for better type safety.
 *
 * @example
 * ```typescript
 * const stationId: StationId = createStationId('mrt-uttara');
 * const amount: TakaAmount = createTakaAmount(20);
 * ```
 */
export type StationId = string & { readonly __brand: "StationId" };
export type TakaAmount = number & { readonly __brand: "TakaAmount" };
export type Meters = number & { readonly __brand: "Meters" };
export type Kilometers = number & { readonly __brand: "Kilometers" };
export type Minutes = number & { readonly __brand: "Minutes" };
export type Milliseconds = number & { readonly __brand: "Milliseconds" };
export type Latitude = number & { readonly __brand: "Latitude" };
export type Longitude = number & { readonly __brand: "Longitude" };
export type PlaceId = string & { readonly __brand: "PlaceId" };

/**
 * Additional branded types for enhanced type safety
 */
export type UserId = string & { readonly __brand: "UserId" };
export type SessionId = string & { readonly __brand: "SessionId" };
export type RequestId = string & { readonly __brand: "RequestId" };
export type CacheKey = string & { readonly __brand: "CacheKey" };
export type Version = string & { readonly __brand: "Version" };
export type Hash = string & { readonly __brand: "Hash" };

/**
 * Core coordinate system for geographic locations
 *
 * Represents a point on Earth using WGS84 coordinates.
 * Latitude ranges from -90 to 90 degrees.
 * Longitude ranges from -180 to 180 degrees.
 */
export type Coordinates = {
  readonly lat: Latitude;
  readonly lng: Longitude;
};

/**
 * Enhanced Result pattern for error handling
 *
 * Provides a type-safe way to handle operations that can succeed or fail.
 * This pattern eliminates the need for throwing exceptions and makes
 * error handling explicit in the type system.
 *
 * @template T The success data type
 * @template E The error type (defaults to string)
 */
export type Result<T, E = string> =
  | { readonly success: true; readonly data: T; readonly meta?: ResultMetadata }
  | {
      readonly success: false;
      readonly error: E;
      readonly message: string;
      readonly code?: string;
    };

/**
 * Result metadata for enhanced context
 */
export type ResultMetadata = {
  readonly timestamp: Milliseconds;
  readonly processingTime: Milliseconds;
  readonly version: Version;
  readonly requestId?: RequestId;
};

/**
 * Success response with metadata
 *
 * Standardized success response format for API operations.
 * Includes processing time and version information for debugging.
 *
 * @template T The response data type
 */
export type SuccessResponse<T> = {
  readonly success: true;
  readonly data: T;
  readonly meta: {
    readonly processingTime: Milliseconds;
    readonly version: string;
  };
};

/**
 * Error response with structured error information
 *
 * Standardized error response format with error codes and hints.
 * Provides consistent error handling across the application.
 *
 * @template E The error code type (defaults to string)
 */
export type ErrorResponse<E extends string = string> = {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
    readonly hint?: string;
  };
};

/**
 * Union type for all API responses
 *
 * Combines success and error responses into a single type.
 * This ensures all API operations return a consistent response format.
 *
 * @template T The success data type
 * @template E The error code type
 */
export type ApiResponse<T, E extends string = string> =
  | SuccessResponse<T>
  | ErrorResponse<E>;

/**
 * Advanced utility types for type manipulation
 */

/**
 * Extract success data from Result type
 *
 * @template T The Result type
 * @returns The success data type or never
 */
export type ExtractSuccess<T> = T extends { success: true; data: infer U }
  ? U
  : never;

/**
 * Extract error from Result type
 *
 * @template T The Result type
 * @returns The error type or never
 */
export type ExtractError<T> = T extends { success: false; error: infer U }
  ? U
  : never;

/**
 * Non-empty array type
 *
 * Ensures an array has at least one element.
 * Useful for operations that require non-empty collections.
 *
 * @template T The array element type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Deep readonly for immutability
 *
 * Makes all properties and nested properties readonly.
 * Ensures data structures cannot be mutated after creation.
 *
 * @template T The type to make deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Branded type helper
 *
 * Creates a branded type by intersecting with a brand symbol.
 * Used internally for creating branded types.
 *
 * @template T The base type
 * @template U The brand type
 */
export type Brand<T, U> = T & { readonly __brand: U };

/**
 * Advanced utility types
 */

/**
 * Extract branded type from branded type
 */
export type ExtractBrand<T> = T extends { readonly __brand: infer U }
  ? U
  : never;

/**
 * Create partial type with specific keys
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Create required type with specific keys
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Create mutable version of readonly type
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Create array type with minimum length
 */
export type MinArray<T, N extends number> = T[] & { readonly length: N };

/**
 * Create tuple type with specific length
 */
export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;

type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [...R, T]>;

/**
 * Create discriminated union helper
 */
export type DiscriminatedUnion<
  T,
  K extends keyof T,
  V extends T[K],
> = T extends Record<K, V> ? T : never;

/**
 * Create function type with specific parameters
 */
export type FunctionWithParams<T extends readonly unknown[], R> = (
  ...args: T
) => R;

/**
 * Create async function type
 */
export type AsyncFunction<T extends readonly unknown[], R> = (
  ...args: T
) => Promise<R>;

/**
 * Create generator function type
 */
export type GeneratorFunction<T, R, N> = () => Generator<T, R, N>;

/**
 * Create async generator function type
 */
export type AsyncGeneratorFunction<T, R, N> = () => AsyncGenerator<T, R, N>;

/**
 * Type guards for runtime validation
 */

/**
 * Type guard for StationId validation
 *
 * @param value The value to check
 * @returns True if value is a valid StationId
 */
export function isStationId(value: unknown): value is StationId {
  return typeof value === "string" && value.length > 0;
}

/**
 * Type guard for Coordinates validation
 *
 * @param value The value to check
 * @returns True if value is valid Coordinates
 */
export function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // Type assertion to access properties directly
  const coords = value as { lat?: unknown; lng?: unknown };

  return (
    "lat" in value &&
    "lng" in value &&
    typeof coords.lat === "number" &&
    typeof coords.lng === "number" &&
    coords.lat >= COORDINATE_BOUNDS.latitudeMin &&
    coords.lat <= COORDINATE_BOUNDS.latitudeMax &&
    coords.lng >= COORDINATE_BOUNDS.longitudeMin &&
    coords.lng <= COORDINATE_BOUNDS.longitudeMax &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng)
  );
}

/**
 * Type guard for TakaAmount validation
 *
 * @param value The value to check
 * @returns True if value is a valid TakaAmount
 */
export function isTakaAmount(value: unknown): value is TakaAmount {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isFinite(value)
  );
}

/**
 * Type guard for Meters validation
 *
 * @param value The value to check
 * @returns True if value is a valid Meters
 */
export function isMeters(value: unknown): value is Meters {
  return typeof value === "number" && value >= 0 && Number.isFinite(value);
}

/**
 * Type guard for Kilometers validation
 *
 * @param value The value to check
 * @returns True if value is a valid Kilometers
 */
export function isKilometers(value: unknown): value is Kilometers {
  return typeof value === "number" && value >= 0 && Number.isFinite(value);
}

/**
 * Type guard for Minutes validation
 *
 * @param value The value to check
 * @returns True if value is a valid Minutes
 */
export function isMinutes(value: unknown): value is Minutes {
  return typeof value === "number" && value >= 0 && Number.isFinite(value);
}

/**
 * Type guard for Milliseconds validation
 *
 * @param value The value to check
 * @returns True if value is a valid Milliseconds
 */
export function isMilliseconds(value: unknown): value is Milliseconds {
  return (
    typeof value === "number" &&
    value >= 0 &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

/**
 * Type guard for Latitude validation
 *
 * @param value The value to check
 * @returns True if value is a valid Latitude
 */
export function isLatitude(value: unknown): value is Latitude {
  return (
    typeof value === "number" &&
    value >= COORDINATE_BOUNDS.latitudeMin &&
    value <= COORDINATE_BOUNDS.latitudeMax &&
    Number.isFinite(value)
  );
}

/**
 * Type guard for Longitude validation
 *
 * @param value The value to check
 * @returns True if value is a valid Longitude
 */
export function isLongitude(value: unknown): value is Longitude {
  return (
    typeof value === "number" &&
    value >= COORDINATE_BOUNDS.longitudeMin &&
    value <= COORDINATE_BOUNDS.longitudeMax &&
    Number.isFinite(value)
  );
}

/**
 * Type guard for PlaceId validation
 *
 * @param value The value to check
 * @returns True if value is a valid PlaceId
 */
export function isPlaceId(value: unknown): value is PlaceId {
  return typeof value === "string" && value.length > 0;
}

/**
 * Type guard for success response
 *
 * @param response The response to check
 * @returns True if response is a success response
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error response
 *
 * @param response The response to check
 * @returns True if response is an error response
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

/**
 * Branded type creation functions
 *
 * These functions create branded types with validation.
 * They ensure type safety at runtime while maintaining compile-time safety.
 */

/**
 * Create a StationId with validation
 *
 * @param id The station ID string
 * @returns A branded StationId
 * @throws Error if id is invalid
 */
export function createStationId(id: string): StationId {
  if (!isStationId(id)) {
    throw new Error(`Invalid StationId: ${id}`);
  }
  return id as StationId;
}

/**
 * Create Coordinates with validation
 *
 * @param lat The latitude (-90 to 90)
 * @param lng The longitude (-180 to 180)
 * @returns A branded Coordinates object
 * @throws Error if coordinates are invalid
 */
export function createCoordinates(lat: number, lng: number): Coordinates {
  if (!isLatitude(lat)) {
    throw new Error(
      `Invalid latitude: ${lat}. Must be between ${COORDINATE_BOUNDS.latitudeMin} and ${COORDINATE_BOUNDS.latitudeMax}.`
    );
  }
  if (!isLongitude(lng)) {
    throw new Error(
      `Invalid longitude: ${lng}. Must be between ${COORDINATE_BOUNDS.longitudeMin} and ${COORDINATE_BOUNDS.longitudeMax}.`
    );
  }
  return {
    lat: lat as Latitude,
    lng: lng as Longitude,
  };
}

/**
 * Create a TakaAmount with validation
 *
 * @param amount The amount in Taka
 * @returns A branded TakaAmount
 * @throws Error if amount is invalid
 */
export function createTakaAmount(amount: number): TakaAmount {
  if (!isTakaAmount(amount)) {
    throw new Error(
      `Invalid TakaAmount: ${amount}. Must be a non-negative integer.`
    );
  }
  return amount as TakaAmount;
}

/**
 * Create Meters with validation
 *
 * @param value The value in meters
 * @returns A branded Meters
 * @throws Error if value is invalid
 */
export function createMeters(value: number): Meters {
  if (!isMeters(value)) {
    throw new Error(
      `Invalid Meters: ${value}. Must be a non-negative finite number.`
    );
  }
  return value as Meters;
}

/**
 * Create Kilometers with validation
 *
 * @param value The value in kilometers
 * @returns A branded Kilometers
 * @throws Error if value is invalid
 */
export function createKilometers(value: number): Kilometers {
  if (!isKilometers(value)) {
    throw new Error(
      `Invalid Kilometers: ${value}. Must be a non-negative finite number.`
    );
  }
  return value as Kilometers;
}

/**
 * Create Minutes with validation
 *
 * @param value The value in minutes
 * @returns A branded Minutes
 * @throws Error if value is invalid
 */
export function createMinutes(value: number): Minutes {
  if (!isMinutes(value)) {
    throw new Error(
      `Invalid Minutes: ${value}. Must be a non-negative finite number.`
    );
  }
  return value as Minutes;
}

/**
 * Create Milliseconds with validation
 *
 * @param value The value in milliseconds
 * @returns A branded Milliseconds
 * @throws Error if value is invalid
 */
export function createMilliseconds(value: number): Milliseconds {
  if (!isMilliseconds(value)) {
    throw new Error(
      `Invalid Milliseconds: ${value}. Must be a non-negative finite integer.`
    );
  }
  return value as Milliseconds;
}

/**
 * Create Latitude with validation
 *
 * @param value The latitude value (-90 to 90)
 * @returns A branded Latitude
 * @throws Error if value is invalid
 */
export function createLatitude(value: number): Latitude {
  if (!isLatitude(value)) {
    throw new Error(
      `Invalid Latitude: ${value}. Must be between ${COORDINATE_BOUNDS.latitudeMin} and ${COORDINATE_BOUNDS.latitudeMax}.`
    );
  }
  return value as Latitude;
}

/**
 * Create Longitude with validation
 *
 * @param value The longitude value (-180 to 180)
 * @returns A branded Longitude
 * @throws Error if value is invalid
 */
export function createLongitude(value: number): Longitude {
  if (!isLongitude(value)) {
    throw new Error(
      `Invalid Longitude: ${value}. Must be between ${COORDINATE_BOUNDS.longitudeMin} and ${COORDINATE_BOUNDS.longitudeMax}.`
    );
  }
  return value as Longitude;
}

/**
 * Create PlaceId with validation
 *
 * @param id The place ID string
 * @returns A branded PlaceId
 * @throws Error if id is invalid
 */
export function createPlaceId(id: string): PlaceId {
  if (!isPlaceId(id)) {
    throw new Error(`Invalid PlaceId: ${id}. Must be a non-empty string.`);
  }
  return id as PlaceId;
}

/**
 * Safe JSON parse with error handling
 *
 * @param json The JSON string to parse
 * @param reviver Optional reviver function
 * @returns Parsed JSON or null if parsing fails
 */
export function safeJsonParse<T = unknown>(
  json: string,
  reviver?: (key: string, value: unknown) => unknown
): T | null {
  try {
    return JSON.parse(json, reviver) as T;
  } catch {
    return null;
  }
}

import { DHAKA_SERVICE_AREA } from "@/lib/constants";

/**
 * Dhaka service area configuration
 *
 * Defines the geographic boundaries for the metro service area.
 * Used for validating user locations and determining service coverage.
 */
export const DHAKA_CENTROID: Coordinates = DHAKA_SERVICE_AREA.centroid;
export const SERVICE_AREA_RADIUS_KM = DHAKA_SERVICE_AREA.radiusKm;

import type { ERROR_CODES } from "@/lib/constants";

/**
 * Error code types for type safety
 */
export type StationErrorCode =
  (typeof ERROR_CODES.station)[keyof typeof ERROR_CODES.station];
export type FareErrorCode =
  (typeof ERROR_CODES.fare)[keyof typeof ERROR_CODES.fare];
export type GeolocationErrorCode =
  (typeof ERROR_CODES.geolocation)[keyof typeof ERROR_CODES.geolocation];
export type GooglePlacesErrorCode =
  (typeof ERROR_CODES.googlePlaces)[keyof typeof ERROR_CODES.googlePlaces];

/**
 * API quota management types
 */
export type ApiQuotaInfo = {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Milliseconds;
  readonly isExceeded: boolean;
};

export type QuotaStatus = {
  readonly places: ApiQuotaInfo;
  readonly maps: ApiQuotaInfo;
  readonly geocoding: ApiQuotaInfo;
  readonly isRateLimited: boolean;
  readonly lastResetTime: Milliseconds;
};

/**
 * Advanced factory functions
 */

/**
 * Create UserId with validation
 */
export function createUserId(id: string): UserId {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Invalid UserId: ${id}. Must be a non-empty string.`);
  }
  return id as UserId;
}

/**
 * Create SessionId with validation
 */
export function createSessionId(id: string): SessionId {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Invalid SessionId: ${id}. Must be a non-empty string.`);
  }
  return id as SessionId;
}

/**
 * Create RequestId with validation
 */
export function createRequestId(id: string): RequestId {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Invalid RequestId: ${id}. Must be a non-empty string.`);
  }
  return id as RequestId;
}

/**
 * Create CacheKey with validation
 */
export function createCacheKey(key: string): CacheKey {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error(`Invalid CacheKey: ${key}. Must be a non-empty string.`);
  }
  return key as CacheKey;
}

/**
 * Create Version with validation
 */
export function createVersion(version: string): Version {
  if (
    typeof version !== "string" ||
    !VALIDATION_PATTERNS.semver.test(version)
  ) {
    throw new Error(
      `Invalid Version: ${version}. Must be in semver format (e.g., 1.0.0).`
    );
  }
  return version as Version;
}

/**
 * Create Hash with validation
 */
export function createHash(hash: string): Hash {
  if (typeof hash !== "string" || hash.length === 0) {
    throw new Error(`Invalid Hash: ${hash}. Must be a non-empty string.`);
  }
  return hash as Hash;
}

/**
 * Type-safe factory with configuration
 */
export const createBrandedTypeFactory =
  <T, U extends string>(
    validator: (value: T) => boolean,
    errorMessage: string
  ) =>
  (value: T): Brand<T, U> => {
    if (!validator(value)) {
      throw new Error(`${errorMessage}: ${value}`);
    }
    return value as Brand<T, U>;
  };

/**
 * Validation utilities
 */
export const createValidationResult = <T>(
  data: T,
  isValid: boolean,
  error?: string,
  code?: string
): ValidationResult<T> => {
  if (isValid) {
    return { success: true, data };
  }
  return {
    success: false,
    error: error ?? "Validation failed",
    code: code ?? "VALIDATION_ERROR",
  };
};

/**
 * Type-safe serialization
 */
export const createSerializer = <T>() => ({
  serialize: (value: T): string => JSON.stringify(value),
  deserialize: (json: string): T | null => safeJsonParse<T>(json),
  validate: (value: unknown): value is T => {
    // This would be implemented with specific validation logic
    return typeof value === "object" && value !== null;
  },
});

/**
 * Event system types
 */
export type CoreEvent<T = unknown> = {
  readonly type: CoreOperation;
  readonly payload: T;
  readonly timestamp: Milliseconds;
  readonly id: RequestId;
  readonly version: Version;
};

/**
 * Subscription types
 */
export type CoreSubscription<T> = {
  readonly unsubscribe: () => void;
  readonly getValue: () => T;
  readonly subscribe: (callback: (value: T) => void) => void;
  readonly isActive: boolean;
};

/**
 * Middleware types
 */
export type CoreMiddleware<T> = (value: T) => T;
export type CoreMiddlewareChain<T> = readonly CoreMiddleware<T>[];

/**
 * Performance monitoring
 */
export type CorePerformanceMetrics = {
  readonly operationTime: Milliseconds;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly timestamp: Milliseconds;
};

/**
 * Configuration types
 */
export type CoreConfig = {
  readonly version: Version;
  readonly environment: "development" | "production" | "test";
  readonly debugMode: boolean;
  readonly enableMetrics: boolean;
  readonly enableLogging: boolean;
};

/**
 * Core factory with configuration
 */
export const createCoreFactory = (config: CoreConfig) => ({
  createEvent: <T>(type: CoreOperation, payload: T): CoreEvent<T> => ({
    type,
    payload,
    timestamp: Date.now() as Milliseconds,
    id: createRequestId(
      `event_${Date.now()}_${Math.random()
        .toString(ID_CONSTANTS.base36)
        .slice(
          ID_CONSTANTS.idStartIndex,
          ID_CONSTANTS.idStartIndex + ID_CONSTANTS.idLength
        )}`
    ),
    version: config.version,
  }),
  createSubscription: <T>(initialValue: T): CoreSubscription<T> => {
    const currentValue = initialValue;
    const subscribers = new Set<(value: T) => void>();

    return {
      getValue: () => currentValue,
      subscribe: (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      unsubscribe: () => subscribers.clear(),
      isActive: subscribers.size > 0,
    };
  },
  config,
});
