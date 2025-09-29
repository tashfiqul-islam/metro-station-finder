/**
 * Station Search Types for Metro Station Finder
 *
 * This module defines all types related to station search operations,
 * including search results, matching algorithms, filtering, and ranking.
 *
 * @fileoverview Station search type definitions with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import {
  ID_CONSTANTS,
  MATCH_TYPES,
  SEARCH_CONSTANTS,
  SEARCH_SCORING,
} from "@/lib/constants";
import type {
  Coordinates,
  Meters,
  Milliseconds,
  Minutes,
  StationErrorCode,
} from "@/lib/types";
import type {
  MetroLine,
  Station,
  StationAmenities,
  StationStatus,
} from "@/lib/types/station";

/**
 * Search relevance scoring constants
 */

/**
 * Match type enumeration with const assertions for better type safety
 *
 * Describes how a search query matched a station.
 * Used for ranking and highlighting search results.
 */
import type { MatchType } from "@/lib/constants";

/**
 * Branded types for better type safety
 */
export type QueryId = string & { readonly __brand: "QueryId" };
export type ResultId = string & { readonly __brand: "ResultId" };
export type SearchSessionId = string & { readonly __brand: "SearchSessionId" };

/**
 * Factory functions for branded types
 */

export const createQueryId = (query: string): QueryId =>
  `query_${Date.now()}_${query.slice(0, ID_CONSTANTS.queryPrefixLength)}` as QueryId;

export const createResultId = (): ResultId =>
  `result_${Date.now()}_${Math.random()
    .toString(ID_CONSTANTS.base36)
    .slice(
      ID_CONSTANTS.randomStringStart,
      ID_CONSTANTS.randomStringStart + ID_CONSTANTS.randomStringLength
    )}` as ResultId;

export const createSearchSessionId = (): SearchSessionId =>
  `session_${Date.now()}_${Math.random()
    .toString(ID_CONSTANTS.base36)
    .slice(
      ID_CONSTANTS.randomStringStart,
      ID_CONSTANTS.randomStringStart + ID_CONSTANTS.randomStringLength
    )}` as SearchSessionId;

/**
 * Matched field enumeration
 *
 * Indicates which field of the station matched the search query.
 * Used for relevance scoring and result highlighting.
 */
export type MatchedField = "name" | "alias" | "line";

/**
 * Search match information
 *
 * Detailed information about how a search query matched a station.
 * Includes match type, field, and edit distance for fuzzy matches.
 */
export type SearchMatch = {
  /** Type of match found */
  readonly matchType: MatchType;
  /** Field that matched the query */
  readonly matchedField: MatchedField;
  /** Original search query */
  readonly query: string;
  /** Matched text portion */
  readonly matchedText: string;
  /** Edit distance for fuzzy matches */
  readonly editDistance?: number;
};

/**
 * Search result with metadata
 *
 * Complete search result containing station data and search metadata.
 * Includes relevance scoring and ranking information.
 */
export type SearchResult = {
  /** The matched station */
  readonly station: Station;
  /** Search match details */
  readonly match: SearchMatch;
  /** Relevance score (0-1) */
  readonly relevanceScore: number;
  /** Distance from search location in meters */
  readonly distance?: Meters;
  /** Estimated walking time in minutes */
  readonly walkingTime?: Minutes;
  /** Walking directions URL */
  readonly walkingDirections?: string;
  /** Whether this is the nearest station */
  readonly isNearest: boolean;
  /** Rank in search results (1-based) */
  readonly rank: number;
};

/**
 * Station filter criteria
 *
 * Used for filtering stations based on various criteria
 * in search and selection operations.
 */
export type StationFilter = {
  /** Filter by operational status */
  readonly status?: readonly StationStatus[];
  /** Filter by metro line */
  readonly line?: readonly MetroLine[];
  /** Filter by amenities */
  readonly amenities?: Partial<StationAmenities>;
  /** Filter by distance from a point */
  readonly maxDistance?: Meters;
  /** Filter by station name pattern */
  readonly namePattern?: string;
};

