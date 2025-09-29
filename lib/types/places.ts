/**
 * Google Places API Types for Metro Station Finder
 *
 * This module defines all types related to Google Places API integration,
 * including autocomplete, quota management, and rate limiting for client-side operations.
 *
 * @fileoverview Google Places API type definitions with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import {
  type GOOGLE_MAPS_STATUS,
  GOOGLE_PLACES_CONSTANTS,
  ID_CONSTANTS,
  PLACE_FIELDS,
  QUOTA_CONSTANTS,
} from "@/lib/constants";
import type {
  Coordinates,
  GooglePlacesErrorCode,
  Meters,
  Milliseconds,
} from "@/lib/types";

/**
 * Template literal types for Google Places operations
 */
export type GooglePlacesOperation =
  `places:${"autocomplete" | "details" | "nearby" | "geocode" | "textsearch"}`;

export type GooglePlacesEventType =
  `places:${"requested" | "completed" | "failed" | "cached" | "quota_exceeded"}`;

/**
 * Branded types for Google Places operations
 */
export type PlacesRequestId = string & { readonly __brand: "PlacesRequestId" };
export type PlacesCacheKey = string & { readonly __brand: "PlacesCacheKey" };
export type PlacesSessionId = string & { readonly __brand: "PlacesSessionId" };
export type PlacesApiKey = string & { readonly __brand: "PlacesApiKey" };
export type PlacesUserId = string & { readonly __brand: "PlacesUserId" };
export type PlacesField = string & { readonly __brand: "PlacesField" };

/**
 * Google Places API field types
 */
export type PlaceField = (typeof PLACE_FIELDS)[keyof typeof PLACE_FIELDS];

/**
 * Google Maps API status codes
 */
export type GoogleMapsStatus =
  (typeof GOOGLE_MAPS_STATUS)[keyof typeof GOOGLE_MAPS_STATUS];

/**
 * Place prediction from Google Places Autocomplete API
 * Uses camelCase for internal consistency while maintaining API compatibility
 */
export type PlacePrediction = {
  readonly placeId: string;
  readonly description: string;
  readonly structuredFormatting: StructuredFormatting;
  readonly terms: readonly PlaceTerm[];
  readonly types: readonly string[];
  readonly matchedSubstrings: readonly PlaceMatchedSubstring[];
  readonly reference?: string;
  readonly distanceMeters?: Meters;
};

/**
 * Structured formatting for place predictions
 */
export type StructuredFormatting = {
  readonly mainText: string;
  readonly mainTextMatchedSubstrings: readonly PlaceMatchedSubstring[];
  readonly secondaryText: string;
  readonly secondaryTextMatchedSubstrings: readonly PlaceMatchedSubstring[];
};

/**
 * Place term for structured formatting
 */
export type PlaceTerm = {
  readonly offset: number;
  readonly value: string;
};

/**
 * Matched substring for highlighting
 */
export type PlaceMatchedSubstring = {
  readonly length: number;
  readonly offset: number;
};

/**
 * Google Places API response
 */
export type AutocompleteResponse = {
  readonly predictions: readonly PlacePrediction[];
  readonly status: GoogleMapsStatus;
  readonly errorMessage?: string;
  readonly infoMessages?: readonly string[];
};

/**
 * Place details from Google Places Details API
 */
export type PlaceDetails = {
  readonly placeId: string;
  readonly name: string;
  readonly formattedAddress: string;
  readonly geometry: PlaceGeometry;
  readonly types: readonly string[];
  readonly rating?: number;
  readonly userRatingsTotal?: number;
  readonly priceLevel?: number;
  readonly openingHours?: PlaceOpeningHours;
  readonly photos?: readonly PlacePhoto[];
  readonly reviews?: readonly PlaceReview[];
  readonly website?: string;
  readonly internationalPhoneNumber?: string;
  readonly formattedPhoneNumber?: string;
  readonly addressComponents?: readonly PlaceAddressComponent[];
  readonly utcOffset?: number;
  readonly vicinity?: string;
  readonly url?: string;
};

/**
 * Place geometry information
 */
export type PlaceGeometry = {
  readonly location: Coordinates;
  readonly viewport: PlaceViewport;
  readonly bounds?: PlaceViewport;
};

