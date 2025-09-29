# Data Model: Metro Station Finder Phase 1 MVP

**Date**: 2025-09-27  
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Overview

This document defines the complete data model for the Metro Station Finder application using the strictest TypeScript standards. All data structures are immutable, type-safe, and designed for client-side operations with static data.

## Implementation Status

**Phase 2 Complete**: All type definitions and static data have been implemented with modern TypeScript 2025 patterns.

### Type System Implementation

- **Core Types**: `lib/types/index.ts` - Branded types, Result patterns, error codes
- **Station Types**: `lib/types/station.ts` - Station entities, amenities, search functionality
- **Fare Types**: `lib/types/fare.ts` - Fare calculations, discounts, ticket types
- **Geolocation Types**: `lib/types/geolocation.ts` - Location handling, privacy controls
- **Search Types**: `lib/types/search.ts` - Search logic, ranking, filtering
- **UI Types**: `lib/types/ui.ts` - Component props, theme management
- **Hooks Types**: `lib/types/hooks.ts` - React hook return types
- **Places Types**: `lib/types/places.ts` - Google Places API integration

### Static Data Implementation

- **Station Data**: `lib/data/stations.ts` - Complete MRT-6 station data (17 stations)
- **Fare Data**: `lib/data/fares.ts` - Fare matrix and pricing rules
- **Constants**: `lib/constants.ts` - Centralized application constants

### Key Features Implemented

- ✅ **Branded Types**: Enhanced type safety with branded types for all domain objects
- ✅ **Result Pattern**: Standardized error handling with SuccessResponse/ErrorResponse
- ✅ **Modern TypeScript 2025**: `satisfies` operator, template literals, exhaustive checking
- ✅ **Centralized Constants**: All constants moved to `lib/constants.ts` with proper typing
- ✅ **Complete MRT-6 Data**: All 16 operational stations + 1 under construction (Kamalapur)
- ✅ **Fare Matrix**: Complete fare calculation system with discounts and ticket types
- ✅ **Google Places Integration**: Full API type definitions with quota management

## Core Domain Types

### Branded Types for Type Safety

```typescript
// Core branded types for domain safety at boundaries
export type StationId = string & { readonly __brand: "StationId" };
export type TakaAmount = number & { readonly __brand: "TakaAmount" };
export type Meters = number & { readonly __brand: "Meters" };
export type Kilometers = number & { readonly __brand: "Kilometers" };
export type Minutes = number & { readonly __brand: "Minutes" };
export type Milliseconds = number & { readonly __brand: "Milliseconds" };
export type Latitude = number & { readonly __brand: "Latitude" };
export type Longitude = number & { readonly __brand: "Longitude" };
export type PlaceId = string & { readonly __brand: "PlaceId" };

// Additional branded types for enhanced type safety
export type QueryId = string & { readonly __brand: "QueryId" };
export type ResultId = string & { readonly __brand: "ResultId" };
export type SearchSessionId = string & { readonly __brand: "SearchSessionId" };
export type ComponentId = string & { readonly __brand: "ComponentId" };
export type ThemeId = string & { readonly __brand: "ThemeId" };
export type AnimationId = string & { readonly __brand: "AnimationId" };
export type MarkerId = string & { readonly __brand: "MarkerId" };
export type FareId = string & { readonly __brand: "FareId" };
export type DiscountId = string & { readonly __brand: "DiscountId" };
export type TicketId = string & { readonly __brand: "TicketId" };
export type LocationId = string & { readonly __brand: "LocationId" };
export type GeolocationSessionId = string & { readonly __brand: "GeolocationSessionId" };
export type ServiceAreaId = string & { readonly __brand: "ServiceAreaId" };
export type UserId = string & { readonly __brand: "UserId" };
export type SessionId = string & { readonly __brand: "SessionId" };
export type RequestId = string & { readonly __brand: "RequestId" };
export type CacheKey = string & { readonly __brand: "CacheKey" };
export type Version = string & { readonly __brand: "Version" };
export type Hash = string & { readonly __brand: "Hash" };
export type PlacesRequestId = string & { readonly __brand: "PlacesRequestId" };
export type PlacesCacheKey = string & { readonly __brand: "PlacesCacheKey" };
export type PlacesSessionId = string & { readonly __brand: "PlacesSessionId" };
export type PlacesApiKey = string & { readonly __brand: "PlacesApiKey" };
export type PlacesUserId = string & { readonly __brand: "PlacesUserId" };
export type PlacesField = string & { readonly __brand: "PlacesField" };
export type StationRequestId = string & { readonly __brand: "StationRequestId" };
export type StationVersion = string & { readonly __brand: "StationVersion" };
export type StationHash = string & { readonly __brand: "StationHash" };
```

### Core Entities

#### Station

Represents a metro station with strict typing, immutability, and modern TypeScript 2025 patterns.