/**
 * Search options configuration
 *
 * Configuration for station search operations.
 * Controls search behavior and result formatting.
 */
export type SearchOptions = {
  /** Maximum number of results to return */
  readonly maxResults?: number;
  /** Minimum relevance score threshold */
  readonly minRelevanceScore?: number;
  /** Whether to include planned stations */
  readonly includePlanned?: boolean;
  /** Whether to include under-construction stations */
  readonly includeUnderConstruction?: boolean;
  /** Whether to sort by relevance (vs distance) */
  readonly sortByRelevance?: boolean;
  /** User location for distance calculations */
  readonly userLocation?: Coordinates;
  /** Custom filter criteria */
  readonly filter?: StationFilter;
};

/**
 * Search history entry
 *
 * Represents a past search query with metadata.
 * Used for search suggestions and analytics.
 */
export type SearchHistoryEntry = {
  /** The search query */
  readonly query: string;
  /** Number of results found */
  readonly resultCount: number;
  /** When the search was performed */
  readonly timestamp: Milliseconds;
  /** Selected result (if any) */
  readonly selectedStation?: Station["id"];
};

/**
 * Search cache entry
 *
 * Cached search results with expiration information.
 * Used to avoid redundant search operations.
 */
export type SearchCacheEntry = {
  /** The search query */
  readonly query: string;
  /** Search options used */
  readonly options: SearchOptions;
  /** Cached results */
  readonly results: readonly SearchResult[];
  /** Cache creation time */
  readonly createdAt: Milliseconds;
  /** Cache expiration time */
  readonly expiresAt: Milliseconds;
  /** Cache hit count */
  readonly hitCount: number;
};

/**
 * Search statistics
 *
 * Aggregated statistics about search operations.
 * Used for performance monitoring and optimization.
 */
export type SearchStatistics = {
  /** Total number of searches performed */
  readonly totalSearches: number;
  /** Average search time in milliseconds */
  readonly averageSearchTime: Milliseconds;
  /** Cache hit ratio (0-1) */
  readonly cacheHitRatio: number;
  /** Most frequent queries */
  readonly topQueries: readonly string[];
  /** Search performance metrics */
  readonly performanceMetrics: {
    readonly p50: Milliseconds;
    readonly p95: Milliseconds;
    readonly p99: Milliseconds;
  };
};

/**
 * Search error information
 *
 * Detailed error information for search operations.
 * Includes error codes and recovery suggestions.
 */
export type SearchError = {
  /** Error code */
  readonly code: StationErrorCode;
  /** Human-readable error message */
  readonly message: string;
  /** Original query that caused the error */
  readonly query?: string;
  /** Recovery suggestion */
  readonly hint?: string;
};

/**
 * Search context information
 *
 * Metadata about the search operation including timing and source.
 */
export type SearchContext = {
  /** Original search query */
  readonly query: string;
  /** Normalized search query */
  readonly normalizedQuery: string;
  /** When the search was performed */
  readonly timestamp: Milliseconds;
  /** Search source (user input, geolocation, etc.) */
  readonly source: SearchSource;
  /** Search options used */
  readonly options: SearchOptions;
};

/**
 * Search source enumeration
 *
 * Indicates how the search was initiated.
 */
export type SearchSource =
  | "user-input"
  | "geolocation"
  | "autocomplete"
  | "manual";

/**
 * Template literal types for search events
 *
 * These provide type-safe event naming and better IDE support
 */
export type SearchEventType = `search:${string}`;
export type SearchEvent<T extends string> = `search:${T}`;

/**
 * Valid search event types with exhaustive checking
 */
export type ValidSearchEvents =
  | SearchEvent<"started">
  | SearchEvent<"completed">
  | SearchEvent<"error">
  | SearchEvent<"cancelled">;

/**
 * Search event payload types for type-safe event handling
 */
