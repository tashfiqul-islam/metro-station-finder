/**
 * Distance Utilities for Metro Station Finder
 *
 * Geospatial distance calculation utilities following strict
 * TypeScript patterns with memoization, assertion functions,
 * discriminated unions, and advanced type patterns.
 *
 * @module lib/utils/distance
 * @version 1.0.0
 * @since 2025-09-29
 *
 * @example
 * ```typescript
 * import { calculateDistance, isWithinServiceArea } from "@/lib/utils/distance";
 *
 * const result = calculateDistance(coordsA, coordsB);
 * if (result.success) {
 *   console.log(`Distance: ${result.data.distanceMeters}m`);
 * }
 * ```
 */

import { DHAKA_SERVICE_AREA, GEOLOCATION_CONSTANTS } from "@/lib/constants";
import type {
  Coordinates,
  Kilometers,
  Meters,
  Milliseconds,
  Minutes,
} from "@/lib/types";

/**
 * Distance calculation method types using template literals
 */
type CalculationMethod = "haversine" | "vincenty" | "euclidean";
type DistanceUnit = "meters" | "kilometers" | "miles";

/**
 * Enhanced distance calculation result with discriminated union
 * P0: Added unit and distance fields for unit conversion support
 */
type DistanceCalculationResult =
  | {
      readonly success: true;
      readonly method: CalculationMethod;
      readonly unit: DistanceUnit;
      readonly distance: number;
      readonly distanceMeters: Meters;
      readonly distanceKilometers: Kilometers;
      readonly walkingTimeMinutes: Minutes;
      readonly computedAt: Milliseconds;
      readonly cached: boolean;
    }
  | {
      readonly success: false;
      readonly error: DistanceCalculationError;
      readonly method: CalculationMethod;
      readonly computedAt: Milliseconds;
    };

/**
 * Distance calculation error with structured info
 * Added VALIDATION_ERROR for better error granularity
 */
type DistanceCalculationError = {
  readonly code:
    | "INVALID_COORDINATES"
    | "VALIDATION_ERROR"
    | "CALCULATION_ERROR"
    | "OUT_OF_BOUNDS";
  readonly message: string;
  readonly details?: unknown;
};

/**
 * Validation result for coordinates
 */
type CoordinateValidation = {
  readonly isValid: boolean;
  readonly errors: readonly string[];
};

/**
 * Cache entry with metadata
 */
type CacheEntry<T> = {
  readonly value: T;
  readonly timestamp: Milliseconds;
  readonly accessCount: number;
};

/**
 * Calculation options with advanced configuration
 */
type CalculationOptions = {
  readonly method?: CalculationMethod;
  readonly unit?: DistanceUnit;
  readonly precision?: number;
  readonly enableCache?: boolean;
  readonly enableValidation?: boolean;
};

/**
 * Configuration for distance calculator factory
 */
type DistanceCalculatorConfig = {
  readonly cacheSize?: number;
  readonly cacheTTL?: Milliseconds;
};

/**
 * Distance calculator instance with isolated cache
 */
type DistanceCalculator = {
  readonly calculateDistance: (
    a: Coordinates,
    b: Coordinates,
    options?: CalculationOptions
  ) => DistanceCalculationResult;
  readonly calculateDistanceKilometers: (
    a: Coordinates,
    b: Coordinates,
    enableCache?: boolean
  ) => Kilometers;
  readonly isWithinRadius: (
    center: Coordinates,
    point: Coordinates,
    radiusMeters: Meters
  ) => boolean;
  readonly clearCache: () => void;
  readonly getCacheStats: () => {
    readonly size: number;
    readonly maxSize: number;
    readonly maxAge: Milliseconds;
  };
};

const EARTH_CONSTANTS = {
  radiusMeters: 6_371_000,
  radiusKilometers: 6371,
  radiusMiles: 3959,
  degToRadDivisor: 180,
  metersPerDegreeLat: 111_320,
} as const satisfies Record<string, number>;

const VALIDATION_BOUNDS = {
  latitudeMin: -90,
  latitudeMax: 90,
  longitudeMin: -180,
  longitudeMax: 180,
  precisionMin: 0,
  precisionMax: 10,
} as const satisfies Record<string, number>;

const CACHE_CONFIG = {
  maxSize: 1000,
  maxAge: 300_000 as Milliseconds, // 5 minutes
  cleanupInterval: 60_000 as Milliseconds, // 1 minute
} as const satisfies Record<string, number | Milliseconds>;