```typescript
export type Station = {
  readonly id: StationId;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly amenities: StationAmenities;
  readonly status: StationStatus;
  readonly line: MetroLine;
  readonly order: number;
  readonly aliases: readonly string[];
  readonly createdAt: Milliseconds;
  readonly updatedAt: Milliseconds;
  readonly version: StationVersion;
  readonly hash: StationHash;
  readonly state: "active" | "inactive" | "archived";
  readonly metadata: StationMetadata;
};

export type Coordinates = {
  readonly lat: Latitude;
  readonly lng: Longitude;
};

export type StationAmenities = {
  readonly elevator: boolean;
  readonly escalator: boolean;
  readonly wheelchair: boolean;
  readonly parking: boolean;
  readonly restroom: boolean;
  readonly state: "verified" | "unverified" | "pending";
  readonly lastVerified: Milliseconds;
  readonly confidence: number;
};

export type StationMetadata = {
  readonly description: string;
  readonly capacity: number;
  readonly platformCount: number;
  readonly entranceCount: number;
  readonly exitCount: number;
  readonly accessibility: boolean;
  readonly operatingHours: string;
  readonly tags: readonly string[];
};

export type StationStatus = "operational" | "under-construction" | "planned";
export type MetroLine = "mrt-6";

// Station collection for search results
export type StationCollection = {
  readonly stations: readonly Station[];
  readonly requestId: StationRequestId;
  readonly createdAt: Milliseconds;
  readonly expiresAt: Milliseconds;
  readonly hash: StationHash;
  readonly state: "active" | "expired" | "invalid";
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
  readonly appliedFilters?: StationFilter;
  readonly searchQuery?: string;
};

// Station search result with enhanced metadata
export type StationSearchResult = {
  readonly station: Station;
  readonly searchId: QueryId;
  readonly searchTimestamp: Milliseconds;
  readonly searchQuery: string;
  readonly searchContext: SearchContext;
  readonly distance?: Meters;
  readonly walkingTime?: Minutes;
  readonly walkingDirections?: string;
  readonly matchType: MatchType;
  readonly relevanceScore: number;
  readonly isNearest: boolean;
  readonly rank: number;
  readonly state: "active" | "expired" | "invalid";
  readonly confidence: number;
};

// Station filter for advanced search
export type StationFilter = {
  readonly status?: readonly StationStatus[];
  readonly line?: readonly MetroLine[];
  readonly amenities?: Partial<StationAmenities>;
  readonly maxDistance?: Meters;
  readonly namePattern?: string;
};
```

#### Fare

Represents a computed fare between two stations with strict typing and modern TypeScript 2025 patterns.

```typescript
export type Fare = {
  readonly id: FareId;
  readonly origin: StationId;
  readonly destination: StationId;
  readonly amount: TakaAmount;
  readonly travelTime: Minutes;
  readonly distance: Kilometers;
  readonly route: RouteInfo;
  readonly discount?: DiscountInfo;
  readonly breakdown: FareBreakdown;
  readonly state: "calculated" | "pending" | "confirmed" | "cancelled";
  readonly createdAt: Milliseconds;
  readonly updatedAt: Milliseconds;
  readonly metadata: FareMetadata;
};

export type RouteInfo = {
  readonly stations: readonly StationId[];
  readonly transfers: 0; // Phase 1 constant
};

export type DiscountInfo = {
  readonly id: DiscountId;
  readonly type: DiscountType;
  readonly amount: TakaAmount;
  readonly rate: number; // 0.10 for 10%
  readonly appliedAt: Milliseconds;
  readonly state: "active" | "expired" | "revoked";
};

export type FareBreakdown = {
  readonly id: FareId;
  readonly baseFare: TakaAmount;
  readonly discountAmount: TakaAmount;
  readonly finalAmount: TakaAmount;
  readonly components: FareComponents;
  readonly calculatedAt: Milliseconds;
  readonly status: "calculated" | "pending" | "confirmed";
};

export type FareComponents = {
  readonly baseFare: TakaAmount;
  readonly distanceFare: TakaAmount;
  readonly timeFare: TakaAmount;
  readonly discountAmount: TakaAmount;
  readonly finalAmount: TakaAmount;
};

export type FareMetadata = {
  readonly calculationMethod: "static" | "dynamic";
  readonly dataVersion: string;
  readonly lastUpdated: Milliseconds;
  readonly source: "mrt6_fare_matrix";
  readonly confidence: number;
};

export type DiscountType = "single-journey" | "mrt-pass" | "rapid-pass";
export type TicketType = "single-journey" | "mrt-pass" | "rapid-pass";

// Fare calculation strategy pattern
export type FareCalculationStrategy = {
  readonly calculate: (origin: StationId, destination: StationId, options?: FareCalculationOptions) => Fare;
  readonly validate: (fare: Fare) => boolean;
  readonly applyDiscount: (fare: Fare, discountType: DiscountType) => Fare;
};

export type FareCalculationOptions = {
  readonly discountType?: DiscountType;
  readonly includeBreakdown?: boolean;
  readonly validateRoute?: boolean;
};
```