/**
 * Place viewport for map display
 */
export type PlaceViewport = {
  readonly northeast: Coordinates;
  readonly southwest: Coordinates;
};

/**
 * Place opening hours
 */
export type PlaceOpeningHours = {
  readonly openNow: boolean;
  readonly periods: readonly PlaceOpeningPeriod[];
  readonly weekdayText: readonly string[];
};

/**
 * Place opening period
 */
export type PlaceOpeningPeriod = {
  readonly close?: PlaceOpeningTime;
  readonly open: PlaceOpeningTime;
};

/**
 * Place opening time
 */
export type PlaceOpeningTime = {
  readonly day: number;
  readonly time: string;
};

/**
 * Place photo
 */
export type PlacePhoto = {
  readonly height: number;
  readonly width: number;
  readonly photoReference: string;
  readonly htmlAttributions: readonly string[];
};

/**
 * Place review
 */
export type PlaceReview = {
  readonly authorName: string;
  readonly authorUrl?: string;
  readonly language: string;
  readonly profilePhotoUrl?: string;
  readonly rating: number;
  readonly relativeTimeDescription: string;
  readonly text: string;
  readonly time: number;
};

/**
 * Place address component
 */
export type PlaceAddressComponent = {
  readonly longName: string;
  readonly shortName: string;
  readonly types: readonly string[];
};

/**
 * Quota status for API management
 */
export type QuotaStatus = {
  readonly places: ApiQuotaInfo;
  readonly maps: ApiQuotaInfo;
  readonly geocoding: ApiQuotaInfo;
  readonly isRateLimited: boolean;
  readonly lastResetTime: Milliseconds;
};

/**
 * API quota information
 */
export type ApiQuotaInfo = {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Milliseconds;
  readonly isExceeded: boolean;
};

/**
 * Google Places error information
 */
export type GooglePlacesError = {
  readonly code: GooglePlacesErrorCode;
  readonly message: string;
  readonly details: string | undefined;
  readonly retryable: boolean;
  readonly quotaExceeded: boolean;
};

/**
 * Google Places request configuration
 */
export type GooglePlacesRequestConfig = {
  readonly apiKey: PlacesApiKey;
  readonly sessionToken?: string;
  readonly fields?: readonly PlaceField[];
  readonly location?: Coordinates;
  readonly radius?: Meters;
  readonly language?: string;
  readonly region?: string;
  readonly components?: string;
  readonly strictbounds?: boolean;
  readonly types?: readonly string[];
};

/**
 * Google Places API response wrapper
 */
export type GooglePlacesApiResponse<T> = {
  readonly success: boolean;
  readonly data: T | undefined;
  readonly error: GooglePlacesError | undefined;
  readonly quotaStatus: QuotaStatus | undefined;
  readonly processingTime: Milliseconds;
  readonly cached: boolean;
  readonly requestId: PlacesRequestId;
};

/**
 * Rate limiting configuration
 */
export type RateLimitConfig = {
  readonly maxRequestsPerMinute: number;
  readonly windowSizeMs: Milliseconds;
  readonly debounceDelayMs: Milliseconds;
  readonly retryAttempts: number;
  readonly retryDelayMs: Milliseconds;
};

/**
 * Cache configuration for Google Places API
 */
export type PlacesCacheConfig = {
  readonly enabled: boolean;
  readonly expirationMs: Milliseconds;
  readonly maxEntries: number;
  readonly storageKey: string;
};

/**
 * Google Places service configuration
 */
export type GooglePlacesServiceConfig = {
  readonly apiKey: PlacesApiKey;
  readonly rateLimit: RateLimitConfig;
  readonly cache: PlacesCacheConfig;
  readonly quota: {
    readonly warningThreshold: number;
    readonly criticalThreshold: number;
    readonly exhaustionThreshold: number;
  };
};

/**
 * Create PlacesRequestId with validation
 */
export function createPlacesRequestId(): PlacesRequestId {
  const timestamp = Date.now().toString(ID_CONSTANTS.base36);
  const random = Math.random()
    .toString(ID_CONSTANTS.base36)
    .slice(
      ID_CONSTANTS.idStartIndex,
      ID_CONSTANTS.idStartIndex + ID_CONSTANTS.idLength
    );
  return `places_${timestamp}_${random}` as PlacesRequestId;
}