export type SearchEventMap = {
  "search:started": {
    readonly query: string;
    readonly timestamp: Milliseconds;
    readonly source: SearchSource;
  };
  "search:completed": {
    readonly results: readonly SearchResult[];
    readonly duration: Milliseconds;
    readonly query: string;
  };
  "search:error": {
    readonly error: SearchError;
    readonly query: string;
    readonly timestamp: Milliseconds;
  };
  "search:cancelled": {
    readonly query: string;
    readonly timestamp: Milliseconds;
  };
};

/**
 * Type-safe event listener function
 */
export type SearchEventListener<K extends keyof SearchEventMap> = (
  event: SearchEventMap[K]
) => void;

/**
 * Search service state
 *
 * Current state of the search service including cache and statistics.
 */
export type SearchServiceState = {
  /** Whether search service is available */
  readonly isAvailable: boolean;
  /** Current cache size */
  readonly cacheSize: number;
  /** Search statistics */
  readonly statistics: SearchStatistics;
  /** Last search time */
  readonly lastSearchTime?: Milliseconds;
  /** Current search in progress */
  readonly isSearching: boolean;
};

/**
 * Calculate relevance score for a search match with exhaustive checking
 *
 * Computes a relevance score based on match type, field, and other factors.
 * Higher scores indicate more relevant matches.
 *
 * @param match Search match information
 * @param station Station that was matched
 * @returns Relevance score between 0 and 1
 */
export function calculateRelevanceScore(
  match: SearchMatch,
  station: Station
): number {
  let score: number;

  // Base score by match type with exhaustive checking
  switch (match.matchType) {
    case MATCH_TYPES.exact: {
      score = SEARCH_SCORING.exactMatchScore;
      break;
    }
    case MATCH_TYPES.prefix: {
      score = SEARCH_SCORING.prefixMatchScore;
      break;
    }
    case MATCH_TYPES.fuzzy: {
      score = SEARCH_SCORING.fuzzyMatchScore;
      break;
    }
    case MATCH_TYPES.substring: {
      score = SEARCH_SCORING.substringMatchScore;
      break;
    }
    default: {
      // Exhaustive checking - TypeScript will error if we miss a case
      const _exhaustive: never = match.matchType;
      throw new Error(`Unhandled match type: ${_exhaustive}`);
    }
  }

  // Boost for station name vs alias
  if (match.matchedField === "name") {
    score *= SEARCH_SCORING.nameMatchBoost;
  }

  // Boost for operational stations
  if (station.status === "operational") {
    score *= SEARCH_SCORING.operationalStationBoost;
  }

  // Penalty for edit distance in fuzzy matches
  if (
    match.matchType === MATCH_TYPES.fuzzy &&
    match.editDistance !== undefined
  ) {
    score *= 1 - match.editDistance * SEARCH_SCORING.editDistancePenalty;
  }

  // Clamp score to valid range
  return Math.max(
    SEARCH_CONSTANTS.relevanceScoreMin,
    Math.min(SEARCH_CONSTANTS.relevanceScoreMax, score)
  );
}

/**
 * Sort search results by relevance and other criteria
 *
 * Sorts search results using relevance score as primary criteria,
 * with distance and alphabetical order as tiebreakers.
 *
 * @param results Array of search results to sort
 * @param options Search options for sorting preferences
 * @returns Sorted array of search results
 */
export function sortSearchResults(
  results: readonly SearchResult[],
  options: SearchOptions = {}
): readonly SearchResult[] {
  return [...results].sort((a, b) => {
    // Primary sort: relevance score (if enabled)
    if (options.sortByRelevance !== false) {
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(relevanceDiff) > SEARCH_SCORING.relevanceThreshold) {
        return relevanceDiff;
      }
    }

    // Secondary sort: distance (if available)
    if (a.distance !== undefined && b.distance !== undefined) {
      const distanceDiff = a.distance - b.distance;
      if (Math.abs(distanceDiff) > SEARCH_CONSTANTS.distanceThresholdMeters) {
        return distanceDiff;
      }
    }

    // Tertiary sort: alphabetical by station name
    return a.station.name.localeCompare(b.station.name);
  });
}