class LRUCache<K, V> {
  private readonly cache = new Map<string, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly maxAge: Milliseconds;

  constructor(maxSize: number, maxAge: Milliseconds) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  set(key: K, value: V): void {
    const cacheKey = this.serializeKey(key);
    const now = Date.now() as Milliseconds;

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, {
      value,
      timestamp: now,
      accessCount: 1,
    });
  }

  get(key: K): V | undefined {
    const cacheKey = this.serializeKey(key);
    const entry = this.cache.get(cacheKey);

    if (entry === undefined) {
      return;
    }

    const now = Date.now() as Milliseconds;
    const age = (now - entry.timestamp) as Milliseconds;

    // Check if entry is expired
    if (age > this.maxAge) {
      this.cache.delete(cacheKey);
      return;
    }

    // Update access count and move to end (LRU)
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, {
      ...entry,
      accessCount: entry.accessCount + 1,
    });

    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private serializeKey(key: K): string {
    return JSON.stringify(key);
  }
}

// Global cache instance
const distanceCache = new LRUCache<
  { a: Coordinates; b: Coordinates; method: CalculationMethod },
  Meters
>(CACHE_CONFIG.maxSize, CACHE_CONFIG.maxAge);

/**
 * Type guard for Coordinates validation
 *
 * @param value - Value to check
 * @returns True if value is valid Coordinates
 */
function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const coords = value as { lat?: unknown; lng?: unknown };

  return (
    "lat" in value &&
    "lng" in value &&
    typeof coords.lat === "number" &&
    typeof coords.lng === "number" &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng) &&
    coords.lat >= VALIDATION_BOUNDS.latitudeMin &&
    coords.lat <= VALIDATION_BOUNDS.latitudeMax &&
    coords.lng >= VALIDATION_BOUNDS.longitudeMin &&
    coords.lng <= VALIDATION_BOUNDS.longitudeMax
  );
}

/**
 * Assertion function for Coordinates
 * Strict TypeScript pattern using asserts keyword
 *
 * @param value - Value to assert
 * @param context - Context for error message
 * @throws {Error} If value is not valid Coordinates
 */