/**
 * Create PlacesSessionId with validation
 */
export function createPlacesSessionId(): PlacesSessionId {
  const timestamp = Date.now().toString(ID_CONSTANTS.base36);
  const random = Math.random()
    .toString(ID_CONSTANTS.base36)
    .slice(
      ID_CONSTANTS.idStartIndex,
      ID_CONSTANTS.idStartIndex + ID_CONSTANTS.idLength
    );
  return `session_${timestamp}_${random}` as PlacesSessionId;
}

/**
 * Create PlacesCacheKey with validation
 */
export function createPlacesCacheKey(
  query: string,
  config: GooglePlacesRequestConfig
): PlacesCacheKey {
  const queryHash = btoa(query)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, ID_CONSTANTS.idLength);
  const configHash = btoa(JSON.stringify(config))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, ID_CONSTANTS.idLength);
  return `places_${queryHash}_${configHash}` as PlacesCacheKey;
}

/**
 * Validate PlacesRequestId
 */
export function validatePlacesRequestId(
  value: string
): value is PlacesRequestId {
  return (
    typeof value === "string" &&
    value.startsWith("places_") &&
    value.length >= ID_CONSTANTS.minRequestIdLength
  );
}

/**
 * Validate PlacesSessionId
 */
export function validatePlacesSessionId(
  value: string
): value is PlacesSessionId {
  return (
    typeof value === "string" &&
    value.startsWith("session_") &&
    value.length >= ID_CONSTANTS.minSessionIdLength
  );
}

/**
 * Validate PlaceField
 */
export function validatePlaceField(value: string): value is PlaceField {
  return (Object.values(PLACE_FIELDS) as readonly string[]).includes(value);
}

/**
 * Create Google Places error
 */
export function createGooglePlacesError(
  code: GooglePlacesErrorCode,
  message: string,
  details?: string
): GooglePlacesError {
  return {
    code,
    message,
    details,
    retryable: code === "QUOTA_EXCEEDED" || code === "API_ERROR",
    quotaExceeded: code === "QUOTA_EXCEEDED",
  };
}

/**
 * Check if quota is exhausted
 */
export function isQuotaExhausted(quotaInfo: ApiQuotaInfo): boolean {
  const threshold = quotaInfo.limit * QUOTA_CONSTANTS.quotaExhaustionThreshold;
  return quotaInfo.remaining <= threshold;
}

/**
 * Check if quota is in warning state
 */
export function isQuotaWarning(quotaInfo: ApiQuotaInfo): boolean {
  const threshold = quotaInfo.limit * QUOTA_CONSTANTS.quotaWarningThreshold;
  return quotaInfo.remaining <= threshold;
}

/**
 * Check if quota is critical
 */
export function isQuotaCritical(quotaInfo: ApiQuotaInfo): boolean {
  const threshold = quotaInfo.limit * QUOTA_CONSTANTS.quotaCriticalThreshold;
  return quotaInfo.remaining <= threshold;
}

/**
 * Calculate quota usage percentage
 */
const PERCENTAGE_MULTIPLIER = 100;

export function calculateQuotaUsage(quotaInfo: ApiQuotaInfo): number {
  return (quotaInfo.used / quotaInfo.limit) * PERCENTAGE_MULTIPLIER;
}

/**
 * Get time until quota reset
 */
export function getTimeUntilQuotaReset(quotaInfo: ApiQuotaInfo): Milliseconds {
  const now = Date.now() as Milliseconds;
  return Math.max(0, quotaInfo.resetTime - now) as Milliseconds;
}

/**
 * Utility functions for Google Places API conversion
 */

/**
 * Convert Google Places API response to internal format
 */