#### Location

Represents a user-provided or computed geographic point with context and modern TypeScript 2025 patterns.

```typescript
export type Location = {
  readonly id: LocationId;
  readonly coordinates: Coordinates;
  readonly address?: string;
  readonly searchContext: SearchContext;
  readonly accuracy?: Meters;
  readonly confidence: number;
  readonly createdAt: Milliseconds;
  readonly updatedAt: Milliseconds;
  readonly state: "active" | "expired" | "invalid";
  readonly metadata: LocationMetadata;
};

export type SearchContext = {
  readonly query: string;
  readonly timestamp: Milliseconds;
  readonly source: LocationSource;
  readonly sessionId: SearchSessionId;
  readonly requestId: RequestId;
};

export type LocationSource = "geolocation" | "manual" | "search" | "places" | "cached";

export type LocationMetadata = {
  readonly provider: "browser" | "google_places" | "manual" | "cached";
  readonly accuracy: "high" | "medium" | "low";
  readonly lastVerified: Milliseconds;
  readonly isWithinServiceArea: boolean;
  readonly nearestStation?: StationId;
  readonly distanceToNearestStation?: Meters;
};

// Geolocation result with enhanced metadata
export type GeolocationResult = {
  readonly location: Location;
  readonly status: "success" | "error" | "timeout" | "denied";
  readonly error?: GeolocationError;
  readonly processingTime: Milliseconds;
  readonly timestamp: Milliseconds;
};

export type GeolocationError = {
  readonly code: GeolocationErrorCode;
  readonly message: string;
  readonly hint?: string;
  readonly retryable: boolean;
};

export type GeolocationErrorCode = 
  | "GEO_DENIED" 
  | "GEO_UNAVAILABLE" 
  | "GEO_TIMEOUT" 
  | "GEO_ERROR" 
  | "INVALID_COORDINATES" 
  | "OUT_OF_AREA" 
  | "VALIDATION_ERROR";
```

#### SearchResult

Represents ranked search results for stations around a target with modern TypeScript 2025 patterns.

```typescript
// Enhanced search result with comprehensive metadata
export type StationSearchResult = {
  readonly station: Station;
  readonly searchId: QueryId;
  readonly searchTimestamp: Milliseconds;
  readonly searchQuery: string;
  readonly searchContext: SearchContext;
  readonly distance?: Meters;
  readonly walkingTime?: Minutes;
  readonly walkingDirections?: string;
  readonly matchType: MatchType;
  readonly relevanceScore: number;
  readonly isNearest: boolean;
  readonly rank: number;
  readonly state: "active" | "expired" | "invalid";
  readonly confidence: number;
};

export type WalkingDirections = {
  readonly url: string;
  readonly instructions: string;
  readonly duration: Minutes;
  readonly distance: Meters;
  readonly steps: readonly WalkingStep[];
};

export type WalkingStep = {
  readonly instruction: string;
  readonly distance: Meters;
  readonly duration: Minutes;
  readonly direction: string;
};

export type MatchType = "exact" | "fuzzy" | "prefix" | "substring";

// Search options and configuration
export type SearchOptions = {
  readonly maxResults?: number;
  readonly minRelevanceScore?: number;
  readonly includePlanned?: boolean;
  readonly includeUnderConstruction?: boolean;
  readonly sortByRelevance?: boolean;
  readonly userLocation?: Coordinates;
  readonly filter?: StationFilter;
};

// Search match information
export type SearchMatch = {
  readonly matchType: MatchType;
  readonly matchedField: MatchedField;
  readonly query: string;
  readonly matchedText: string;
  readonly editDistance?: number;
};

export type MatchedField = "name" | "alias" | "line";

// Search history and cache
export type SearchHistoryEntry = {
  readonly query: string;
  readonly resultCount: number;
  readonly timestamp: Milliseconds;
  readonly selectedStation?: StationId;
  readonly sessionId: SearchSessionId;
};

export type SearchCacheEntry = {
  readonly query: string;
  readonly options: SearchOptions;
  readonly results: readonly StationSearchResult[];
  readonly createdAt: Milliseconds;
  readonly expiresAt: Milliseconds;
  readonly hitCount: number;
  readonly cacheKey: CacheKey;
};

// Search statistics
export type SearchStatistics = {
  readonly totalSearches: number;
  readonly averageSearchTime: Milliseconds;
  readonly cacheHitRatio: number;
  readonly topQueries: readonly string[];
  readonly performanceMetrics: {
    readonly p50: Milliseconds;
    readonly p95: Milliseconds;
    readonly p99: Milliseconds;
  };
};
```

#### Google Places Entities

Represents Google Places API responses for destination search with modern TypeScript 2025 patterns.

