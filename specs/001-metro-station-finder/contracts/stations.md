# Station Search Functions Interface

**Date**: 2025-09-27  
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Overview

This interface defines the client-side functions for station search and discovery operations in the Metro Station Finder application. All operations are client-side with static data - **NO backend APIs in Phase 1**.

## Implementation Status ✅

**Phase 2 Complete**: Type definitions and static data have been implemented.

### Type Definitions

- **Station Types**: `lib/types/station.ts` - Complete station entity definitions
- **Search Types**: `lib/types/search.ts` - Search logic and ranking algorithms
- **Core Types**: `lib/types/index.ts` - Branded types and Result patterns

### Static Data

- **Station Data**: `lib/data/stations.ts` - Complete MRT-6 station data (17 stations)
- **Constants**: `lib/constants.ts` - Centralized application constants

### Key Features

- ✅ **17 MRT-6 Stations**: 16 operational + 1 under construction (Kamalapur)
- ✅ **Search Functionality**: Fuzzy matching, relevance scoring, filtering
- ✅ **Type Safety**: Branded types for StationId, Meters, Minutes, etc.
- ✅ **Error Handling**: Standardized Result pattern with specific error codes

## Client-Side Functions

### searchDestinations(query, options?)

Search destinations using Google Places autocomplete for finding nearest metro station.

**Function Signature**:

```typescript
function searchDestinations(
  query: string,
  options?: GooglePlacesOptions
): ApiResponse<readonly PlacePrediction[], 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'INVALID_QUERY' | 'API_ERROR'>;
```

**Type Constraints**:

- `query` must be minimum 3 characters
- `options` includes location bias, radius, and component restrictions
- Returns `Result<readonly PlacePrediction[], GooglePlacesErrorCode>` pattern
- Handles daily quota limits and rate limiting gracefully
- Implements client-side rate limiting (10 requests/minute)

### getQuotaStatus()

Get current API quota status and usage information.

**Function Signature**:

```typescript
function getQuotaStatus(): ApiResponse<QuotaStatus, never>;
```

**Type Constraints**:

- Returns current quota usage for all Google APIs
- Includes rate limiting status and remaining requests
- Never fails (always returns status)

### isAutocompleteAvailable()

Check if Google Places autocomplete is currently available.

**Function Signature**:

```typescript
function isAutocompleteAvailable(): boolean;
```

**Type Constraints**:

- Returns `true` if autocomplete is available
- Returns `false` if quota exceeded or rate limited
- Used to conditionally show/hide autocomplete UI

### getAllStations()

Get complete station list from static data with strict type safety.

**Function Signature**:

```typescript
function getAllStations(): ApiResponse<readonly Station[], never>;
```

**Type Constraints**:

- Returns `SuccessResponse<readonly Station[]>` (never fails)
- All stations are `readonly` for immutability
- Includes metadata with total count and version info

### searchStations(query, limit?)

Search stations with case-insensitive, fuzzy matching using strict typing.

**Function Signature**:

```typescript
function searchStations(
  query: string,
  limit?: number
): ApiResponse<readonly StationSearchResult[], 'INVALID_QUERY' | 'SEARCH_ERROR'>;
```

**Type Constraints**:

- `query` must be minimum 3 characters after normalization
- `limit` defaults to 10, maximum 20
- Returns `Result<readonly StationSearchResult[], StationErrorCode>` pattern
- All results are `readonly` for immutability

### findNearestStation(coordinates, radius?)

Find nearest station to coordinates using Haversine formula with strict typing.

**Function Signature**:

```typescript
function findNearestStation(
  coordinates: Coordinates,
  radius?: Meters
): ApiResponse<StationSearchResult | null, 'INVALID_COORDINATES' | 'SEARCH_ERROR'>;
```

**Type Constraints**:

- Uses branded `Coordinates` type for type safety
- `radius` uses branded `Meters` type, defaults to 5000m
- Returns `Result<StationSearchResult | null, StationErrorCode>` pattern
- Handles null case when no stations within radius

### getStationById(id)

Lookup station by canonical ID with strict type safety.

**Function Signature**:

```typescript
function getStationById(
  id: StationId
): ApiResponse<Station, 'STATION_NOT_FOUND'>;
```

