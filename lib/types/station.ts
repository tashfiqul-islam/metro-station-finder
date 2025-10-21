/**
 * Station Data Types for Metro Station Finder
 *
 * This module defines all types related to metro stations, including
 * the Station entity, amenities, status, and related interfaces.
 *
 * @fileoverview Station-related type definitions with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import {
  AMENITY_TYPES,
  MATCH_TYPES,
  METRO_LINES,
  STATION_CONSTANTS,
  STATION_STATUSES,
  VALIDATION_PATTERNS,
} from "@/lib/config/constants";
import type { Coordinates, Meters, Milliseconds, Minutes, StationId } from "@/lib/types";

/**
 * Station status enumeration with strict patterns
 *
 * Represents the operational status of a metro station.
 * Used to determine availability and service levels.
 */
export type StationStatus = (typeof STATION_STATUSES)[keyof typeof STATION_STATUSES];

/**
 * Metro line identifier with strict patterns
 *
 * Currently only MRT-6 is supported in Phase 1.
 * Future phases may add additional lines.
 */
export type MetroLine = (typeof METRO_LINES)[keyof typeof METRO_LINES];

/**
 * Template literal types for station operations
 */
export type StationOperation = `station:${"create" | "update" | "delete" | "search" | "filter"}`;
export type StationEventType =
  `station:${"created" | "updated" | "deleted" | "searched" | "filtered"}`;
export type StationStatusChange = `station:${"opened" | "closed" | "maintenance" | "planned"}`;

/**
 * Branded types for station operations
 */
export type StationRequestId = string & {
  readonly __brand: "StationRequestId";
};
export type StationVersion = string & { readonly __brand: "StationVersion" };
export type StationHash = string & { readonly __brand: "StationHash" };

/**
 * Station amenities configuration with strict patterns
 *
 * Defines the available facilities and accessibility features
 * at each metro station. All properties are boolean flags.
 */
export type StationAmenities = {
  /** Elevator availability for accessibility */
  readonly elevator: boolean;
  /** Escalator availability for convenience */
  readonly escalator: boolean;
  /** Wheelchair accessibility support */
  readonly wheelchair: boolean;
  /** Parking facility availability */
  readonly parking: boolean;
  /** Restroom availability */
  readonly restroom: boolean;
  /** ATM availability */
  readonly atm?: boolean;
  /** WiFi availability */
  readonly wifi?: boolean;
  /** Phone charging station availability */
  readonly charging?: boolean;
  /** Food court availability */
  readonly food?: boolean;
  /** Shop availability */
  readonly shop?: boolean;
  /** Discriminated union for amenity state */
  readonly state: "verified" | "unverified" | "pending";
  /** Last verified timestamp */
  readonly lastVerified?: Milliseconds;
  /** Amenity confidence score (0-1) */
  readonly confidence?: number;
};

/**
 * Utility types for amenities
 */
export type AmenityKey = keyof StationAmenities;
export type RequiredAmenities = Pick<
  StationAmenities,
  "elevator" | "escalator" | "wheelchair" | "parking" | "restroom"
>;
export type OptionalAmenities = Omit<StationAmenities, keyof RequiredAmenities>;
export type AmenityScore = {
  readonly total: number;
  readonly available: number;
  readonly percentage: number;
  readonly accessibilityScore: number;
  readonly convenienceScore: number;
};

/**
 * Main Station entity with strict patterns
 *
 * Represents a complete metro station with all associated information.
 * This is the primary data structure for station-related operations.
 *
 * @example
 * ```typescript
 * const station: Station = {
 *   id: createStationId('mrt-uttara'),
 *   name: 'Uttara North',
 *   coordinates: createCoordinates(23.8708, 90.3831),
 *   amenities: {
 *     elevator: true,
 *     escalator: true,
 *     wheelchair: true,
 *     parking: true,
 *     restroom: true,
 *     state: 'verified',
 *     lastVerified: Date.now() as Milliseconds,
 *     confidence: 0.95,
 *   },
 *   status: 'operational',
 *   line: 'mrt-6',
 *   order: 1,
 *   aliases: ['Uttara', 'Uttara North Station'],
 *   createdAt: Date.now() as Milliseconds,
 *   updatedAt: Date.now() as Milliseconds,
 *   version: '1.0.0' as StationVersion,
 *   hash: 'abc123' as StationHash,
 *   state: 'active',
 * };
 * ```
 */