```typescript
export type PlacePrediction = {
  readonly placeId: PlaceId;
  readonly description: string;
  readonly structuredFormatting: StructuredFormatting;
  readonly types: readonly string[];
  readonly terms: readonly PlaceTerm[];
  readonly matchedSubstrings: readonly MatchedSubstring[];
  readonly requestId: PlacesRequestId;
  readonly confidence: number;
  readonly relevanceScore: number;
  readonly createdAt: Milliseconds;
  readonly state: "active" | "expired" | "invalid";
};

export type StructuredFormatting = {
  readonly mainText: string;
  readonly secondaryText: string;
  readonly mainTextMatchedSubstrings: readonly MatchedSubstring[];
  readonly secondaryTextMatchedSubstrings: readonly MatchedSubstring[];
  readonly state: "active" | "expired" | "invalid";
  readonly confidence: number;
};

export type PlaceTerm = {
  readonly offset: number;
  readonly value: string;
};

export type MatchedSubstring = {
  readonly length: number;
  readonly offset: number;
};

export type GooglePlacesOptions = {
  readonly location?: Coordinates;
  readonly radius?: Meters;
  readonly components?: readonly string[];
  readonly types?: readonly string[];
  readonly language?: string;
  readonly region?: string;
  readonly sessionToken?: SessionToken;
  readonly fields?: readonly PlacesField[];
  readonly strictbounds?: boolean;
};

export type SessionToken = string & { readonly __brand: "SessionToken" };

// Enhanced quota management
export type QuotaStatus = {
  readonly places: ApiQuotaInfo;
  readonly maps: ApiQuotaInfo;
  readonly geocoding: ApiQuotaInfo;
  readonly isRateLimited: boolean;
  readonly lastResetTime: Milliseconds;
  readonly dailyLimit: number;
  readonly hourlyLimit: number;
  readonly perSecondLimit: number;
};

export type ApiQuotaInfo = {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Milliseconds;
  readonly isExceeded: boolean;
  readonly warningThreshold: number;
  readonly criticalThreshold: number;
};

// Google Places API response types
export type AutocompleteResponse = {
  readonly predictions: readonly PlacePrediction[];
  readonly status: GoogleMapsStatus;
  readonly requestId: PlacesRequestId;
  readonly sessionId: PlacesSessionId;
  readonly processingTime: Milliseconds;
  readonly state: "success" | "error" | "quota_exceeded";
  readonly error?: GooglePlacesError;
};

export type GoogleMapsStatus = 
  | "OK" 
  | "ZERO_RESULTS" 
  | "OVER_QUERY_LIMIT" 
  | "REQUEST_DENIED" 
  | "INVALID_REQUEST" 
  | "UNKNOWN_ERROR";

export type GooglePlacesError = {
  readonly code: GooglePlacesErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly hint?: string;
};

export type GooglePlacesErrorCode = 
  | "QUOTA_EXCEEDED" 
  | "RATE_LIMITED" 
  | "API_ERROR" 
  | "INVALID_REQUEST" 
  | "REQUEST_DENIED" 
  | "UNKNOWN_ERROR";

// Place field types for Google Places API
export type PlaceField = 
  | "place_id" 
  | "name" 
  | "formatted_address" 
  | "geometry" 
  | "types" 
  | "address_components" 
  | "formatted_phone_number" 
  | "international_phone_number" 
  | "website" 
  | "rating" 
  | "user_ratings_total" 
  | "price_level" 
  | "opening_hours" 
  | "photos" 
  | "reviews" 
  | "utc_offset" 
  | "vicinity" 
  | "url";

// Request configuration
export type GooglePlacesRequestConfig = {
  readonly apiKey: PlacesApiKey;
  readonly sessionToken?: SessionToken;
  readonly fields: readonly PlacesField[];
  readonly language?: string;
  readonly region?: string;
  readonly strictbounds?: boolean;
  readonly location?: Coordinates;
  readonly radius?: Meters;
  readonly components?: readonly string[];
  readonly types?: readonly string[];
};

// API response wrapper
export type GooglePlacesApiResponse<T> = {
  readonly data: T;
  readonly status: GoogleMapsStatus;
  readonly requestId: PlacesRequestId;
  readonly sessionId: PlacesSessionId;
  readonly processingTime: Milliseconds;
  readonly timestamp: Milliseconds;
  readonly error?: GooglePlacesError;
};
```

#### Route

Represents a path between two stations with complete information.

```typescript
export type Route = {
  readonly origin: Station;
  readonly destination: Station;
  readonly stations: readonly Station[];
  readonly fare: Fare;
  readonly travelTime: Minutes;
  readonly distance: Kilometers;
  readonly transfers: 0; // Phase 1 constant
  readonly line: "mrt-6";
  readonly instructions: readonly string[];
};
```

#### ServiceAreaValidation

Represents validation of whether coordinates fall inside Dhaka metro service area.

```typescript
export type ServiceAreaValidation = {
  readonly isValid: boolean;
  readonly distance: Kilometers;
  readonly serviceArea: ServiceArea;
};

export type ServiceArea = {
  readonly radius: Kilometers;
  readonly centroid: Coordinates;
};
```

#### UI Component Types

Represents UI component types for the Metro Station Finder application.

