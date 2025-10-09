/**
 * Application Constants for Metro Station Finder
 *
 * This module centralizes all application constants using strict TypeScript patterns.
 * All constants are organized by domain and use branded types for type safety.
 *
 * @fileoverview Centralized constants with strict TypeScript patterns
 * @version 1.0.0
 * @since 2025-09-28
 */

import type {
  Coordinates,
  Kilometers,
  Latitude,
  Longitude,
  Meters,
  Milliseconds,
  Minutes,
  TakaAmount,
  Version,
} from "@/lib/types";

/**
 * Time conversion constants
 */
const TIME_CONSTANTS = {
  minutesPerHour: 60,
  secondsPerMinute: 60,
  millisecondsPerSecond: 1000,
  cacheMinutes: 5,
} as const satisfies Record<string, number>;

/**
 * Application-wide constants
 */
export const APP_CONSTANTS = {
  version: "1.0.0" as Version,
  dataVersion: "dmrtc_fares_2024-12-15" as Version,
  minSearchLength: 3,
  maxSearchResults: 20,
  defaultSearchRadius: 5000 as Meters,
  walkingSpeedMPerMin: 75,
  minutesPerStation: 2.5,
  cacheDurationMs: (TIME_CONSTANTS.cacheMinutes *
    TIME_CONSTANTS.secondsPerMinute *
    TIME_CONSTANTS.millisecondsPerSecond) as Milliseconds,
  maxRetries: 3,
  retryDelayMs: 1000 as Milliseconds,
  debounceDelayMs: 300 as Milliseconds,
  maxHistoryEntries: 50,
  maxCacheEntries: 100,
} as const satisfies Record<string, unknown>;

/**
 * ID generation constants
 */
export const ID_CONSTANTS = {
  idLength: 8,
  idStartIndex: 2,
  base36: 36,
  minRequestIdLength: 15,
  minSessionIdLength: 15,
  queryPrefixLength: 10,
  randomStringLength: 9,
  randomStringStart: 2,
} as const satisfies Record<string, number>;

/**
 * Geographic coordinate bounds
 */
export const COORDINATE_BOUNDS = {
  latitudeMin: -90,
  latitudeMax: 90,
  longitudeMin: -180,
  longitudeMax: 180,
} as const satisfies Record<string, number>;

/**
 * Dhaka service area configuration
 */
export const DHAKA_SERVICE_AREA = {
  centroid: {
    lat: 23.7779 as Latitude,
    lng: 90.3971 as Longitude,
  } as Coordinates,
  radiusKm: 25 as Kilometers,
  radiusMeters: 25_000 as Meters,
} as const satisfies Record<string, unknown>;

/**
 * Station-related constants
 */
export const STATION_CONSTANTS = {
  maxAliases: 10,
  minOrder: 1,
  maxOrder: 50,
  amenitiesCount: 5,
  defaultVersion: "1.0.0" as Version,
  cacheExpirationMs: 300_000 as Milliseconds, // 5 minutes
  maxSearchResults: 20,
  minRelevanceScore: 0.1,
  // ID generation constants
  idLength: 8,
  idStartIndex: 2,
  base36: 36,
  minRequestIdLength: 15,
  // Hash constants
  hashBase: 36,
  hashMultiplier: 31,
  hashModulo: 2_147_483_647,
  // MRT-6 specific
  totalStations: 17,
  operationalStations: 16,
  underConstructionStations: 1,
  plannedStations: 0,
} as const satisfies Record<string, number | Version | Milliseconds>;

/**
 * Station status enumeration
 */
export const STATION_STATUSES = {
  operational: "operational",
  underConstruction: "under-construction",
  planned: "planned",
  maintenance: "maintenance",
  closed: "closed",
} as const satisfies Record<string, string>;

/**
 * Metro line identifiers
 */
export const METRO_LINES = {
  mrt6: "mrt-6",
  mrt1: "mrt-1", // Future expansion
  mrt2: "mrt-2", // Future expansion
} as const satisfies Record<string, string>;

/**
 * Station amenity types
 */
export const AMENITY_TYPES = {
  elevator: "elevator",
  escalator: "escalator",
  wheelchair: "wheelchair",
  parking: "parking",
  restroom: "restroom",
} as const satisfies Record<string, string>;

/**
 * Search-related constants
 */