export type Station = {
  /** Unique identifier for the station */
  readonly id: StationId;
  /** Official station name */
  readonly name: string;
  /** Geographic coordinates (WGS84) */
  readonly coordinates: Coordinates;
  /** Available amenities and facilities */
  readonly amenities: StationAmenities;
  /** Current operational status */
  readonly status: StationStatus;
  /** Metro line identifier */
  readonly line: MetroLine;
  /** Order on the line (1-based) */
  readonly order: number;
  /** Alternative names and aliases */
  readonly aliases: readonly string[];
  /** Timestamps and versioning */
  readonly createdAt: Milliseconds;
  readonly updatedAt: Milliseconds;
  readonly version: StationVersion;
  readonly hash: StationHash;
  /** Discriminated union for station state */
  readonly state: "active" | "inactive" | "archived" | "pending";
  /** Station metadata */
  readonly metadata?: StationMetadata;
};

/**
 * Station metadata with strict patterns
 */
export type StationMetadata = {
  readonly description?: string;
  readonly capacity?: number;
  readonly platformCount?: number;
  readonly entranceCount?: number;
  readonly exitCount?: number;
  readonly accessibilityLevel: "full" | "partial" | "limited" | "none";
  readonly operatingHours?: {
    readonly open: string;
    readonly close: string;
    readonly timezone: string;
  };
  readonly contactInfo?: {
    readonly phone?: string;
    readonly email?: string;
    readonly website?: string;
  };
  readonly socialMedia?: {
    readonly facebook?: string;
    readonly twitter?: string;
    readonly instagram?: string;
  };
  readonly tags: readonly string[];
  readonly lastMaintenance?: Milliseconds;
  readonly nextMaintenance?: Milliseconds;
};

/**
 * Match type enumeration with strict patterns
 *
 * Describes how a search query matched a station.
 * Used for ranking and highlighting search results.
 */
export type MatchType = (typeof MATCH_TYPES)[keyof typeof MATCH_TYPES];

/**
 * Station search result with strict patterns
 *
 * Extends the base Station with search-specific metadata
 * used for ranking and displaying search results.
 */
export type StationSearchResult = {
  /** The station data */
  readonly station: Station;
  /** Distance from search location in meters */
  readonly distance?: Meters;
  /** Estimated walking time in minutes */
  readonly walkingTime?: Minutes;
  /** Walking directions URL */
  readonly walkingDirections?: string;
  /** Type of match (exact, fuzzy, etc.) */
  readonly matchType: MatchType;
  /** Relevance score (0-1) */
  readonly relevanceScore: number;
  /** Whether this is the nearest station */
  readonly isNearest: boolean;
  /** Rank in search results (1-based) */
  readonly rank: number;
  /** Search metadata */
  readonly searchId: StationRequestId;
  readonly searchTimestamp: Milliseconds;
  readonly searchQuery: string;
  readonly searchContext?: SearchContext;
  /** Discriminated union for result state */
  readonly state: "active" | "stale" | "invalid";
  /** Confidence score for the match */
  readonly confidence?: number;
};

/**
 * Search context with strict patterns
 */
export type SearchContext = {
  readonly userLocation?: Coordinates;
  readonly searchRadius?: Meters;
  readonly preferredLanguage?: string;
  readonly accessibilityRequirements?: Partial<StationAmenities>;
  readonly timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  readonly dayOfWeek?: "weekday" | "weekend";
  readonly weather?: "sunny" | "rainy" | "cloudy" | "unknown";
};

/**
 * Station filter criteria
 *
 * Used for filtering stations based on various criteria
 * in search and selection operations.
 */
export type StationFilter = {
  /** Filter by operational status */
  readonly status?: StationStatus;
  /** Filter by metro line */
  readonly line?: MetroLine;
  /** Filter by amenities */
  readonly amenities?: Partial<StationAmenities>;
  /** Filter by distance from a point */
  readonly maxDistance?: Meters;
  /** Filter by station name pattern */
  readonly namePattern?: string;
};

/**
 * Station search options
 *
 * Configuration for station search operations.
 * Controls search behavior and result formatting.
 */
export type StationSearchOptions = {
  /** Maximum number of results to return */
  readonly maxResults?: number;
  /** Minimum relevance score threshold */
  readonly minRelevanceScore?: number;
  /** Whether to include planned stations */
  readonly includePlanned?: boolean;
  /** Whether to include under-construction stations */
  readonly includeUnderConstruction?: boolean;
  /** Custom filter criteria */
  readonly filter?: StationFilter;
};

/**
 * Station collection with strict patterns
 *
 * A collection of stations with metadata.
 * Used for bulk operations and data management.
 */