export function convertGooglePlacesPrediction(apiPrediction: {
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  place_id: string;
  description: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  structured_formatting: {
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    main_text: string;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    main_text_matched_substrings?: readonly {
      offset: number;
      length: number;
    }[];
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    secondary_text: string;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    secondary_text_matched_substrings?: readonly {
      offset: number;
      length: number;
    }[];
  };
  terms: readonly { offset: number; value: string }[];
  types: readonly string[];
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  matched_substrings?: readonly { offset: number; length: number }[];
  reference?: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  distance_meters?: number;
}): PlacePrediction {
  return {
    placeId: apiPrediction.place_id,
    description: apiPrediction.description,
    structuredFormatting: {
      mainText: apiPrediction.structured_formatting.main_text,
      mainTextMatchedSubstrings:
        apiPrediction.structured_formatting.main_text_matched_substrings ?? [],
      secondaryText: apiPrediction.structured_formatting.secondary_text,
      secondaryTextMatchedSubstrings:
        apiPrediction.structured_formatting.secondary_text_matched_substrings ??
        [],
    },
    terms: apiPrediction.terms,
    types: apiPrediction.types,
    matchedSubstrings: apiPrediction.matched_substrings ?? [],
    ...(apiPrediction.reference && { reference: apiPrediction.reference }),
    ...(apiPrediction.distance_meters && {
      distanceMeters: apiPrediction.distance_meters as Meters,
    }),
  };
}

/**
 * Convert Google Places API details to internal format
 */
export function convertGooglePlacesDetails(apiDetails: {
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  place_id: string;
  name: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  formatted_address: string;
  geometry: {
    location: Coordinates;
    viewport: { northeast: Coordinates; southwest: Coordinates };
  };
  types: readonly string[];
  rating?: number;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  user_ratings_total?: number;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  price_level?: number;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  opening_hours?: {
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    open_now: boolean;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    weekday_text: readonly string[];
  };
  photos?: readonly {
    height: number;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    html_attributions: readonly string[];
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    photo_reference: string;
    width: number;
  }[];
  reviews?: readonly {
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    author_name: string;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    author_url: string;
    language: string;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    profile_photo_url: string;
    rating: number;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    relative_time_description: string;
    text: string;
    time: number;
  }[];
  website?: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  international_phone_number?: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  formatted_phone_number?: string;
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  address_components?: readonly {
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    long_name: string;
    // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
    short_name: string;
    types: readonly string[];
  }[];
  // biome-ignore lint/style/useNamingConvention: Google Places API uses snake_case
  utc_offset?: number;
  vicinity?: string;
  url?: string;
}): PlaceDetails {
  return {
    placeId: apiDetails.place_id,
    name: apiDetails.name,
    formattedAddress: apiDetails.formatted_address,
    geometry: {
      location: apiDetails.geometry.location,
      viewport: apiDetails.geometry.viewport,
    },
    types: apiDetails.types,
    ...(apiDetails.rating !== undefined && { rating: apiDetails.rating }),
    ...(apiDetails.user_ratings_total !== undefined && {
      userRatingsTotal: apiDetails.user_ratings_total,
    }),
    ...(apiDetails.price_level !== undefined && {
      priceLevel: apiDetails.price_level,
    }),
    ...(apiDetails.opening_hours && {
      openingHours: {
        openNow: apiDetails.opening_hours.open_now,
        periods: [],
        weekdayText: apiDetails.opening_hours.weekday_text,
      },
    }),
    ...(apiDetails.photos && {
      photos: apiDetails.photos.map((photo) => ({
        height: photo.height,
        width: photo.width,
        photoReference: photo.photo_reference,
        htmlAttributions: photo.html_attributions,
      })),
    }),
    ...(apiDetails.reviews && {
      reviews: apiDetails.reviews.map((review) => ({
        authorName: review.author_name,
        authorUrl: review.author_url,
        language: review.language,
        profilePhotoUrl: review.profile_photo_url,
        rating: review.rating,
        relativeTimeDescription: review.relative_time_description,
        text: review.text,
        time: review.time,
      })),
    }),
    ...(apiDetails.website && { website: apiDetails.website }),
    ...(apiDetails.international_phone_number && {
      internationalPhoneNumber: apiDetails.international_phone_number,
    }),
    ...(apiDetails.formatted_phone_number && {
      formattedPhoneNumber: apiDetails.formatted_phone_number,
    }),
    ...(apiDetails.address_components && {
      addressComponents: apiDetails.address_components.map((component) => ({
        longName: component.long_name,
        shortName: component.short_name,
        types: component.types,
      })),
    }),
    ...(apiDetails.utc_offset !== undefined && {
      utcOffset: apiDetails.utc_offset,
    }),
    ...(apiDetails.vicinity && { vicinity: apiDetails.vicinity }),
    ...(apiDetails.url && { url: apiDetails.url }),
  };
}