export const SEARCH_CONSTANTS = {
  minQueryLength: 3,
  maxResultsDefault: 10,
  maxResultsLimit: 20,
  cacheDurationMs: 300_000 as Milliseconds, // 5 minutes
  maxHistoryEntries: 50,
  debounceDelayMs: 300 as Milliseconds,
  relevanceScoreMax: 1.0,
  relevanceScoreMin: 0.0,
  fuzzyMatchMinLength: 5,
  defaultMaxEditDistance: 1,
  distanceThresholdMeters: 1,
  fuzzyScoreThreshold: 0.8,
  distanceScoreMax: 1.0,
} as const satisfies Record<string, number | Milliseconds>;

/**
 * Search scoring constants
 */
export const SEARCH_SCORING = {
  exactMatchScore: 1.0,
  prefixMatchScore: 0.8,
  fuzzyMatchScore: 0.6,
  substringMatchScore: 0.4,
  nameMatchBoost: 1.2,
  operationalStationBoost: 1.1,
  editDistancePenalty: 0.1,
  relevanceThreshold: 0.01,
} as const satisfies Record<string, number>;

/**
 * Match types for search results
 */
export const MATCH_TYPES = {
  exact: "exact",
  fuzzy: "fuzzy",
  prefix: "prefix",
  substring: "substring",
} as const satisfies Record<string, string>;

/**
 * Fare calculation constants
 */
export const FARE_CONSTANTS = {
  minFare: 20 as TakaAmount,
  maxFare: 100 as TakaAmount,
  mrtPassDiscount: 0.1,
  rapidPassDiscount: 0.1,
  singleJourneyDiscount: 0,
  // ID generation constants
  idLength: 8,
  idStartIndex: 2,
  base36: 36,
  // Fare calculation
  minutesPerSegment: 2.5,
  fullLineTravelTime: 40 as Minutes, // 17 stations × 2.5 min
  operationalLineTravelTime: 38 as Minutes, // 16 stations × 2.5 min
} as const satisfies Record<string, unknown>;

/**
 * Discount types
 */
export const DISCOUNT_TYPES = {
  singleJourney: "single-journey",
  mrtPass: "mrt-pass",
  rapidPass: "rapid-pass",
} as const satisfies Record<string, string>;

/**
 * Ticket types
 */
export const TICKET_TYPES = {
  singleJourney: "single-journey",
  mrtPass: "mrt-pass",
  rapidPass: "rapid-pass",
} as const satisfies Record<string, string>;

/**
 * Fare increment constants
 */
const FARE_INCREMENT_CONSTANTS = {
  increment0: 0,
  increment10: 10,
  increment20: 20,
  increment30: 30,
  increment40: 40,
  increment50: 50,
  increment60: 60,
  increment70: 70,
  increment80: 80,
  increment90: 90,
  increment100: 100,
} as const satisfies Record<string, number>;

/**
 * MRT-6 Fare constants
 */
export const MRT6_FARE_CONSTANTS = {
  currency: "BDT" as const,
  totalStations: 17,
  dataVersion: "1.0.0" as const,
  lastUpdated: "2024-12-15" as const,
  dataSource: "DMTCL Official" as const,
  // Fare calculation constants
  baseFare: 20 as TakaAmount,
  maxFare: 100 as TakaAmount,
  minFare: 0 as TakaAmount,
  fareIncrement: 10 as TakaAmount,
  // Discount rates as per contracts
  mrtPassDiscountRate: 0.1, // 10% discount
  rapidPassDiscountRate: 0.1, // 10% discount
  singleJourneyDiscountRate: 0, // 0% discount (full fare)
  // Station order mapping
  stationOrder: [
    "Uttara North",
    "Uttara Center",
    "Uttara South",
    "Pallabi",
    "Mirpur 11",
    "Mirpur 10",
    "Kazipara",
    "Shewrapara",
    "Agargaon",
    "Bijoy Sarani",
    "Farmgate",
    "Karwan Bazar",
    "Shahbagh",
    "Dhaka University",
    "Bangladesh Secretariat",
    "Motijheel",
    "Kamalapur",
  ],
  // Fare matrix dimensions
  matrixSize: 17,
  // Validation constants
  minFareAmount: 20,
  maxFareAmount: 100,
  validFareIncrements: [
    FARE_INCREMENT_CONSTANTS.increment0,
    FARE_INCREMENT_CONSTANTS.increment10,
    FARE_INCREMENT_CONSTANTS.increment20,
    FARE_INCREMENT_CONSTANTS.increment30,
    FARE_INCREMENT_CONSTANTS.increment40,
    FARE_INCREMENT_CONSTANTS.increment50,
    FARE_INCREMENT_CONSTANTS.increment60,
    FARE_INCREMENT_CONSTANTS.increment70,
    FARE_INCREMENT_CONSTANTS.increment80,
    FARE_INCREMENT_CONSTANTS.increment90,
    FARE_INCREMENT_CONSTANTS.increment100,
  ],
  // Magic number constants
  hoursPerDay: 24,
  daysPerWeek: 7,
  daysPerMonth: 30,
  percentageMultiplier: 100,
  minutesPerSegment: 2.5,
  kilometersPerSegment: 1.2,
  // Individual fare amounts
  fare0: 0 as TakaAmount,
  fare10: 10 as TakaAmount,
  fare20: 20 as TakaAmount,
  fare30: 30 as TakaAmount,
  fare40: 40 as TakaAmount,
  fare50: 50 as TakaAmount,
  fare60: 60 as TakaAmount,
  fare70: 70 as TakaAmount,
  fare80: 80 as TakaAmount,
  fare90: 90 as TakaAmount,
  fare100: 100 as TakaAmount,
} as const satisfies Record<string, unknown>;