/**
 * Check if a station matches the given filter criteria
 *
 * @param station Station to check
 * @param filter Filter criteria to apply
 * @returns True if station matches all filter criteria
 */
function matchesStatusFilter(
  station: Station,
  statuses: readonly StationStatus[]
): boolean {
  return statuses.includes(station.status);
}

/**
 * Check if a station matches the line filter
 *
 * @param station Station to check
 * @param lines Lines to filter by
 * @returns True if station is on one of the specified lines
 */
function matchesLineFilter(
  station: Station,
  lines: readonly MetroLine[]
): boolean {
  return lines.includes(station.line);
}

/**
 * Check if a station matches the distance filter
 *
 * @param result Search result with distance information
 * @param maxDistance Maximum allowed distance
 * @returns True if station is within the specified distance
 */
function matchesDistanceFilter(
  result: SearchResult,
  maxDistance: Meters
): boolean {
  return result.distance === undefined || result.distance <= maxDistance;
}

/**
 * Check if a station matches the amenities filter
 *
 * @param station Station to check
 * @param amenitiesFilter Amenities filter criteria
 * @returns True if station has all required amenities
 */
function matchesAmenitiesFilter(
  station: Station,
  amenitiesFilter: Partial<StationAmenities>
): boolean {
  return Object.entries(amenitiesFilter).every(([key, value]) => {
    const stationValue = station.amenities[key as keyof StationAmenities];
    return stationValue === value;
  });
}

/**
 * Check if a station matches the name pattern filter
 *
 * @param station Station to check
 * @param pattern Name pattern to match
 * @returns True if station name matches the pattern
 */
function matchesNamePatternFilter(station: Station, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalizedName = station.name.toLowerCase();
  return normalizedName.includes(normalizedPattern);
}

/**
 * Filter search results based on criteria
 *
 * Applies various filter criteria to search results.
 * This function is broken down to reduce cognitive complexity.
 *
 * @param results Search results to filter
 * @param filter Filter criteria to apply
 * @returns Filtered search results
 */