```typescript
// Station card component
export type StationCardProps = {
  readonly station: Station;
  readonly distance?: Meters;
  readonly walkingTime?: number;
  readonly isNearby?: boolean;
  readonly showAmenities?: boolean;
  readonly showDistance?: boolean;
  readonly variant: "compact" | "detailed" | "minimal";
  readonly onClick?: (station: Station) => void;
  readonly state: "idle" | "loading" | "error" | "success";
};

// Fare display component
export type FareDisplayProps = {
  readonly originStation: Station;
  readonly destinationStation: Station;
  readonly fareAmount: TakaAmount;
  readonly ticketType: "single" | "mrt_pass" | "rapid_pass";
  readonly discount?: number;
  readonly route?: readonly Station[];
  readonly variant: "compact" | "detailed";
  readonly showBreakdown?: boolean;
  readonly calculationState: "idle" | "calculating" | "calculated" | "error";
};

// Map component
export type MapMarker = {
  readonly id: MarkerId;
  readonly position: Coordinates;
  readonly title: string;
  readonly description?: string;
  readonly isSelected?: boolean;
  readonly station?: Station;
  readonly state: "active" | "inactive" | "selected" | "hidden";
};

export type MapProps = {
  readonly center: Coordinates;
  readonly zoom: number;
  readonly theme: "light" | "dark" | "satellite" | "terrain";
  readonly markers?: readonly MapMarker[];
  readonly selectedMarkerId?: string;
  readonly isInteractive?: boolean;
  readonly showUserLocation?: boolean;
  readonly onMarkerClick?: (marker: MapMarker) => void;
  readonly onMapClick?: (coordinates: Coordinates) => void;
  readonly className?: string;
};

// Search input component
export type SearchInputProps<T = string> = {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly suggestions?: readonly string[];
  readonly isLoading?: boolean;
  readonly placeholder?: string;
  readonly debounceMs?: Milliseconds;
  readonly onSuggestionSelect?: (suggestion: string) => void;
  readonly onSearch?: (query: string) => void;
  readonly searchState: "idle" | "searching" | "results" | "error";
};

// Google Places autocomplete
export type PlacesAutocompleteProps = {
  readonly onPlaceSelect: (place: { address: string; coordinates: Coordinates }) => void;
  readonly placeholder?: string;
  readonly sessionToken?: string;
  readonly quotaExceeded?: boolean;
  readonly isLoading?: boolean;
} & Omit<SearchInputProps, "onSuggestionSelect">;

// Theme toggle component
export type ThemeToggleProps = {
  readonly showLabel?: boolean;
  readonly className?: string;
};

// Loading states
export type LoadingState = "idle" | "loading" | "success" | "error";

// Metro-specific breakpoints
export const METRO_BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
} as const;
```

#### React Hooks Types

Represents custom React hook types for the Metro Station Finder application.

```typescript
// Generic hook state
export type HookState<T = unknown> = 
  | { readonly status: "idle"; readonly data: undefined; readonly error: undefined }
  | { readonly status: "loading"; readonly data: T | undefined; readonly error: undefined }
  | { readonly status: "success"; readonly data: T; readonly error: undefined }
  | { readonly status: "error"; readonly data: T | undefined; readonly error: string };

// Local storage hook
export type UseLocalStorageReturn<T> = {
  readonly value: T | undefined;
  readonly setValue: (value: T | undefined) => void;
  readonly removeValue: () => void;
  readonly isLoading: boolean;
  readonly error: string | undefined;
};

// Station search hook
export type UseStationSearchReturn = {
  readonly query: string;
  readonly setQuery: (query: string) => void;
  readonly results: readonly StationSearchResult[];
  readonly isLoading: boolean;
  readonly error: string | undefined;
  readonly search: (query: string) => Promise<void>;
  readonly clearResults: () => void;
};

// Geolocation hook
export type UseGeolocationReturn = {
  readonly location: Location | undefined;
  readonly isLoading: boolean;
  readonly error: string | undefined;
  readonly requestLocation: () => Promise<void>;
  readonly clearLocation: () => void;
  readonly isSupported: boolean;
  readonly permission: "granted" | "denied" | "prompt" | "unknown";
};

// Map hook
export type UseMapReturn = {
  readonly center: Coordinates;
  readonly setCenter: (center: Coordinates) => void;
  readonly zoom: number;
  readonly setZoom: (zoom: number) => void;
  readonly markers: readonly MapMarker[];
  readonly addMarker: (marker: MapMarker) => void;
  readonly removeMarker: (id: MarkerId) => void;
  readonly selectedMarkerId: MarkerId | undefined;
  readonly setSelectedMarker: (id: MarkerId | undefined) => void;
};

// Favorites hook
export type UseFavoritesReturn = {
  readonly favorites: readonly StationId[];
  readonly addFavorite: (stationId: StationId) => void;
  readonly removeFavorite: (stationId: StationId) => void;
  readonly isFavorite: (stationId: StationId) => boolean;
  readonly toggleFavorite: (stationId: StationId) => void;
  readonly clearFavorites: () => void;
};

// Search history hook
export type UseSearchHistoryReturn = {
  readonly history: readonly SearchHistoryEntry[];
  readonly addToHistory: (entry: SearchHistoryEntry) => void;
  readonly clearHistory: () => void;
  readonly removeFromHistory: (timestamp: Milliseconds) => void;
  readonly getRecentQueries: (limit?: number) => readonly string[];
};

// Theme hook
export type UseThemeReturn = {
  readonly theme: "light" | "dark" | "system";
  readonly setTheme: (theme: "light" | "dark" | "system") => void;
  readonly resolvedTheme: "light" | "dark";
  readonly toggleTheme: () => void;
};

// Route planning hook
export type UseRoutePlanningReturn = {
  readonly origin: Station | undefined;
  readonly destination: Station | undefined;
  readonly setOrigin: (station: Station | undefined) => void;
  readonly setDestination: (station: Station | undefined) => void;
  readonly route: Route | undefined;
  readonly fare: Fare | undefined;
  readonly isLoading: boolean;
  readonly error: string | undefined;
  readonly calculateRoute: () => Promise<void>;
  readonly clearRoute: () => void;
  readonly swapStations: () => void;
};

// Hook configuration types
export type UseStationSearchConfig = {
  readonly debounceMs?: Milliseconds;
  readonly maxResults?: number;
  readonly minQueryLength?: number;
  readonly includePlanned?: boolean;
  readonly includeUnderConstruction?: boolean;
};

// Hook event types
export type HookEvent = 
  | `hook:${string}:${string}`
  | `hook:${string}:error`
  | `hook:${string}:success`;

// Hook factory and middleware
export type HookFactory<TConfig, TReturn> = (config: TConfig) => TReturn;
export type HookMiddleware<TConfig, TReturn> = (config: TConfig, next: () => TReturn) => TReturn;
export type ComposedHook<TConfig, TReturn> = (config: TConfig) => TReturn;
```