export type StationCollection = {
  /** Array of stations */
  readonly stations: readonly Station[];
  /** Total count of stations */
  readonly count: number;
  /** Data version for cache invalidation */
  readonly version: StationVersion;
  /** Last updated timestamp */
  readonly lastUpdated: Milliseconds;
  /** Collection metadata */
  readonly requestId: StationRequestId;
  readonly createdAt: Milliseconds;
  readonly expiresAt: Milliseconds;
  readonly hash: StationHash;
  /** Collection state */
  readonly state: "loading" | "loaded" | "error" | "stale";
  /** Pagination info */
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
  /** Filter applied to this collection */
  readonly appliedFilters?: StationFilter;
  /** Search query that generated this collection */
  readonly searchQuery?: string;
};

/**
 * Station statistics
 *
 * Aggregated statistics about stations.
 * Used for analytics and reporting.
 */
export type StationStatistics = {
  /** Total number of stations */
  readonly totalStations: number;
  /** Number of operational stations */
  readonly operationalStations: number;
  /** Number of under-construction stations */
  readonly underConstructionStations: number;
  /** Number of planned stations */
  readonly plannedStations: number;
  /** Stations with elevator access */
  readonly elevatorAccessible: number;
  /** Stations with wheelchair access */
  readonly wheelchairAccessible: number;
  /** Stations with parking */
  readonly withParking: number;
  /** Stations with restrooms */
  readonly withRestrooms: number;
};

/**
 * Type guards for Station types
 */

/**
 * Type guard for StationStatus
 *
 * @param value The value to check
 * @returns True if value is a valid StationStatus
 */
export function isStationStatus(value: unknown): value is StationStatus {
  return (
    typeof value === "string" &&
    (value === "operational" || value === "under-construction" || value === "planned")
  );
}

/**
 * Type guard for StationAmenities
 *
 * @param value The value to check
 * @returns True if value is valid StationAmenities
 */
export function isStationAmenities(value: unknown): value is StationAmenities {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const amenities = value as {
    elevator?: unknown;
    escalator?: unknown;
    wheelchair?: unknown;
    parking?: unknown;
    restroom?: unknown;
  };

  return (
    "elevator" in value &&
    "escalator" in value &&
    "wheelchair" in value &&
    "parking" in value &&
    "restroom" in value &&
    typeof amenities.elevator === "boolean" &&
    typeof amenities.escalator === "boolean" &&
    typeof amenities.wheelchair === "boolean" &&
    typeof amenities.parking === "boolean" &&
    typeof amenities.restroom === "boolean"
  );
}

/**
 * Type guard for Station
 *
 * @param value The value to check
 * @returns True if value is a valid Station
 */
export function isStation(value: unknown): value is Station {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const station = value as {
    id?: unknown;
    name?: unknown;
    coordinates?: unknown;
    amenities?: unknown;
    status?: unknown;
    line?: unknown;
    order?: unknown;
    aliases?: unknown;
  };

  return (
    "id" in value &&
    "name" in value &&
    "coordinates" in value &&
    "amenities" in value &&
    "status" in value &&
    "line" in value &&
    "order" in value &&
    "aliases" in value &&
    typeof station.name === "string" &&
    isStationStatus(station.status) &&
    station.line === "mrt-6" &&
    typeof station.order === "number" &&
    Array.isArray(station.aliases) &&
    isStationAmenities(station.amenities)
  );
}

/**
 * Type guard for MatchType
 *
 * @param value The value to check
 * @returns True if value is a valid MatchType
 */
export function isMatchType(value: unknown): value is MatchType {
  return (
    typeof value === "string" &&
    (value === "exact" || value === "fuzzy" || value === "prefix" || value === "substring")
  );
}

/**
 * Utility functions for Station operations
 */

/**
 * Check if a station is operational
 *
 * @param station The station to check
 * @returns True if station is operational
 */
export function isOperationalStation(station: Station): boolean {
  return station.status === "operational";
}

/**
 * Check if a station has wheelchair access
 *
 * @param station The station to check
 * @returns True if station is wheelchair accessible
 */
export function isWheelchairAccessible(station: Station): boolean {
  return station.amenities.wheelchair;
}

/**
 * Check if a station has parking
 *
 * @param station The station to check
 * @returns True if station has parking
 */
export function hasParking(station: Station): boolean {
  return station.amenities.parking;
}

/**
 * Get station display name with fallback
 *
 * @param station The station
 * @returns The best display name for the station
 */
export function getStationDisplayName(station: Station): string {
  return station.name;
}

/**
 * Get station aliases as a comma-separated string
 *
 * @param station The station
 * @returns Comma-separated aliases string
 */