/**
 * Type guard for PlacePrediction
 */
export function isPlacePrediction(value: unknown): value is PlacePrediction {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prediction = value as {
    placeId?: unknown;
    description?: unknown;
    structuredFormatting?: unknown;
    terms?: unknown;
    types?: unknown;
  };

  return (
    typeof prediction.placeId === "string" &&
    typeof prediction.description === "string" &&
    typeof prediction.structuredFormatting === "object" &&
    Array.isArray(prediction.terms) &&
    Array.isArray(prediction.types)
  );
}

/**
 * Type guard for PlaceDetails
 */
export function isPlaceDetails(value: unknown): value is PlaceDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const details = value as {
    placeId?: unknown;
    name?: unknown;
    formattedAddress?: unknown;
    geometry?: unknown;
  };

  return (
    typeof details.placeId === "string" &&
    typeof details.name === "string" &&
    typeof details.formattedAddress === "string" &&
    typeof details.geometry === "object"
  );
}

/**
 * Type guard for GooglePlacesError
 */
export function isGooglePlacesError(
  value: unknown
): value is GooglePlacesError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const error = value as {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
    quotaExceeded?: unknown;
  };

  return (
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.retryable === "boolean" &&
    typeof error.quotaExceeded === "boolean"
  );
}

/**
 * Type guard for QuotaStatus
 */
export function isQuotaStatus(value: unknown): value is QuotaStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const status = value as {
    places?: unknown;
    maps?: unknown;
    geocoding?: unknown;
    isRateLimited?: unknown;
    lastResetTime?: unknown;
  };

  return (
    typeof status.places === "object" &&
    typeof status.maps === "object" &&
    typeof status.geocoding === "object" &&
    typeof status.isRateLimited === "boolean" &&
    typeof status.lastResetTime === "number"
  );
}

/**
 * Create default Google Places service configuration
 */
export function createDefaultGooglePlacesConfig(
  apiKey: string
): GooglePlacesServiceConfig {
  return {
    apiKey: apiKey as PlacesApiKey,
    rateLimit: {
      maxRequestsPerMinute: GOOGLE_PLACES_CONSTANTS.maxRequestsPerMinute,
      windowSizeMs: GOOGLE_PLACES_CONSTANTS.rateLimitWindowMs,
      debounceDelayMs: GOOGLE_PLACES_CONSTANTS.debounceDelayMs,
      retryAttempts: GOOGLE_PLACES_CONSTANTS.retryAttempts,
      retryDelayMs: GOOGLE_PLACES_CONSTANTS.retryDelayMs,
    },
    cache: {
      enabled: true,
      expirationMs: GOOGLE_PLACES_CONSTANTS.cacheExpirationMs,
      maxEntries: GOOGLE_PLACES_CONSTANTS.maxCacheEntries,
      storageKey: "google_places_cache",
    },
    quota: {
      warningThreshold: QUOTA_CONSTANTS.quotaWarningThreshold,
      criticalThreshold: QUOTA_CONSTANTS.quotaCriticalThreshold,
      exhaustionThreshold: QUOTA_CONSTANTS.quotaExhaustionThreshold,
    },
  };
}

/**
 * Create Google Places API response
 */
export function createGooglePlacesResponse<T>(
  data: T,
  requestId: PlacesRequestId,
  processingTime: Milliseconds,
  cached = false
): GooglePlacesApiResponse<T> {
  return {
    success: true,
    data,
    error: undefined,
    quotaStatus: undefined,
    processingTime,
    cached,
    requestId,
  };
}

/**
 * Create Google Places error response
 */
export function createGooglePlacesErrorResponse(
  error: GooglePlacesError,
  requestId: PlacesRequestId,
  processingTime: Milliseconds,
  quotaStatus?: QuotaStatus
): GooglePlacesApiResponse<never> {
  return {
    success: false,
    data: undefined,
    error,
    quotaStatus: quotaStatus ?? undefined,
    processingTime,
    cached: false,
    requestId,
  };
}