## Result Pattern Implementation

### Standard Result Types

```typescript
// Standard Result pattern for error handling
export type Result<T, E = string> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E; readonly message: string };

// Success response with metadata
export type SuccessResponse<T> = {
  readonly success: true;
  readonly data: T;
  readonly meta: {
    readonly processingTime: Milliseconds;
    readonly version: string;
  };
};

// Error response with structured error info
export type ErrorResponse<E extends string = string> = {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
    readonly hint?: string;
  };
};

// Union type for all API responses
export type ApiResponse<T, E extends string = string> = SuccessResponse<T> | ErrorResponse<E>;
```

### Error Codes

```typescript
// Error codes as const for type safety
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
} as const;

export type StationErrorCode = (typeof ERROR_CODES.station)[keyof typeof ERROR_CODES.station];
export type FareErrorCode = (typeof ERROR_CODES.fare)[keyof typeof ERROR_CODES.fare];
export type GeolocationErrorCode = (typeof ERROR_CODES.geolocation)[keyof typeof ERROR_CODES.geolocation];
export type GooglePlacesErrorCode = (typeof ERROR_CODES.googlePlaces)[keyof typeof ERROR_CODES.googlePlaces];
```

## Zod Validation Schemas

### Core Entity Schemas

```typescript
// Coordinates validation
const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90).brand<'Latitude'>(),
  lng: z.number().min(-180).max(180).brand<'Longitude'>(),
}) satisfies z.ZodType<Coordinates>;

// Station validation
const StationSchema = z.object({
  id: z.string().min(1).brand<'StationId'>(),
  name: z.string().min(1),
  coordinates: CoordinatesSchema,
  amenities: z.object({
    elevator: z.boolean(),
    escalator: z.boolean(),
    wheelchair: z.boolean(),
    parking: z.boolean(),
    restroom: z.boolean(),
  }),
  status: z.enum(['operational', 'under-construction', 'planned']),
  line: z.literal('mrt-6'),
  order: z.number().int().positive(),
  aliases: z.array(z.string()).readonly(),
}) satisfies z.ZodType<Station>;

// Fare validation
const FareSchema = z.object({
  origin: z.string().min(1).brand<'StationId'>(),
  destination: z.string().min(1).brand<'StationId'>(),
  amount: z.number().int().positive().brand<'TakaAmount'>(),
  travelTime: z.number().positive().brand<'Minutes'>(),
  distance: z.number().positive().brand<'Kilometers'>(),
  route: z.object({
    stations: z.array(z.string().brand<'StationId'>()).readonly(),
    transfers: z.literal(0),
  }),
  discount: z.object({
    type: z.enum(['single-journey', 'mrt-pass', 'rapid-pass']),
    amount: z.number().int().nonnegative().brand<'TakaAmount'>(),
    rate: z.number().min(0).max(1),
  }).optional(),
  breakdown: z.object({
    baseFare: z.number().int().positive().brand<'TakaAmount'>(),
    discountAmount: z.number().int().nonnegative().brand<'TakaAmount'>(),
    finalAmount: z.number().int().positive().brand<'TakaAmount'>(),
  }),
}) satisfies z.ZodType<Fare>;
```