/**
 * Geolocation constants
 */
export const GEOLOCATION_CONSTANTS = {
  defaultTimeout: 10_000 as Milliseconds,
  defaultMaxAge: 300_000 as Milliseconds, // 5 minutes
  maxAccuracyMeters: 100 as Meters,
  serviceAreaRadius: 25 as Kilometers,
  walkingSpeedMPerMin: 75,
  metersToKilometers: 1000,
  privacyRounding: 3, // Decimal places for privacy-safe coordinates
  maxRetries: 3,
  retryDelay: 1000 as Milliseconds,
  idLength: 8,
  idStartIndex: 2,
  base36: 36,
  minIdLength: 10,
  minSessionIdLength: 15,
} as const satisfies Record<
  string,
  Milliseconds | Meters | Kilometers | number
>;

/**
 * Location source types
 */
export const LOCATION_SOURCES = {
  geolocation: "geolocation",
  manual: "manual",
  search: "search",
  places: "places",
  cached: "cached",
} as const satisfies Record<string, string>;

/**
 * Geolocation status types
 */
export const GEOLOCATION_STATUSES = {
  idle: "idle",
  requesting: "requesting",
  success: "success",
  error: "error",
  denied: "denied",
  unavailable: "unavailable",
  timeout: "timeout",
} as const satisfies Record<string, string>;

/**
 * Google Places API quota management constants
 */
export const QUOTA_CONSTANTS = {
  quotaWarningThreshold: 0.8, // 80% of quota used
  quotaCriticalThreshold: 0.95, // 95% of quota used
  quotaExhaustionThreshold: 0.1, // 10% threshold for near exhaustion
  cacheExpirationMs: 3_600_000 as Milliseconds, // 1 hour
  maxCacheEntries: 100,
  retryAttempts: 3,
  retryDelayMs: 1000 as Milliseconds,
  dailyLimit: 100_000,
  hourlyLimit: 5000,
  perSecondLimit: 10,
} as const satisfies Record<string, number | Milliseconds>;

/**
 * Google Places API constants
 */
export const GOOGLE_PLACES_CONSTANTS = {
  apiVersion: "v1",
  baseUrl: "https://maps.googleapis.com/maps/api/place",
  autocompleteEndpoint: "/autocomplete/json",
  detailsEndpoint: "/details/json",
  nearbySearchEndpoint: "/nearbysearch/json",
  textSearchEndpoint: "/textsearch/json",
  geocodingEndpoint: "/geocode/json",
  // Rate limiting
  maxRequestsPerMinute: 10,
  maxRequestsPerDay: 1000,
  rateLimitWindowMs: 60_000 as Milliseconds,
  debounceDelayMs: 300 as Milliseconds,
  // Query limits
  minQueryLength: 3,
  // Caching
  cacheExpirationMs: 300_000 as Milliseconds, // 5 minutes
  maxCacheEntries: 100,
  retryAttempts: 3,
  retryDelayMs: 1000 as Milliseconds,
  // ID generation
  idLength: 8,
  idStartIndex: 2,
  base36: 36,
  minRequestIdLength: 15,
  minSessionIdLength: 20,
} as const satisfies Record<string, unknown>;

/**
 * Google Places API field types
 */
export const PLACE_FIELDS = {
  placeId: "place_id",
  name: "name",
  formattedAddress: "formatted_address",
  geometry: "geometry",
  types: "types",
  addressComponents: "address_components",
  formattedPhoneNumber: "formatted_phone_number",
  internationalPhoneNumber: "international_phone_number",
  website: "website",
  rating: "rating",
  userRatingsTotal: "user_ratings_total",
  priceLevel: "price_level",
  openingHours: "opening_hours",
  photos: "photos",
  reviews: "reviews",
  utcOffset: "utc_offset",
  vicinity: "vicinity",
  url: "url",
} as const satisfies Record<string, string>;