export function getStationAliasesString(station: Station): string {
  return station.aliases.join(", ");
}

/**
 * Check if a station matches a search query
 *
 * @param station The station to search
 * @param query The search query
 * @returns True if station matches the query
 */
export function matchesSearchQuery(station: Station, query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length === 0) {
    return false;
  }

  const searchableText = [station.name, ...station.aliases].join(" ").toLowerCase();

  return searchableText.includes(normalizedQuery);
}

/**
 * Calculate station amenities score
 *
 * @param station The station to score
 * @returns Amenities score (0-5)
 */
export function calculateAmenitiesScore(station: Station): number {
  const amenities = station.amenities;
  let score = 0;

  if (amenities.elevator) {
    score++;
  }
  if (amenities.escalator) {
    score++;
  }
  if (amenities.wheelchair) {
    score++;
  }
  if (amenities.parking) {
    score++;
  }
  if (amenities.restroom) {
    score++;
  }

  return score;
}

/**
 * Sort stations by order on the line
 *
 * @param stations Array of stations to sort
 * @returns Sorted stations array
 */
export function sortStationsByOrder(stations: readonly Station[]): readonly Station[] {
  return [...stations].sort((a, b) => a.order - b.order);
}

/**
 * Filter stations by status
 *
 * @param stations Array of stations to filter
 * @param status Status to filter by
 * @returns Filtered stations array
 */
export function filterStationsByStatus(
  stations: readonly Station[],
  status: StationStatus
): readonly Station[] {
  return stations.filter((station) => station.status === status);
}

/**
 * Filter stations by amenities
 *
 * @param stations Array of stations to filter
 * @param requiredAmenities Required amenities
 * @returns Filtered stations array
 */
export function filterStationsByAmenities(
  stations: readonly Station[],
  requiredAmenities: Partial<StationAmenities>
): readonly Station[] {
  return stations.filter((station) => {
    const amenities = station.amenities;
    return Object.entries(requiredAmenities).every(
      ([key, value]) => amenities[key as keyof StationAmenities] === value
    );
  });
}

/**
 * Advanced station types and factory functions
 */

/**
 * Station event types with strict patterns
 */
export type StationEvent<T = unknown> = {
  readonly type: StationEventType;
  readonly payload: T;
  readonly timestamp: Milliseconds;
  readonly requestId: StationRequestId;
  readonly stationId: StationId;
  readonly version: StationVersion;
};

/**
 * Station subscription types
 */
export type StationSubscription<T> = {
  readonly unsubscribe: () => void;
  readonly getValue: () => T;
  readonly subscribe: (callback: (value: T) => void) => void;
  readonly isActive: boolean;
};

/**
 * Station middleware types
 */
export type StationMiddleware<T> = (station: T) => T;
export type StationMiddlewareChain<T> = readonly StationMiddleware<T>[];

/**
 * Station performance metrics
 */
export type StationPerformanceMetrics = {
  readonly searchTime: Milliseconds;
  readonly filterTime: Milliseconds;
  readonly totalTime: Milliseconds;
  readonly cacheHitRate: number;
  readonly memoryUsage: number;
  readonly errorRate: number;
};

/**
 * Station configuration types
 */
export type StationConfig = {
  readonly enableCaching: boolean;
  readonly cacheExpirationMs: Milliseconds;
  readonly maxCacheSize: number;
  readonly enableMetrics: boolean;
  readonly enableLogging: boolean;
  readonly defaultLanguage: string;
  readonly maxSearchResults: number;
  readonly enableAccessibilityFeatures: boolean;
  readonly enableRealTimeUpdates: boolean;
};

/**
 * Station factory functions
 */
export const createStationRequestId = (): StationRequestId =>
  `station_req_${Date.now()}_${Math.random()
    .toString(STATION_CONSTANTS.base36)
    .slice(
      STATION_CONSTANTS.idStartIndex,
      STATION_CONSTANTS.idStartIndex + STATION_CONSTANTS.idLength
    )}` as StationRequestId;

export const createStationVersion = (version: string): StationVersion => {
  if (!VALIDATION_PATTERNS.semver.test(version)) {
    throw new Error("Invalid version format. Expected semantic version (e.g., '1.0.0')");
  }
  return version as StationVersion;
};

export const createStationHash = (data: string): StationHash => {
  // Simple hash function for demonstration
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash * STATION_CONSTANTS.hashMultiplier + char) % STATION_CONSTANTS.hashModulo;
  }
  return Math.abs(hash).toString(STATION_CONSTANTS.hashBase) as StationHash;
};

/**
 * Create a new station with strict patterns
 */