## Utility Types

```typescript
// Extract success data from Result
type ExtractSuccess<T> = T extends { success: true; data: infer U } ? U : never;

// Extract error from Result
type ExtractError<T> = T extends { success: false; error: infer U } ? U : never;

// Non-empty array type
type NonEmptyArray<T> = [T, ...T[]];

// Deep readonly for immutability
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Branded type helper
type Brand<T, U> = T & { readonly __brand: U };
```

## Type Guards

```typescript
// Type guard for StationId validation
function isStationId(value: unknown): value is StationId;

// Type guard for Coordinates validation
function isCoordinates(value: unknown): value is Coordinates;

// Type guard for TakaAmount validation
function isTakaAmount(value: unknown): value is TakaAmount;

// Type guard for success response
function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T>;

// Type guard for error response
function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ErrorResponse;
```

## Utility Functions

```typescript
// Create branded types with validation
function createStationId(id: string): StationId;
function createCoordinates(lat: number, lng: number): Coordinates;
function createTakaAmount(amount: number): TakaAmount;
function createMeters(value: number): Meters;
function createKilometers(value: number): Kilometers;
function createMinutes(value: number): Minutes;

// Safe JSON parse with Zod validation
function safeJsonParse<T>(
  json: string,
  schema: z.ZodSchema<T>
): Result<T, 'PARSE_ERROR'>;

// Calculate distance between coordinates
function calculateDistance(
  from: Coordinates,
  to: Coordinates
): Kilometers;

// Calculate walking time from distance
function calculateWalkingTime(distance: Meters): Minutes;
```

## Constants

### Centralized Constants File

All application constants are centralized in `lib/constants.ts` using strict TypeScript patterns with `satisfies` operator and branded types.

```typescript
// Application-wide constants
export const APP_CONSTANTS = {
  version: "1.0.0" as Version,
  dataVersion: "dmrtc_fares_2024-12-15" as Version,
  minSearchLength: 3,
  maxSearchResults: 20,
  defaultSearchRadius: 5000 as Meters,
  walkingSpeedMPerMin: 75,
  minutesPerStation: 2.5,
  cacheDurationMs: (TIME_CONSTANTS.cacheMinutes * TIME_CONSTANTS.secondsPerMinute * TIME_CONSTANTS.millisecondsPerSecond) as Milliseconds,
  maxRetries: 3,
  retryDelayMs: 1000 as Milliseconds,
  debounceDelayMs: 300 as Milliseconds,
  maxHistoryEntries: 50,
  maxCacheEntries: 100,
} as const satisfies Record<string, unknown>;

// Dhaka service area configuration
export const DHAKA_SERVICE_AREA = {
  centroid: {
  lat: 23.7779 as Latitude,
  lng: 90.3971 as Longitude,
  } as Coordinates,
  radiusKm: 25 as Kilometers,
  radiusMeters: 25000 as Meters,
} as const satisfies Record<string, unknown>;

// Station-related constants
export const STATION_CONSTANTS = {
  maxAliases: 10,
  minOrder: 1,
  maxOrder: 50,
  amenitiesCount: 5,
  defaultVersion: "1.0.0" as Version,
  cacheExpirationMs: 300_000 as Milliseconds, // 5 minutes
  maxSearchResults: 20,
  minRelevanceScore: 0.1,
  // MRT-6 specific
  totalStations: 17,
  operationalStations: 16,
  underConstructionStations: 1,
  plannedStations: 0,
} as const satisfies Record<string, number | Version | Milliseconds>;

// Fare calculation constants
export const FARE_CONSTANTS = {
  minFare: 20 as TakaAmount,
  maxFare: 100 as TakaAmount,
  mrtPassDiscount: 0.1,
  rapidPassDiscount: 0.1,
  singleJourneyDiscount: 0,
  minutesPerSegment: 2.5,
  fullLineTravelTime: 40 as Minutes, // 17 stations × 2.5 min
  operationalLineTravelTime: 38 as Minutes, // 16 stations × 2.5 min
} as const satisfies Record<string, unknown>;

// Search-related constants
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

// Google Places API constants
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
  quotaWarningThreshold: 0.8,
  quotaCriticalThreshold: 0.95,
  // Caching
  cacheExpirationMs: 300_000 as Milliseconds, // 5 minutes
  maxCacheEntries: 100,
  retryAttempts: 3,
  retryDelayMs: 1000 as Milliseconds,
} as const satisfies Record<string, unknown>;

// UI component constants
export const UI_CONSTANTS = {
  // Breakpoints
  mobileBreakpoint: 320,
  tabletBreakpoint: 768,
  desktopBreakpoint: 1024,
  // Animation durations
  shortAnimationMs: 150 as Milliseconds,
  mediumAnimationMs: 300 as Milliseconds,
  longAnimationMs: 500 as Milliseconds,
  // Debounce delays
  searchDebounceMs: 300 as Milliseconds,
  inputDebounceMs: 150 as Milliseconds,
  // Loading states
  loadingTimeoutMs: 5000 as Milliseconds,
  skeletonAnimationMs: 1000 as Milliseconds,
} as const satisfies Record<string, unknown>;

// Performance thresholds
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

// Accessibility constants
export const A11Y_CONSTANTS = {
  minTouchTargetSize: 44, // 44px minimum touch target
  focusOutlineWidth: 2,
  focusOutlineOffset: 2,
  minColorContrast: 4.5, // WCAG AA
  maxColorContrast: 7, // WCAG AAA
  screenReaderOnlyClass: "sr-only",
} as const satisfies Record<string, unknown>;
```

