# Geolocation Functions Interface

**Date**: 2025-09-27  
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Overview

This interface defines the client-side functions for geolocation operations in the Metro Station Finder application. All geolocation operations are client-side with strict privacy controls - **NO backend APIs in Phase 1**.

## Implementation Status ✅

**Phase 2 Complete**: Type definitions and static data have been implemented.

### Type Definitions

- **Geolocation Types**: `lib/types/geolocation.ts` - Complete location handling and privacy controls
- **Core Types**: `lib/types/index.ts` - Branded types and Result patterns

### Static Data

- **Constants**: `lib/constants.ts` - Centralized geolocation constants and service area definitions

### Key Features

- ✅ **Privacy Controls**: Safe location logging with coordinate rounding
- ✅ **Service Area Validation**: Dhaka metro service area with 25km radius
- ✅ **Type Safety**: Branded types for Coordinates, Meters, Kilometers, etc.
- ✅ **Error Handling**: Comprehensive geolocation error management

## Client-Side Functions

### requestCurrentLocation(options?)

Request current location using the Browser Geolocation API with strict type safety.

**Function Signature**:

```typescript
function requestCurrentLocation(
  options?: GeolocationOptions
): Promise<ApiResponse<GeolocationResult, GeolocationErrorCode>>;
```

**Type Constraints**:

- Returns `Promise<ApiResponse<GeolocationResult, GeolocationErrorCode>>`
- All properties are `readonly` for immutability
- Uses branded types for coordinates and accuracy
- Respects DNT (Do Not Track) settings

### validateServiceArea(coordinates)

Validate if coordinates are within the Dhaka service area using strict typing.

**Function Signature**:

```typescript
function validateServiceArea(
  coordinates: Coordinates
): ApiResponse<ServiceAreaValidation, 'INVALID_COORDINATES' | 'OUT_OF_AREA'>;
```

**Type Constraints**:

- Uses branded `Coordinates` type for type safety
- Returns `Result<ServiceAreaValidation, GeolocationErrorCode>` pattern
- All validation results are `readonly` for immutability

### formatGeoError(code)

Map error codes to Copy Deck IDs for consistent UI messaging.

**Function Signature**:

```typescript
function formatGeoError(
  code: GeolocationErrorCode
): { readonly id: CopyId; readonly defaultMessage: string };
```

**Type Constraints**:

- Uses strict union types for error codes
- Returns immutable objects with `readonly` properties
- Maps to Copy Deck IDs for internationalization

## Data Types

### Core Domain Types

```typescript
// Branded types for type safety at boundaries
type Latitude = number & { readonly __brand: 'Latitude' };
type Longitude = number & { readonly __brand: 'Longitude' };
type Meters = number & { readonly __brand: 'Meters' };
type Kilometers = number & { readonly __brand: 'Kilometers' };
type Milliseconds = number & { readonly __brand: 'Milliseconds' };

// Strict coordinate type with validation
interface Coordinates {
  readonly lat: Latitude;
  readonly lng: Longitude;
}

// Geolocation options with strict typing
interface GeolocationOptions {
  readonly enableHighAccuracy?: boolean;
  readonly timeout?: Milliseconds;
  readonly maximumAge?: Milliseconds;
}

// Enhanced geolocation result with modern TypeScript 2025 patterns
interface GeolocationResult {
  readonly location: Location;
  readonly status: "success" | "error" | "timeout" | "denied";
  readonly error?: GeolocationError;
  readonly processingTime: Milliseconds;
  readonly timestamp: Milliseconds;
}

// Enhanced location with comprehensive metadata
interface Location {
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

// Location metadata
interface LocationMetadata {
  readonly provider: "browser" | "google_places" | "manual" | "cached";
  readonly accuracy: "high" | "medium" | "low";
  readonly lastVerified: Milliseconds;
  readonly isWithinServiceArea: boolean;
  readonly nearestStation?: StationId;
  readonly distanceToNearestStation?: Meters;
}

// Geolocation error
interface GeolocationError {
  readonly code: GeolocationErrorCode;
  readonly message: string;
  readonly hint?: string;
  readonly retryable: boolean;
}

// Additional branded types
type LocationId = string & { readonly __brand: "LocationId" };
type SearchSessionId = string & { readonly __brand: "SearchSessionId" };
type RequestId = string & { readonly __brand: "RequestId" };
type StationId = string & { readonly __brand: "StationId" };

// Service area configuration
interface ServiceArea {
  readonly radius: Kilometers;
  readonly centroid: Coordinates;
}

// Service area validation result
interface ServiceAreaValidation {
  readonly isValid: boolean;
  readonly distance: Kilometers;
  readonly serviceArea: ServiceArea;
}
```

### Result Pattern Implementation

```typescript
// Standard Result pattern for error handling
type Result<T, E = GeolocationErrorCode> = 
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
interface ErrorResponse<E extends GeolocationErrorCode = GeolocationErrorCode> {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
    readonly hint?: string;
  };
}

// Union type for all API responses
type ApiResponse<T, E extends GeolocationErrorCode = GeolocationErrorCode> = 
  | SuccessResponse<T>
  | ErrorResponse<E>;
```

### Error Types and Codes