/**
 * Google Maps API status codes
 */
export const GOOGLE_MAPS_STATUS = {
  ok: "OK",
  zeroResults: "ZERO_RESULTS",
  overQueryLimit: "OVER_QUERY_LIMIT",
  requestDenied: "REQUEST_DENIED",
  invalidRequest: "INVALID_REQUEST",
  unknownError: "UNKNOWN_ERROR",
} as const satisfies Record<string, string>;

/**
 * Animation constants for consistent motion primitives throughout the app
 */
const EASING_P1 = 0.4;
const EASING_P2 = 0;
const EASING_P3 = 0.2;
const EASING_P4 = 1;

export const ANIMATION_CONSTANTS = {
  // Duration constants
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  // Easing curves
  metro: [EASING_P1, EASING_P2, EASING_P3, EASING_P4] as const,
  easeInOut: [EASING_P1, EASING_P2, EASING_P3, EASING_P4] as const,
  // Legacy duration constants (for compatibility)
  shortAnimationMs: 150 as Milliseconds,
  mediumAnimationMs: 300 as Milliseconds,
  longAnimationMs: 500 as Milliseconds,
} as const satisfies Record<string, unknown>;

/**
 * UI component constants
 */
export const UI_CONSTANTS = {
  // Breakpoints
  mobileBreakpoint: 320,
  tabletBreakpoint: 768,
  desktopBreakpoint: 1024,
  // Debounce delays
  searchDebounceMs: 300 as Milliseconds,
  inputDebounceMs: 150 as Milliseconds,
  // Loading states
  loadingTimeoutMs: 5000 as Milliseconds,
  skeletonAnimationMs: 1000 as Milliseconds,
} as const satisfies Record<string, unknown>;

/**
 * Metro-specific breakpoints
 */
export const METRO_BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
} as const satisfies Record<string, number>;

/**
 * Station card variants
 */
export const STATION_CARD_VARIANTS = {
  compact: "compact",
  detailed: "detailed",
  minimal: "minimal",
} as const satisfies Record<string, string>;

/**
 * Fare display variants
 */
export const FARE_DISPLAY_VARIANTS = {
  compact: "compact",
  detailed: "detailed",
} as const satisfies Record<string, string>;

/**
 * Map themes
 */
export const MAP_THEMES = {
  light: "light",
  dark: "dark",
  satellite: "satellite",
  terrain: "terrain",
} as const satisfies Record<string, string>;

/**
 * Loading states
 */
export const LOADING_STATES = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
} as const satisfies Record<string, string>;

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  semver: /^\d+\.\d+\.\d+$/,
  hashPattern: /^[a-z0-9]+$/,
  stationIdPattern: /^[a-z0-9-]+$/,
  coordinatePattern: /^-?\d+\.?\d*$/,
} as const satisfies Record<string, RegExp>;

/**
 * Error codes by domain
 */
export const ERROR_CODES = {
  station: {
    invalidQuery: "INVALID_QUERY",
    searchError: "SEARCH_ERROR",
    invalidCoordinates: "INVALID_COORDINATES",
    stationNotFound: "STATION_NOT_FOUND",
    noStations: "NO_STATIONS",
  },
  fare: {
    invalidStations: "INVALID_STATIONS",
    calculationError: "CALCULATION_ERROR",
    invalidDiscount: "INVALID_DISCOUNT",
    routeError: "ROUTE_ERROR",
  },
  geolocation: {
    geoDenied: "GEO_DENIED",
    geoUnavailable: "GEO_UNAVAILABLE",
    geoTimeout: "GEO_TIMEOUT",
    geoError: "GEO_ERROR",
    outOfArea: "OUT_OF_AREA",
    validationError: "VALIDATION_ERROR",
  },
  googlePlaces: {
    quotaExceeded: "QUOTA_EXCEEDED",
    rateLimited: "RATE_LIMITED",
    apiError: "API_ERROR",
    invalidQuery: "INVALID_QUERY",
  },
  hooks: {
    hookError: "HOOK_ERROR",
    validationError: "VALIDATION_ERROR",
    stateError: "STATE_ERROR",
  },
} as const satisfies Record<string, Record<string, string>>;

/**
 * Copy deck IDs for consistent messaging
 */