export const createStation = (
  data: Omit<Station, "createdAt" | "updatedAt" | "version" | "hash" | "state">
): Station => {
  const now = Date.now() as Milliseconds;
  const version = createStationVersion(STATION_CONSTANTS.defaultVersion);
  const hash = createStationHash(JSON.stringify(data));

  return {
    ...data,
    createdAt: now,
    updatedAt: now,
    version,
    hash,
    state: "active",
  };
};

/**
 * Create station collection with strict patterns
 */
export const createStationCollection = (
  stations: readonly Station[],
  options: {
    requestId?: StationRequestId;
    appliedFilters?: StationFilter;
    searchQuery?: string;
    pagination?: StationCollection["pagination"];
  } = {}
): StationCollection => {
  const now = Date.now() as Milliseconds;
  const requestId = options.requestId ?? createStationRequestId();
  const version = createStationVersion(STATION_CONSTANTS.defaultVersion);
  const hash = createStationHash(JSON.stringify(stations));

  return {
    stations,
    count: stations.length,
    version,
    lastUpdated: now,
    requestId,
    createdAt: now,
    expiresAt: (now + STATION_CONSTANTS.cacheExpirationMs) as Milliseconds,
    hash,
    state: "loaded",
    ...(options.pagination && { pagination: options.pagination }),
    ...(options.appliedFilters && { appliedFilters: options.appliedFilters }),
    ...(options.searchQuery && { searchQuery: options.searchQuery }),
  };
};

/**
 * Station factory with configuration
 */
export const createStationFactory = (config: StationConfig) => ({
  createStation: (
    data: Omit<Station, "createdAt" | "updatedAt" | "version" | "hash" | "state">
  ): Station => createStation(data),
  createCollection: (
    stations: readonly Station[],
    options?: Parameters<typeof createStationCollection>[1]
  ): StationCollection => createStationCollection(stations, options),
  createRequestId: (): StationRequestId => createStationRequestId(),
  createVersion: (version: string): StationVersion => createStationVersion(version),
  createHash: (data: string): StationHash => createStationHash(data),
  config,
});

/**
 * Station utility types
 */
export type StationUtility<T> = {
  readonly validate: (value: T) => boolean;
  readonly sanitize: (value: T) => T;
  readonly format: (value: T) => string;
  readonly parse: (value: string) => T | null;
};

/**
 * Station error handling
 */
export type StationErrorHandler = {
  readonly handle: (error: Error) => void;
  readonly recover: (error: Error) => Promise<Station | null>;
  readonly retry: (operation: () => Promise<Station>) => Promise<Station>;
};

/**
 * Station privacy utilities
 */
export type StationPrivacyUtils = {
  readonly anonymize: (station: Station) => Partial<Station>;
  readonly sanitize: (station: Station) => Station;
  readonly obfuscate: (coordinates: Coordinates) => Coordinates;
};

/**
 * Advanced utility types for stations
 */
export type ExtractStationField<T extends Station, K extends keyof Station> = T[K];
export type PartialStation<T extends readonly (keyof Station)[]> = {
  readonly [K in T[number]]?: Station[K];
};
export type StationWithAmenities<T extends Partial<StationAmenities>> = Station & {
  readonly amenities: StationAmenities & T;
};

/**
 * Station validation functions
 */
export function validateStationRequestId(value: string): value is StationRequestId {
  return (
    typeof value === "string" &&
    value.startsWith("station_req_") &&
    value.length > STATION_CONSTANTS.minRequestIdLength
  );
}

export function validateStationVersion(value: string): value is StationVersion {
  return VALIDATION_PATTERNS.semver.test(value);
}

export function validateStationHash(value: string): value is StationHash {
  return (
    typeof value === "string" && VALIDATION_PATTERNS.hashPattern.test(value) && value.length > 0
  );
}

/**
 * Station type guards with enhanced patterns
 */
export function isValidStationStatus(value: unknown): value is StationStatus {
  return (
    typeof value === "string" && Object.values(STATION_STATUSES).includes(value as StationStatus)
  );
}

export function isValidMetroLine(value: unknown): value is MetroLine {
  return typeof value === "string" && Object.values(METRO_LINES).includes(value as MetroLine);
}

export function isValidMatchType(value: unknown): value is MatchType {
  return typeof value === "string" && Object.values(MATCH_TYPES).includes(value as MatchType);
}

export function isValidAmenityKey(value: unknown): value is AmenityKey {
  return (
    typeof value === "string" && (Object.values(AMENITY_TYPES) as readonly string[]).includes(value)
  );
}