### Constants Organization

The constants file is organized into logical domains:

- **APP_CONSTANTS**: Application-wide settings and configuration
- **DHAKA_SERVICE_AREA**: Geographic service area boundaries
- **STATION_CONSTANTS**: Station-specific configuration and limits
- **FARE_CONSTANTS**: Fare calculation rules and pricing
- **SEARCH_CONSTANTS**: Search functionality configuration
- **GOOGLE_PLACES_CONSTANTS**: Google Places API configuration
- **UI_CONSTANTS**: UI component settings and breakpoints
- **PERFORMANCE_THRESHOLDS**: Performance monitoring thresholds
- **A11Y_CONSTANTS**: Accessibility compliance settings
- **ERROR_CODES**: Centralized error code definitions
- **VALIDATION_PATTERNS**: Regex patterns for validation

### Strict TypeScript Patterns

All constants use strict TypeScript patterns:

- **`satisfies` operator**: Ensures type safety while maintaining literal types
- **Branded types**: Applied to domain-specific values (Meters, Milliseconds, etc.)
- **Const assertions**: All objects use `as const` for immutability
- **Template literal types**: For complex type definitions
- **Exhaustive checking**: Enum-like objects with strict typing

## Data Relationships

### Entity Relationships

- **Station ↔ Fare**: Many-to-many (each station can be paired with any other)
- **Location ↔ StationSearchResult**: One-to-many (one query may yield multiple results)
- **Station ↔ Route**: Many-to-many (stations appear in multiple routes)
- **Station ↔ ServiceArea**: One-to-many (service area contains multiple stations)

### Data Flow

```typescript
// Search flow
Location → StationSearchResult[] → Station

// Fare calculation flow
StationId → StationId → Fare

// Route calculation flow
StationId → StationId → Route

// Service area validation flow
Coordinates → ServiceAreaValidation
```

## State Transitions

### Station Status

```text
planned → under-construction → operational
```

### Search Context

```text
idle → searching → results → error
```

### Map State

```text
loading → loaded → error → fallback
```

## Business Rules

### Distance Calculations

- **Algorithm**: Haversine formula for great-circle distance
- **Walking time**: `ceil(distance_m / 75)` minutes
- **Maximum radius**: 5000 meters (5 km)
- **Distance formatting**: <1000m → meters, ≥1000m → km (1 decimal)

### Fare Calculations

- **Base fare**: Lookup from static fare table
- **Discounts**: MRT Pass (10%), Rapid Pass (10%), Single Journey (0%)
- **Caps**: Minimum ৳20, Maximum ৳100
- **Rounding**: All final fares rounded up to whole Taka

### Search Rules

- **Minimum query**: 3 characters after normalization
- **Normalization**: Trim, collapse spaces, Unicode NFKD, remove diacritics, lowercase
- **Fuzzy matching**: 1-character typo tolerance for names ≥ 5 characters
- **Ranking priority**: Exact match → Alias match → Fuzzy match → Prefix match → Substring match

## Data Sources

### Static Data Files

- `lib/data/stations.ts` → All 17 stations with complete information (16 operational + 1 under construction)
- `lib/data/fares.ts` → Fare calculation rules and base fare table
- `lib/constants.ts` → Centralized application constants with strict TypeScript patterns

### Data Versioning

- **Version control**: `data_version` in constants
- **Change tracking**: All data changes require deployment
- **Validation**: Data validated at build time with Zod schemas

## Performance Considerations

### Optimization Strategies

- **Static data only**: Loaded at build time, no runtime fetching
- **Immutable structures**: All data structures are `readonly`
- **Memoization**: Search results cached for 5 minutes
- **Debouncing**: Search queries debounced at 300ms
- **Lazy loading**: Non-critical data loaded on demand

### Memory Management

- **No persistence**: Location data exists only in memory
- **Ephemeral data**: All user data cleared after session
- **Efficient lookups**: O(1) station lookups using Maps
- **Bundle optimization**: Tree-shaking for unused code

---

*This data model ensures type safety, immutability, and performance for the Metro Station Finder application while maintaining strict TypeScript standards throughout.*