export function filterSearchResults(
  results: readonly SearchResult[],
  filter: StationFilter
): readonly SearchResult[] {
  return results.filter((result) => {
    const { station } = result;

    // Status filter
    if (
      filter.status !== undefined &&
      !matchesStatusFilter(station, filter.status)
    ) {
      return false;
    }

    // Line filter
    if (filter.line !== undefined && !matchesLineFilter(station, filter.line)) {
      return false;
    }

    // Distance filter
    if (
      filter.maxDistance !== undefined &&
      !matchesDistanceFilter(result, filter.maxDistance)
    ) {
      return false;
    }

    // Amenities filter
    if (
      filter.amenities !== undefined &&
      !matchesAmenitiesFilter(station, filter.amenities)
    ) {
      return false;
    }

    // Name pattern filter
    if (
      filter.namePattern !== undefined &&
      !matchesNamePatternFilter(station, filter.namePattern)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Create a search match object
 *
 * Helper function to create a SearchMatch with proper typing.
 *
 * @param matchData Match data object
 * @returns SearchMatch object
 */
export function createSearchMatch(matchData: {
  matchType: MatchType;
  matchedField: MatchedField;
  query: string;
  matchedText: string;
  editDistance?: number;
}): SearchMatch {
  const baseMatch: SearchMatch = {
    matchType: matchData.matchType,
    matchedField: matchData.matchedField,
    query: matchData.query,
    matchedText: matchData.matchedText,
  };

  // Only add editDistance if it's defined (exactOptionalPropertyTypes compliance)
  if (matchData.editDistance !== undefined) {
    return { ...baseMatch, editDistance: matchData.editDistance };
  }

  return baseMatch;
}

/**
 * Type guards for search-related types
 */

/**
 * Enhanced type guards with better inference
 */
export const isValidMatchType = <T>(value: T): value is T & MatchType =>
  typeof value === "string" &&
  Object.values(MATCH_TYPES).includes(value as MatchType);

/**
 * Type guard for MatchType (legacy support)
 *
 * @param value The value to check
 * @returns True if value is a valid MatchType
 */
export function isMatchType(value: unknown): value is MatchType {
  return isValidMatchType(value);
}

/**
 * Async iterator patterns for streaming search
 */
export function* streamSearchResults(
  _query: string,
  _options: SearchOptions
): Generator<SearchResult, void, unknown> {
  // Implementation would stream results as they become available
  // This is useful for real-time search suggestions
  // For now, yield empty array
  yield* [];
}

/**
 * Type-safe immutable update patterns
 */
type UpdateSearchState<T extends Record<string, unknown>> = <K extends keyof T>(
  state: T,
  key: K,
  value: T[K]
) => T;

export const updateSearchState: UpdateSearchState<SearchServiceState> = (
  state,
  key,
  value
) => ({
  ...state,
  [key]: value,
});

/**
 * Type guard for MatchedField
 *
 * @param value The value to check
 * @returns True if value is a valid MatchedField
 */
export function isMatchedField(value: unknown): value is MatchedField {
  return (
    typeof value === "string" &&
    (value === "name" || value === "alias" || value === "line")
  );
}

/**
 * Type guard for SearchSource
 *
 * @param value The value to check
 * @returns True if value is a valid SearchSource
 */
export function isSearchSource(value: unknown): value is SearchSource {
  return (
    typeof value === "string" &&
    (value === "user-input" ||
      value === "geolocation" ||
      value === "autocomplete" ||
      value === "manual")
  );
}

/**
 * Type guard for SearchOptions
 *
 * @param value The value to check
 * @returns True if value is valid SearchOptions
 */
export function isSearchOptions(value: unknown): value is SearchOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const options = value as {
    maxResults?: unknown;
    minRelevanceScore?: unknown;
    includePlanned?: unknown;
    includeUnderConstruction?: unknown;
    sortByRelevance?: unknown;
  };

  // Check optional properties with proper type checking
  if (
    options.maxResults !== undefined &&
    typeof options.maxResults !== "number"
  ) {
    return false;
  }

  if (
    options.minRelevanceScore !== undefined &&
    typeof options.minRelevanceScore !== "number"
  ) {
    return false;
  }

  if (
    options.includePlanned !== undefined &&
    typeof options.includePlanned !== "boolean"
  ) {
    return false;
  }

  if (
    options.includeUnderConstruction !== undefined &&
    typeof options.includeUnderConstruction !== "boolean"
  ) {
    return false;
  }

  if (
    options.sortByRelevance !== undefined &&
    typeof options.sortByRelevance !== "boolean"
  ) {
    return false;
  }

  return true;
}

/**
 * Normalize search query for consistent matching
 *
 * Applies standard normalization to search queries:
 * - Trims whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces
 * - Removes diacritics
 *
 * @param query Raw search query
 * @returns Normalized query string
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
}

/**
 * Validate search query
 *
 * Checks if a search query meets minimum requirements.
 *
 * @param query Search query to validate
 * @returns True if query is valid for searching
 */
export function isValidSearchQuery(query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  return normalized.length >= SEARCH_CONSTANTS.minQueryLength;
}

/**
 * Calculate fuzzy matching score
 *
 * @param query The search query
 * @param text The text to match against
 * @returns Fuzzy score (0-1)
 */
export function calculateFuzzyScore(query: string, text: string): number {
  if (query.length < SEARCH_CONSTANTS.fuzzyMatchMinLength) {
    return 0;
  }

  // Simple Levenshtein distance-based fuzzy matching
  const distance = calculateLevenshteinDistance(query, text);
  const maxLength = Math.max(query.length, text.length);

  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns Edit distance
 */

function calculateSmallStringDistance(str1: string, str2: string): number {
  // Use a simple character-by-character comparison for small strings
  let distance = 0;
  const maxLength = Math.max(str1.length, str2.length);

  for (let i = 0; i < maxLength; i++) {
    if (i >= str1.length || i >= str2.length || str1[i] !== str2[i]) {
      distance++;
    }
  }

  return distance;
}

function calculateSimpleDistance(str1: string, str2: string): number {
  let distance = 0;
  const maxLength = Math.max(str1.length, str2.length);
  for (let i = 0; i < maxLength; i++) {
    if (i >= str1.length || i >= str2.length || str1[i] !== str2[i]) {
      distance++;
    }
  }
  return distance;
}

export function calculateLevenshteinDistance(
  str1: string,
  str2: string
): number {
  // Handle edge cases
  if (str1.length === 0) {
    return str2.length;
  }
  if (str2.length === 0) {
    return str1.length;
  }

  // Use optimized approach for small strings
  if (str1.length <= 10 && str2.length <= 10) {
    return calculateSmallStringDistance(str1, str2);
  }

  // Use simpler approach for longer strings
  return calculateSimpleDistance(str1, str2);
}

/**
 * Calculate distance score
 *
 * @param distance Distance in meters
 * @param maxDistance Maximum distance for scoring
 * @returns Distance score (0-1, lower is better)
 */
export function calculateDistanceScore(
  distance: Meters,
  maxDistance: Meters
): number {
  if (distance >= maxDistance) {
    return SEARCH_CONSTANTS.distanceScoreMax;
  }

  return distance / maxDistance;
}

/**
 * Create search context
 *
 * @param query Search query
 * @param source Search source
 * @param options Search options
 * @returns SearchContext object
 */
export function createSearchContext(
  query: string,
  source: SearchSource,
  options: SearchOptions
): SearchContext {
  return {
    query,
    normalizedQuery: normalizeSearchQuery(query),
    timestamp: Date.now() as Milliseconds,
    source,
    options,
  };
}

/**
 * Create search cache entry
 *
 * @param results Search results
 * @param context Search context
 * @param ttl Time to live in milliseconds
 * @returns SearchCacheEntry object
 */
export function createSearchCacheEntry(
  results: readonly SearchResult[],
  context: SearchContext,
  ttl: number
): SearchCacheEntry {
  return {
    query: context.query,
    options: context.options,
    results,
    createdAt: context.timestamp,
    expiresAt: (context.timestamp + ttl) as Milliseconds,
    hitCount: 0,
  };
}

/**
 * Check if search cache entry is expired
 *
 * @param entry Cache entry to check
 * @returns True if entry is expired
 */
export function isSearchCacheEntryExpired(entry: SearchCacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Functional composition with proper typing
 */
type PipeFunction<T, U> = (input: T) => U;

const pipe =
  <A, B, C>(f1: PipeFunction<A, B>, f2: PipeFunction<B, C>) =>
  (input: A): C =>
    f2(f1(input));

/**
 * Environment-aware configuration
 */
type Environment = "development" | "production" | "test";

const createEnvironmentConfig = <T extends Record<string, unknown>>(
  configs: Record<Environment, T>
) => ({
  getConfig: (env: Environment): T => configs[env],
});

/**
 * Environment-specific search configuration
 * This is exported for potential use in other modules
 */
export const searchConfig = createEnvironmentConfig({
  development: {
    debugMode: true,
    cacheEnabled: false,
    logLevel: "debug" as const,
  },
  production: {
    debugMode: false,
    cacheEnabled: true,
    logLevel: "error" as const,
  },
  test: {
    debugMode: true,
    cacheEnabled: false,
    logLevel: "silent" as const,
  },
});

/**
 * Create default search options with type safetys
 *
 * @param overrides Optional property overrides
 * @returns Complete SearchOptions object
 */
export function createDefaultSearchOptions(
  overrides?: Partial<SearchOptions>
): SearchOptions {
  return {
    maxResults: SEARCH_CONSTANTS.maxResultsDefault,
    minRelevanceScore: 0.1,
    includePlanned: false,
    includeUnderConstruction: true,
    sortByRelevance: true,
    ...overrides,
  };
}

/**
 * Type-safe search pipeline
 */
export const searchPipeline = pipe(normalizeSearchQuery, (query: string) => ({
  query,
  timestamp: Date.now() as Milliseconds,
  id: createQueryId(query),
}));