/**
 * Format place prediction for display
 */
export function formatPlacePrediction(prediction: PlacePrediction): string {
  return prediction.structuredFormatting.mainText;
}

/**
 * Format place details for display
 */
export function formatPlaceDetails(details: PlaceDetails): string {
  return `${details.name} - ${details.formattedAddress}`;
}

/**
 * Extract coordinates from place details
 */
export function extractCoordinates(details: PlaceDetails): Coordinates {
  return details.geometry.location;
}

/**
 * Check if place is a transit station
 */
export function isTransitStation(details: PlaceDetails): boolean {
  return details.types.some((type) =>
    [
      "transit_station",
      "subway_station",
      "train_station",
      "bus_station",
    ].includes(type)
  );
}

/**
 * Check if place has good rating
 */
const DEFAULT_MIN_RATING = 4.0;

export function hasGoodRating(
  details: PlaceDetails,
  minRating = DEFAULT_MIN_RATING
): boolean {
  return details.rating !== undefined && details.rating >= minRating;
}

/**
 * Get place type categories
 */
export function getPlaceTypeCategories(types: readonly string[]): string[] {
  const categories: string[] = [];

  if (types.includes("transit_station")) {
    categories.push("Transit");
  }
  if (types.includes("establishment")) {
    categories.push("Business");
  }
  if (types.includes("point_of_interest")) {
    categories.push("POI");
  }
  if (types.includes("hospital")) {
    categories.push("Healthcare");
  }
  if (types.includes("school") || types.includes("university")) {
    categories.push("Education");
  }
  if (types.includes("shopping_mall")) {
    categories.push("Shopping");
  }
  if (types.includes("restaurant")) {
    categories.push("Food");
  }
  if (types.includes("lodging")) {
    categories.push("Accommodation");
  }
  if (types.includes("tourist_attraction")) {
    categories.push("Tourism");
  }

  return categories;
}

/**
 * Sort place predictions by relevance
 */
export function sortPlacePredictions(
  predictions: readonly PlacePrediction[],
  userLocation?: Coordinates
): readonly PlacePrediction[] {
  return [...predictions].sort((a, b) => {
    // Prioritize transit stations
    const aIsTransit = a.types.some((type) =>
      [
        "transit_station",
        "subway_station",
        "train_station",
        "bus_station",
      ].includes(type)
    );
    const bIsTransit = b.types.some((type) =>
      [
        "transit_station",
        "subway_station",
        "train_station",
        "bus_station",
      ].includes(type)
    );

    if (aIsTransit && !bIsTransit) {
      return -1;
    }
    if (!aIsTransit && bIsTransit) {
      return 1;
    }

    // Sort by distance if user location is provided
    if (userLocation && a.distanceMeters && b.distanceMeters) {
      return a.distanceMeters - b.distanceMeters;
    }

    // Sort alphabetically by description
    return a.description.localeCompare(b.description);
  });
}

/**
 * Filter place predictions by type
 */
export function filterPlacePredictionsByType(
  predictions: readonly PlacePrediction[],
  allowedTypes: readonly string[]
): readonly PlacePrediction[] {
  return predictions.filter((prediction) =>
    prediction.types.some((type) => allowedTypes.includes(type))
  );
}

/**
 * Create place search query
 */
export function createPlaceSearchQuery(
  query: string,
  location?: Coordinates,
  radius?: Meters,
  types?: readonly string[]
): string {
  const params = new URLSearchParams();
  params.set("input", query);

  if (location) {
    params.set("location", `${location.lat},${location.lng}`);
  }

  if (radius) {
    params.set("radius", radius.toString());
  }

  if (types && types.length > 0) {
    params.set("types", types.join("|"));
  }

  return params.toString();
}

/**
 * Parse place search query
 */