**Type Constraints**:

- Uses branded `StationId` type for type safety
- Returns `Result<Station, StationErrorCode>` pattern
- Station data is `readonly` for immutability

## Data Types

### Core Domain Types

```typescript
// Branded types for type safety at boundaries
type StationId = string & { readonly __brand: 'StationId' };
type Meters = number & { readonly __brand: 'Meters' };
type Kilometers = number & { readonly __brand: 'Kilometers' };
type Minutes = number & { readonly __brand: 'Minutes' };
type Milliseconds = number & { readonly __brand: 'Milliseconds' };

// Strict coordinate type
interface Coordinates {
  readonly lat: Latitude;
  readonly lng: Longitude;
}

// Station with strict typing and modern TypeScript 2025 patterns
interface Station {
  readonly id: StationId;
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly amenities: StationAmenities;
  readonly status: StationStatus;
  readonly line: 'mrt-6';
  readonly order: number;
  readonly aliases: readonly string[];
  readonly createdAt: Milliseconds;
  readonly updatedAt: Milliseconds;
  readonly version: StationVersion;
  readonly hash: StationHash;
  readonly state: "active" | "inactive" | "archived";
  readonly metadata: StationMetadata;
}

// Enhanced station amenities with verification state
interface StationAmenities {
  readonly elevator: boolean;
  readonly escalator: boolean;
  readonly wheelchair: boolean;
  readonly parking: boolean;
  readonly restroom: boolean;
  readonly state: "verified" | "unverified" | "pending";
  readonly lastVerified: Milliseconds;
  readonly confidence: number;
}

// Station metadata for additional information
interface StationMetadata {
  readonly description: string;
  readonly capacity: number;
  readonly platformCount: number;
  readonly entranceCount: number;
  readonly exitCount: number;
  readonly accessibility: boolean;
  readonly operatingHours: string;
  readonly tags: readonly string[];
}

// Station status types
type StationStatus = "operational" | "under-construction" | "planned";
type MetroLine = "mrt-6";

// Additional branded types
type StationVersion = string & { readonly __brand: "StationVersion" };
type StationHash = string & { readonly __brand: "StationHash" };

// Enhanced search result with comprehensive metadata
interface StationSearchResult {
  readonly station: Station;
  readonly searchId: QueryId;
  readonly searchTimestamp: Milliseconds;
  readonly searchQuery: string;
  readonly searchContext: SearchContext;
  readonly distance?: Meters;
  readonly walkingTime?: Minutes;
  readonly walkingDirections?: string;
  readonly matchType: 'exact' | 'fuzzy' | 'prefix' | 'substring';
  readonly relevanceScore: number;
  readonly isNearest: boolean;
  readonly rank: number;
  readonly state: "active" | "expired" | "invalid";
  readonly confidence: number;
}

// Search context for tracking search sessions
interface SearchContext {
  readonly query: string;
  readonly timestamp: Milliseconds;
  readonly source: LocationSource;
  readonly sessionId: SearchSessionId;
  readonly requestId: RequestId;
}

// Location source types
type LocationSource = "geolocation" | "manual" | "search" | "places" | "cached";

// Additional branded types for search
type QueryId = string & { readonly __brand: "QueryId" };
type SearchSessionId = string & { readonly __brand: "SearchSessionId" };
type RequestId = string & { readonly __brand: "RequestId" };
```

### Result Pattern Implementation

```typescript
// Standard Result pattern for error handling
type Result<T, E = StationErrorCode> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E; readonly message: string };

// Success response with metadata
interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: {
    readonly processingTime: Milliseconds;
    readonly version: string;
  };
}

// Error response with structured error info
interface ErrorResponse<E extends StationErrorCode = StationErrorCode> {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
    readonly hint?: string;
  };
}

// Union type for all API responses
type ApiResponse<T, E extends StationErrorCode = StationErrorCode> = 
  | SuccessResponse<T>
  | ErrorResponse<E>;
```

### Error Types and Codes