```typescript
// Error codes as const for type safety
const GEOLOCATION_ERROR_CODES = {
  GEO_DENIED: 'GEO_DENIED',
  GEO_UNAVAILABLE: 'GEO_UNAVAILABLE',
  GEO_TIMEOUT: 'GEO_TIMEOUT',
  GEO_ERROR: 'GEO_ERROR',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  OUT_OF_AREA: 'OUT_OF_AREA',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

type GeolocationErrorCode = typeof GEOLOCATION_ERROR_CODES[keyof typeof GEOLOCATION_ERROR_CODES];

// Copy Deck ID type for internationalization
type CopyId = 
  | 'err.provider_unavailable'
  | 'note.geo_denied'
  | 'err.out_of_area'
  | 'err.invalid_coordinates'
  | 'err.geo_timeout';
```

### Utility Types

```typescript
// Extract success data from Result
type ExtractSuccess<T> = T extends { success: true; data: infer U } ? U : never;

// Extract error from Result
type ExtractError<T> = T extends { success: false; error: infer U } ? U : never;

// Deep readonly for immutability
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

## Constants

### Application Constants

```typescript
// Dhaka service area configuration
const DHAKA_CENTROID: Coordinates = {
  lat: 23.7779 as Latitude,
  lng: 90.3971 as Longitude,
};

const SERVICE_AREA_RADIUS_KM = 25 as Kilometers;

// Default geolocation options
const DEFAULT_GEO_OPTIONS: Required<GeolocationOptions> = {
  enableHighAccuracy: true,
  timeout: 10_000 as Milliseconds,
  maximumAge: 300_000 as Milliseconds, // 5 minutes
};

// UI display constants
const KM_DECIMALS = 1; // Decimal places for distance display
const MAX_ACCURACY_METERS = 100 as Meters; // Maximum acceptable accuracy
```

## Business Rules

### Geolocation Request Rules

- **User consent required**: Geolocation only requested after clear rationale text
- **One-shot requests**: No background polling or continuous tracking
- **DNT compliance**: Respects `navigator.doNotTrack === '1'` setting
- **Timeout handling**: Default 10 seconds, configurable via options
- **Accuracy requirements**: Prefer high accuracy, fallback to cached if available

### Service Area Validation Rules

- **Service radius**: 25 km from Dhaka centroid (23.7779, 90.3971)
- **Coordinate validation**: Latitude [-90, 90], Longitude [-180, 180]
- **Distance calculation**: Haversine formula for great-circle distance
- **Boundary inclusion**: Points exactly at 25.0 km are considered inside
- **Error handling**: Invalid coordinates return `INVALID_COORDINATES` error

### Privacy & Security Rules

- **No persistence**: Coordinates never stored in localStorage or cookies
- **Memory only**: Location data exists only in memory for current session
- **No PII collection**: No reverse geocoding or address lookup
- **Ephemeral data**: All location data cleared after use
- **Secure context**: Requires HTTPS for geolocation API access

## Error Codes

| Code | Description | Copy ID | Recovery Action |
|------|-------------|---------|-----------------|
| `GEO_DENIED` | User denied location permission | `note.geo_denied` | Show manual input options |
| `GEO_UNAVAILABLE` | Browser API unsupported or sensors off | `err.provider_unavailable` | Fallback to manual entry |
| `GEO_TIMEOUT` | Request exceeded timeout limit | `err.geo_timeout` | Retry with longer timeout |
| `GEO_ERROR` | Unknown geolocation error | `err.provider_unavailable` | Show error message |
| `INVALID_COORDINATES` | Invalid lat/lng values | `err.invalid_coordinates` | Request valid coordinates |
| `OUT_OF_AREA` | Outside 25km service radius | `err.out_of_area` | Show manual station selection |
| `VALIDATION_ERROR` | General validation failure | `err.provider_unavailable` | Retry or use manual input |

## Type Guards and Validation

```typescript
// Type guard for Coordinates validation
function isCoordinates(value: unknown): value is Coordinates;

// Type guard for Latitude validation
function isLatitude(value: unknown): value is Latitude;

// Type guard for Longitude validation
function isLongitude(value: unknown): value is Longitude;

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
// Create branded Coordinates with validation
function createCoordinates(lat: number, lng: number): Coordinates;

// Create branded Latitude with validation
function createLatitude(lat: number): Latitude;

// Create branded Longitude with validation
function createLongitude(lng: number): Longitude;

// Calculate distance between two coordinates
function calculateDistance(
  from: Coordinates,
  to: Coordinates
): Kilometers;

// Check if coordinates are within service area
function isWithinServiceArea(coordinates: Coordinates): boolean;
```

## Example Usage

```typescript
// Request current location with type safety
const result = await requestCurrentLocation({
  enableHighAccuracy: true,
  timeout: 8000 as Milliseconds,
  maximumAge: 300000 as Milliseconds,
});

// Type-safe error handling
if (isSuccessResponse(result)) {
  const geolocationResult = result.data; // Type: GeolocationResult
  const location = geolocationResult.location; // Type: Location
  console.log(`Location: ${location.coordinates.lat}, ${location.coordinates.lng}`);
  
  // Validate service area
  const validation = validateServiceArea(location.coordinates);
  if (isSuccessResponse(validation) && validation.data.isValid) {
    console.log('Within service area');
  } else {
    console.log('Outside service area');
  }
} else {
  const error = result.error; // Type: GeolocationErrorCode
  const errorInfo = formatGeoError(error);
  console.error(`Error: ${errorInfo.id} - ${errorInfo.defaultMessage}`);
}

// Create coordinates with validation
const coords = createCoordinates(23.7779, 90.3971);
const distance = calculateDistance(coords, DHAKA_CENTROID);
console.log(`Distance: ${distance} km`);
```

---

*This contract ensures secure, privacy-first geolocation operations with strict type safety and comprehensive error handling for the Metro Station Finder application.*