export function parsePlaceSearchQuery(queryString: string): {
  input: string;
  location?: Coordinates;
  radius?: Meters;
  types?: readonly string[];
} {
  const params = new URLSearchParams(queryString);
  const input = params.get("input") || "";

  const locationParam = params.get("location");
  const location = locationParam
    ? {
        lat: Number.parseFloat(
          locationParam.split(",")[0] ?? "0"
        ) as Coordinates["lat"],
        lng: Number.parseFloat(
          locationParam.split(",")[1] ?? "0"
        ) as Coordinates["lng"],
      }
    : undefined;

  const radiusParam = params.get("radius");
  const radius = radiusParam
    ? (Number.parseInt(radiusParam, 10) as Meters)
    : undefined;

  const typesParam = params.get("types");
  const types = typesParam ? typesParam.split("|") : undefined;

  return {
    input,
    ...(location && { location }),
    ...(radius && { radius }),
    ...(types && { types }),
  };
}

/**
 * Create place cache key
 */
export function createPlaceCacheKey(
  query: string,
  location?: Coordinates,
  radius?: Meters
): string {
  const locationStr = location ? `${location.lat},${location.lng}` : "";
  const radiusStr = radius ? radius.toString() : "";
  return `place_${btoa(query)}_${btoa(locationStr)}_${btoa(radiusStr)}`;
}

/**
 * Validate place search parameters
 */
export function validatePlaceSearchParams(params: {
  query: string;
  location?: Coordinates;
  radius?: Meters;
  types?: readonly string[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    !params.query ||
    params.query.length < GOOGLE_PLACES_CONSTANTS.minQueryLength
  ) {
    errors.push(
      `Query must be at least ${GOOGLE_PLACES_CONSTANTS.minQueryLength} characters long`
    );
  }

  const LatitudeMin = -90;
  const LatitudeMax = 90;
  const LongitudeMin = -180;
  const LongitudeMax = 180;

  if (params.location) {
    if (
      params.location.lat < LatitudeMin ||
      params.location.lat > LatitudeMax
    ) {
      errors.push(`Latitude must be between ${LatitudeMin} and ${LatitudeMax}`);
    }
    if (
      params.location.lng < LongitudeMin ||
      params.location.lng > LongitudeMax
    ) {
      errors.push(
        `Longitude must be between ${LongitudeMin} and ${LongitudeMax}`
      );
    }
  }

  const MaxRadiusMeters = 50_000;
  if (params.radius && (params.radius < 0 || params.radius > MaxRadiusMeters)) {
    errors.push(`Radius must be between 0 and ${MaxRadiusMeters} meters`);
  }

  if (params.types) {
    const invalidTypes = params.types.filter(
      (type) => !validatePlaceField(type)
    );
    if (invalidTypes.length > 0) {
      errors.push(`Invalid place types: ${invalidTypes.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create place search factory
 */
export function createPlaceSearchFactory(config: GooglePlacesServiceConfig) {
  return {
    search: (_query: string, _options?: Partial<GooglePlacesRequestConfig>) => {
      // Implementation would go here
      return Promise.resolve({
        success: true,
        data: [] as PlacePrediction[],
        processingTime: 0 as Milliseconds,
        cached: false,
        requestId: createPlacesRequestId(),
      });
    },

    getDetails: (
      _placeId: string,
      _options?: Partial<GooglePlacesRequestConfig>
    ) => {
      // Implementation would go here
      return Promise.resolve({
        success: true,
        data: {} as PlaceDetails,
        processingTime: 0 as Milliseconds,
        cached: false,
        requestId: createPlacesRequestId(),
      });
    },

    config,
  };
}

/**
 * Create place cache manager
 */
export function createPlaceCacheManager(config: PlacesCacheConfig) {
  return {
    get: (key: string): PlacePrediction[] | null => {
      if (!config.enabled) {
        return null;
      }

      try {
        const cached = localStorage.getItem(`${config.storageKey}_${key}`);
        if (!cached) {
          return null;
        }

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp > config.expirationMs) {
          localStorage.removeItem(`${config.storageKey}_${key}`);
          return null;
        }

        return data;
      } catch {
        return null;
      }
    },

    set: (key: string, data: PlacePrediction[]): void => {
      if (!config.enabled) {
        return;
      }

      try {
        const cacheEntry = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `${config.storageKey}_${key}`,
          JSON.stringify(cacheEntry)
        );
      } catch {
        // Storage quota exceeded or other error
      }
    },

    clear: (): void => {
      if (!config.enabled) {
        return;
      }

      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(config.storageKey)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Error clearing cache
      }
    },

    config,
  };
}