export const COPY_DECK = {
  // Geolocation messages
  geoRationale:
    "We need your location to find the nearest metro station. Your location is not stored or shared.",
  geoDenied:
    "Location access denied. You can still search for stations manually.",
  geoTimeout:
    "Location request timed out. Please try again or search manually.",
  geoUnavailable:
    "Location services are unavailable. Please search for stations manually.",

  // Error messages
  providerUnavailable:
    "Service temporarily unavailable. Please try again later.",
  outOfArea:
    "You're outside the service area. Please search for stations manually.",

  // Success messages
  locationFound: "Location found! Showing nearest stations.",
  searchResults: "Search results updated.",
} as const satisfies Record<string, string>;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  defaultTTL: 300_000 as Milliseconds, // 5 minutes
  maxSize: 100,
  cleanupInterval: 600_000 as Milliseconds, // 10 minutes
  compressionThreshold: 1024, // 1KB
} as const satisfies Record<string, unknown>;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  lcpThreshold: 2500 as Milliseconds, // 2.5s
  fidThreshold: 100 as Milliseconds, // 100ms
  clsThreshold: 0.1, // 0.1
  // Custom thresholds
  searchResponseTime: 500 as Milliseconds, // 500ms
  mapLoadTime: 2000 as Milliseconds, // 2s
  fareCalculationTime: 100 as Milliseconds, // 100ms
} as const satisfies Record<string, unknown>;

/**
 * Accessibility constants
 */
export const A11Y_CONSTANTS = {
  minTouchTargetSize: 44, // 44px minimum touch target
  focusOutlineWidth: 2,
  focusOutlineOffset: 2,
  minColorContrast: 4.5, // WCAG AA
  maxColorContrast: 7, // WCAG AAA
  screenReaderOnlyClass: "sr-only",
} as const satisfies Record<string, unknown>;

/**
 * Development and debugging constants
 */
export const DEV_CONSTANTS = {
  enableLogging: process.env.NODE_ENV === "development",
  enablePerformanceMonitoring: process.env.NODE_ENV === "development",
  enableErrorReporting: process.env.NODE_ENV === "production",
  debugMode: process.env.NODE_ENV === "development",
  mockApiDelay: 500 as Milliseconds,
} as const satisfies Record<string, unknown>;

/**
 * Type exports for constants
 */
export type StationStatus =
  (typeof STATION_STATUSES)[keyof typeof STATION_STATUSES];
export type MetroLine = (typeof METRO_LINES)[keyof typeof METRO_LINES];
export type AmenityType = (typeof AMENITY_TYPES)[keyof typeof AMENITY_TYPES];
export type MatchType = (typeof MATCH_TYPES)[keyof typeof MATCH_TYPES];
export type DiscountType = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];
export type TicketType = (typeof TICKET_TYPES)[keyof typeof TICKET_TYPES];
export type LocationSource =
  (typeof LOCATION_SOURCES)[keyof typeof LOCATION_SOURCES];
export type GeolocationStatus =
  (typeof GEOLOCATION_STATUSES)[keyof typeof GEOLOCATION_STATUSES];
export type PlaceField = (typeof PLACE_FIELDS)[keyof typeof PLACE_FIELDS];
export type GoogleMapsStatus =
  (typeof GOOGLE_MAPS_STATUS)[keyof typeof GOOGLE_MAPS_STATUS];
export type StationCardVariant =
  (typeof STATION_CARD_VARIANTS)[keyof typeof STATION_CARD_VARIANTS];
export type FareDisplayVariant =
  (typeof FARE_DISPLAY_VARIANTS)[keyof typeof FARE_DISPLAY_VARIANTS];
export type MapTheme = (typeof MAP_THEMES)[keyof typeof MAP_THEMES];
export type LoadingState = (typeof LOADING_STATES)[keyof typeof LOADING_STATES];

/**
 * Error code types
 */
export type StationErrorCode =
  (typeof ERROR_CODES.station)[keyof typeof ERROR_CODES.station];
export type FareErrorCode =
  (typeof ERROR_CODES.fare)[keyof typeof ERROR_CODES.fare];
export type GeolocationErrorCode =
  (typeof ERROR_CODES.geolocation)[keyof typeof ERROR_CODES.geolocation];
export type GooglePlacesErrorCode =
  (typeof ERROR_CODES.googlePlaces)[keyof typeof ERROR_CODES.googlePlaces];
export type HooksErrorCode =
  (typeof ERROR_CODES.hooks)[keyof typeof ERROR_CODES.hooks];