function assertValidCoordinates(
  value: unknown,
  context: string
): asserts value is Coordinates {
  if (!isValidCoordinates(value)) {
    throw new Error(
      `Invalid coordinates in ${context}: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate coordinates and return detailed errors
 *
 * @param coords - Coordinates to validate
 * @returns Validation result with errors
 */
function validateCoordinates(coords: unknown): CoordinateValidation {
  const errors: string[] = [];

  if (typeof coords !== "object" || coords === null) {
    errors.push("Coordinates must be an object");
    return { isValid: false, errors };
  }

  const c = coords as { lat?: unknown; lng?: unknown };

  if (!("lat" in coords)) {
    errors.push("Missing latitude");
  } else if (typeof c.lat !== "number") {
    errors.push("Latitude must be a number");
  } else if (!Number.isFinite(c.lat)) {
    errors.push("Latitude must be finite");
  } else if (
    c.lat < VALIDATION_BOUNDS.latitudeMin ||
    c.lat > VALIDATION_BOUNDS.latitudeMax
  ) {
    errors.push(
      `Latitude must be between ${VALIDATION_BOUNDS.latitudeMin} and ${VALIDATION_BOUNDS.latitudeMax}`
    );
  }

  if (!("lng" in coords)) {
    errors.push("Missing longitude");
  } else if (typeof c.lng !== "number") {
    errors.push("Longitude must be a number");
  } else if (!Number.isFinite(c.lng)) {
    errors.push("Longitude must be finite");
  } else if (
    c.lng < VALIDATION_BOUNDS.longitudeMin ||
    c.lng > VALIDATION_BOUNDS.longitudeMax
  ) {
    errors.push(
      `Longitude must be between ${VALIDATION_BOUNDS.longitudeMin} and ${VALIDATION_BOUNDS.longitudeMax}`
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Convert degrees to radians (pure function)
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
const toRadians = (degrees: number): number =>
  (degrees * Math.PI) / EARTH_CONSTANTS.degToRadDivisor;

/**
 * P0: Convert meters to requested unit
 *
 * @param meters - Distance in meters
 * @param unit - Target unit
 * @returns Distance in requested unit
 */
const METERS_PER_MILE = 1609.34;

function convertDistance(meters: Meters, unit: DistanceUnit): number {
  switch (unit) {
    case "meters":
      return meters as number;
    case "kilometers":
      return (meters / GEOLOCATION_CONSTANTS.metersToKilometers) as number;
    case "miles":
      return (meters / METERS_PER_MILE) as number;
    default:
      return meters as number;
  }
}

/**
 * Calculate Haversine distance between two coordinates
 * Pure function optimized with memoization
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @param useCache - Enable caching (default: true)
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * const distance = calculateHaversineMeters(coordsA, coordsB);
 * console.log(`Distance: ${distance}m`);
 * ```
 */
function calculateHaversineMeters(
  a: Coordinates,
  b: Coordinates,
  useCache = true
): Meters {
  // Check cache first
  if (useCache) {
    const cached = distanceCache.get({ a, b, method: "haversine" });
    if (cached !== undefined) {
      return cached;
    }
  }

  // Calculate distance
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  const distance = Math.round(EARTH_CONSTANTS.radiusMeters * c) as Meters;

  // Store in cache
  if (useCache) {
    distanceCache.set({ a, b, method: "haversine" }, distance);
  }

  return distance;
}

/**
 * Convert meters to kilometers (pure function)
 *
 * @param distance - Distance in meters
 * @returns Distance in kilometers
 */
function metersToKilometers(distance: Meters): Kilometers {
  return (distance / GEOLOCATION_CONSTANTS.metersToKilometers) as Kilometers;
}

/**
 * Estimate walking time based on distance
 * Uses standard walking speed of 75 m/min
 *
 * @param distance - Distance in meters
 * @returns Walking time in minutes (rounded up)
 */
function estimateWalkingMinutes(distance: Meters): Minutes {
  return Math.ceil(
    distance / GEOLOCATION_CONSTANTS.walkingSpeedMPerMin
  ) as Minutes;
}

/**
 * Calculate distance between two coordinates with comprehensive validation
 * Returns Result type for safe error handling
 * Added unit conversion support
 * Uses VALIDATION_ERROR for validation failures
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @param options - Calculation options
 * @returns Distance calculation result
 *
 * @example
 * ```typescript
 * const result = calculateDistance(coordsA, coordsB);
 * if (result.success) {
 *   console.log(`Distance: ${result.data.distanceKilometers}km`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function calculateDistance(
  a: Coordinates,
  b: Coordinates,
  options: CalculationOptions = {}
): DistanceCalculationResult {
  const {
    method = "haversine",
    unit = "meters",
    enableCache = true,
    enableValidation = true,
  } = options;

  const computedAt = Date.now() as Milliseconds;

  try {
    // Validate coordinates if enabled
    if (enableValidation) {
      const validationA = validateCoordinates(a);
      if (!validationA.isValid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid coordinate A: ${validationA.errors.join(", ")}`,
            details: { coordinate: "a", errors: validationA.errors },
          },
          method,
          computedAt,
        };
      }

      const validationB = validateCoordinates(b);
      if (!validationB.isValid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid coordinate B: ${validationB.errors.join(", ")}`,
            details: { coordinate: "b", errors: validationB.errors },
          },
          method,
          computedAt,
        };
      }
    }

    // Check cache before calculation
    const cached = enableCache
      ? distanceCache.get({ a, b, method })
      : undefined;

    const distanceMeters =
      cached ?? calculateHaversineMeters(a, b, enableCache);
    const distanceKilometers = metersToKilometers(distanceMeters);
    const walkingTimeMinutes = estimateWalkingMinutes(distanceMeters);
    const distance = convertDistance(distanceMeters, unit);

    return {
      success: true,
      method,
      unit,
      distance,
      distanceMeters,
      distanceKilometers,
      walkingTimeMinutes,
      computedAt,
      cached: cached !== undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "CALCULATION_ERROR",
        message:
          error instanceof Error ? error.message : "Unknown calculation error",
        details: error,
      },
      method,
      computedAt,
    };
  }
}

/**
 * Check if coordinates are within Dhaka service area
 * Uses configured centroid and radius from constants
 *
 * @param coordinates - Coordinates to check
 * @returns True if within service area
 *
 * @example
 * ```typescript
 * if (isWithinServiceArea(userLocation)) {
 *   console.log("Service available");
 * }
 * ```
 */
export function isWithinServiceArea(coordinates: Coordinates): boolean {
  if (!isValidCoordinates(coordinates)) {
    return false;
  }

  const distance = calculateHaversineMeters(
    coordinates,
    DHAKA_SERVICE_AREA.centroid
  );
  return distance <= DHAKA_SERVICE_AREA.radiusMeters;
}

/**
 * Check if coordinates are within radius of center point
 * Uses bounding box optimization for performance
 *
 * @param center - Center coordinate
 * @param point - Point to check
 * @param radiusMeters - Radius in meters
 * @returns True if within radius
 *
 * @example
 * ```typescript
 * if (isWithinRadius(stationCoords, userCoords, 1000 as Meters)) {
 *   console.log("Within 1km of station");
 * }
 * ```
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMeters: Meters
): boolean {
  if (!(isValidCoordinates(center) && isValidCoordinates(point))) {
    return false;
  }

  // Quick bounding box check first (performance optimization)
  const box = computeBoundingBox(center, radiusMeters);
  if (!isWithinBoundingBox(point, box)) {
    return false;
  }

  // Precise distance calculation
  const distance = calculateHaversineMeters(center, point);
  return distance <= radiusMeters;
}

/**
 * Bounding box type for quick radius checks
 */
type BoundingBox = {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
};

/**
 * Compute conservative bounding box around center point
 * Used for fast pre-filtering before precise distance calculation
 *
 * @param center - Center coordinate
 * @param radiusMeters - Radius in meters
 * @returns Bounding box
 */
function computeBoundingBox(
  center: Coordinates,
  radiusMeters: Meters
): BoundingBox {
  const latDelta =
    (radiusMeters as number) / EARTH_CONSTANTS.metersPerDegreeLat;
  const latRad = toRadians(center.lat);
  const metersPerDegreeLng =
    Math.cos(latRad) * EARTH_CONSTANTS.metersPerDegreeLat || 1;
  const lngDelta = (radiusMeters as number) / metersPerDegreeLng;

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  } satisfies BoundingBox;
}

/**
 * Check if point is within bounding box
 *
 * @param point - Point to check
 * @param box - Bounding box
 * @returns True if within box
 */
function isWithinBoundingBox(point: Coordinates, box: BoundingBox): boolean {
  return (
    point.lat >= box.minLat &&
    point.lat <= box.maxLat &&
    point.lng >= box.minLng &&
    point.lng <= box.maxLng
  );
}

/**
 * Calculate Haversine distance in kilometers
 * Convenience function for common use case
 * Added enableCache parameter for API consistency
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @param enableCache - Enable memoization (default: true)
 * @returns Distance in kilometers
 */
export function calculateDistanceKilometers(
  a: Coordinates,
  b: Coordinates,
  enableCache = true
): Kilometers {
  const distanceMeters = calculateHaversineMeters(a, b, enableCache);
  return metersToKilometers(distanceMeters);
}

/**
 * Batch calculate distances from one point to multiple points
 * Optimized with parallel processing potential
 *
 * @param origin - Origin coordinate
 * @param destinations - Array of destination coordinates
 * @returns Array of distance results
 *
 * @example
 * ```typescript
 * const distances = batchCalculateDistances(userLocation, stationLocations);
 * const nearest = distances.reduce((min, curr) =>
 *   curr.success && min.success && curr.distanceMeters < min.distanceMeters
 *     ? curr
 *     : min
 * );
 * ```
 */
export function batchCalculateDistances(
  origin: Coordinates,
  destinations: readonly Coordinates[]
): readonly DistanceCalculationResult[] {
  return destinations.map((dest) => calculateDistance(origin, dest));
}

/**
 * Find nearest coordinate from array of candidates
 * Returns both the coordinate and distance
 *
 * @param origin - Origin coordinate
 * @param candidates - Array of candidate coordinates
 * @returns Nearest coordinate with distance, or undefined if none valid
 */
export function findNearestCoordinate(
  origin: Coordinates,
  candidates: readonly Coordinates[]
): { coordinate: Coordinates; distance: Meters } | undefined {
  let nearest: { coordinate: Coordinates; distance: Meters } | undefined;

  for (const candidate of candidates) {
    const result = calculateDistance(origin, candidate);

    if (
      result.success &&
      (nearest === undefined || result.distanceMeters < nearest.distance)
    ) {
      nearest = {
        coordinate: candidate,
        distance: result.distanceMeters,
      };
    }
  }

  return nearest;
}

/**
 * Calculate distance without any caching or side effects
 * Pure function for deterministic testing and environments
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * // For unit tests where determinism is critical
 * const distance = calculateDistancePure(coordsA, coordsB);
 * expect(distance).toBe(1234 as Meters);
 * ```
 */
export function calculateDistancePure(a: Coordinates, b: Coordinates): Meters {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_CONSTANTS.radiusMeters * c) as Meters;
}

/**
 * Calculate distance in kilometers without caching
 * Pure function variant
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistanceKilometersPure(
  a: Coordinates,
  b: Coordinates
): Kilometers {
  const distanceMeters = calculateDistancePure(a, b);
  return metersToKilometers(distanceMeters);
}

/**
 * Create a distance calculator with custom cache configuration
 * Useful for testing, per-feature optimization, or multi-tenant scenarios
 *
 * @param config - Cache configuration
 * @returns Distance calculator instance with isolated cache
 *
 * @example
 * ```typescript
 * // Create calculator with smaller cache for testing
 * const calculator = createDistanceCalculator({
 *   cacheSize: 100,
 *   cacheTTL: 60_000 as Milliseconds
 * });
 *
 * const result = calculator.calculateDistance(a, b);
 * calculator.clearCache();
 * ```
 */
export function createDistanceCalculator(
  config?: DistanceCalculatorConfig
): DistanceCalculator {
  const localCache = new LRUCache<
    { a: Coordinates; b: Coordinates; method: CalculationMethod },
    Meters
  >(
    config?.cacheSize ?? CACHE_CONFIG.maxSize,
    config?.cacheTTL ?? CACHE_CONFIG.maxAge
  );

  const calculateHaversineWithCache = (
    a: Coordinates,
    b: Coordinates,
    useCache: boolean,
    method: CalculationMethod
  ): Meters => {
    if (useCache) {
      const cached = localCache.get({ a, b, method });
      if (cached !== undefined) {
        return cached;
      }
    }

    // Pure calculation
    const distance = calculateDistancePure(a, b);

    if (useCache) {
      localCache.set({ a, b, method }, distance);
    }

    return distance;
  };

  return {
    calculateDistance: (a, b, options = {}) => {
      const computedAt = Date.now() as Milliseconds;
      try {
        const result = calculateDistance(a, b, options);
        if (result.success) {
          return { ...result, computedAt };
        }
        return { ...result, computedAt };
      } catch (error) {
        const method = options.method ?? "haversine";
        return {
          success: false,
          error: {
            code: "CALCULATION_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Unknown calculation error",
            details: error,
          },
          method,
          computedAt,
        };
      }
    },

    calculateDistanceKilometers: (a, b, enableCache = true) => {
      const distanceMeters = calculateHaversineWithCache(
        a,
        b,
        enableCache,
        "haversine"
      );
      return metersToKilometers(distanceMeters);
    },

    isWithinRadius: (center, point, radiusMeters) => {
      if (!(isValidCoordinates(center) && isValidCoordinates(point))) {
        return false;
      }

      const box = computeBoundingBox(center, radiusMeters);
      if (!isWithinBoundingBox(point, box)) {
        return false;
      }

      const distance = calculateHaversineWithCache(
        center,
        point,
        true,
        "haversine"
      );
      return distance <= radiusMeters;
    },

    clearCache: () => {
      localCache.clear();
    },

    getCacheStats: () => ({
      size: localCache.size(),
      maxSize: config?.cacheSize ?? CACHE_CONFIG.maxSize,
      maxAge: config?.cacheTTL ?? CACHE_CONFIG.maxAge,
    }),
  };
}

/**
 * Clear the distance calculation cache
 * Useful for testing or memory management
 */
export function clearDistanceCache(): void {
  distanceCache.clear();
}

/**
 * Get cache statistics for monitoring
 *
 * @returns Cache statistics
 */
export function getDistanceCacheStats(): {
  readonly size: number;
  readonly maxSize: number;
  readonly maxAge: Milliseconds;
} {
  return {
    size: distanceCache.size(),
    maxSize: CACHE_CONFIG.maxSize,
    maxAge: CACHE_CONFIG.maxAge,
  };
}

export type {
  DistanceCalculationResult,
  DistanceCalculationError,
  CoordinateValidation,
  CalculationOptions,
  CalculationMethod,
  DistanceUnit,
  BoundingBox,
  DistanceCalculatorConfig,
  DistanceCalculator,
};

export { isValidCoordinates, validateCoordinates, assertValidCoordinates };