```typescript
// Error codes as const for type safety
const STATION_ERROR_CODES = {
  INVALID_QUERY: 'INVALID_QUERY',
  SEARCH_ERROR: 'SEARCH_ERROR',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  STATION_NOT_FOUND: 'STATION_NOT_FOUND',
  NO_STATIONS: 'NO_STATIONS',
} as const;

type StationErrorCode = typeof STATION_ERROR_CODES[keyof typeof STATION_ERROR_CODES];
```

### Utility Types

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
```

## Business Rules

### Search Rules

- **Minimum query length**: 3 characters after normalization
- **Normalization**: Trim, collapse spaces, Unicode NFKD, remove diacritics, lowercase
- **Fuzzy matching**: 1-character typo tolerance for names ≥ 5 characters
- **Ranking priority**:
  1. Exact station name match
  2. Exact alias match
  3. Fuzzy (1-char edit) name match (≥5 chars)
  4. Prefix match
  5. Substring match
- **Tie-breaking**: Distance ascending, then alphabetical by station name
- **Result limit**: Default 10, maximum 20 results
- **Station coverage**: 17 total stations (16 operational + 1 under construction - Kamalapur)

### Distance Calculation Rules

- **Algorithm**: Haversine formula for great-circle distance
- **Default radius**: 5000 meters (5 km)
- **Walking time**: `ceil(distance_m / 75)` minutes
- **Distance formatting**: <1000m → meters, ≥1000m → km (1 decimal)
- **Tie-breaking**: Shorter walking time, then alphabetical

### Data Validation Rules

- **Station IDs**: Must be valid branded `StationId` type
- **Coordinates**: Latitude [-90, 90], Longitude [-180, 180]
- **Search queries**: Minimum 3 characters, maximum 100 characters
- **Result limits**: Enforced at function level

## Error Codes

### Google Places Errors

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `QUOTA_EXCEEDED` | Daily API quota reached | Disable autocomplete, show manual input |
| `RATE_LIMITED` | Rate limit exceeded (10 req/min) | Wait and retry, show manual input |
| `API_ERROR` | Google Places API error | Retry or fallback to manual input |
| `INVALID_QUERY` | Query too short or invalid | Use minimum 3 characters |

### Station Search Errors

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `SEARCH_ERROR` | Search operation failed | Retry search or use manual input |
| `INVALID_COORDINATES` | Invalid lat/lng values | Request valid coordinates |
| `STATION_NOT_FOUND` | Station ID not found | Use valid station ID |
| `NO_STATIONS` | No stations within radius | Expand search radius or use manual input |

## Type Guards and Validation

```typescript
// Type guard for StationId validation
function isStationId(value: unknown): value is StationId;

// Type guard for Coordinates validation
function isCoordinates(value: unknown): value is Coordinates;

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
// Create branded StationId with validation
function createStationId(id: string): StationId;

// Create branded Coordinates with validation
function createCoordinates(lat: number, lng: number): Coordinates;

// Normalize search query
function normalizeQuery(query: string): string;

// Calculate distance between coordinates
function calculateDistance(
  from: Coordinates,
  to: Coordinates
): Meters;

// Calculate walking time from distance
function calculateWalkingTime(distance: Meters): Minutes;
```

## Example Usage

```typescript
// Search stations with type safety
const searchResult = searchStations('uttara', 5);
if (isSuccessResponse(searchResult)) {
  const stations = searchResult.data; // Type: readonly StationSearchResult[]
  console.log(`Found ${stations.length} stations`);
} else {
  const error = searchResult.error; // Type: StationErrorCode
  console.error(`Search error: ${error.code}`);
}

// Find nearest station
const coords = createCoordinates(23.7779, 90.3971);
const nearestResult = findNearestStation(coords, 5000 as Meters);
if (isSuccessResponse(nearestResult)) {
  const nearest = nearestResult.data; // Type: StationSearchResult | null
  if (nearest) {
    console.log(`Nearest: ${nearest.station.name} (${nearest.distance}m)`);
  } else {
    console.log('No stations within radius');
  }
}

// Get station by ID
const stationResult = getStationById(createStationId('uttara-north'));
if (isSuccessResponse(stationResult)) {
  const station = stationResult.data; // Type: Station
  console.log(`Station: ${station.name}`);
}
```

---

*This contract ensures accurate station search and discovery with strict type safety and comprehensive error handling for the Metro Station Finder application.*
