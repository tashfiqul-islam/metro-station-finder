# Fare Calculation Functions Interface

**Date**: 2025-09-27
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Overview

This interface defines the client-side functions for fare calculation operations in the Metro Station Finder application. All calculations are client-side with static fare rules - **NO backend APIs in Phase 1**.

## Implementation Status ✅

**Phase 2 Complete**: Type definitions and static data have been implemented.

### Type Definitions

- **Fare Types**: `lib/types/fare.ts` - Complete fare calculation and ticket type definitions
- **Core Types**: `lib/types/index.ts` - Branded types and Result patterns

### Static Data

- **Fare Data**: `lib/data/fares.ts` - Complete MRT-6 fare matrix and pricing rules
- **Constants**: `lib/constants.ts` - Centralized fare constants and validation rules

### Key Features

- ✅ **Complete Fare Matrix**: 17×17 station fare matrix with all pricing rules
- ✅ **Discount System**: MRT Pass, Rapid Pass, and Single Journey ticket types
- ✅ **Type Safety**: Branded types for TakaAmount, FareId, DiscountId, etc.
- ✅ **Validation**: Comprehensive fare validation with error handling

## Client-Side Functions

### calculateFare(origin, destination, discount?)

Calculate fare between two stations using local data with strict type safety.

**Function Signature**:

```typescript
function calculateFare(
  origin: StationId,
  destination: StationId,
  discount?: {
    readonly type: DiscountType;
  }
): ApiResponse<Fare, 'INVALID_STATIONS' | 'CALCULATION_ERROR' | 'INVALID_DISCOUNT'>;
```

**Type Constraints**:

- `origin` and `destination` must be valid `StationId` branded types
- `discount.type` must be one of the strict union values
- Returns `Result<Fare, FareErrorCode>` pattern
- All properties are `readonly` for immutability

### getRoute(origin, destination)

Get route information between two stations using local data with strict typing.

**Function Signature**:

```typescript
function getRoute(
  origin: StationId,
  destination: StationId
): ApiResponse<Route, 'INVALID_STATIONS' | 'ROUTE_ERROR'>;
```

**Type Constraints**:

- Both parameters must be valid `StationId` branded types
- Returns `Result<Route, FareErrorCode>` pattern
- Route includes complete station objects, not just IDs
- All arrays are `readonly` for immutability

### getFareRules()

Get fare calculation rules and pricing information from local data with strict typing.

**Function Signature**:

```typescript
function getFareRules(): SuccessResponse<FareRules>;
```

**Type Constraints**:

- Returns `SuccessResponse<FareRules>` (never fails)
- All fare amounts use `TakaAmount` branded type
- Base fares stored as `ReadonlyMap` for O(1) lookup
- All properties are `readonly` for immutability

### Type Guards and Validation

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

### Utility Functions

```typescript
// Create branded StationId with validation
function createStationId(id: string): StationId;

// Create TakaAmount with validation
function createTakaAmount(amount: number): TakaAmount;

// Safe JSON parse with Zod validation
function safeJsonParse<T>(
  json: string,
  schema: z.ZodSchema<T>
): Result<T, 'PARSE_ERROR'>;
```

## Data Types

### Core Domain Types

```typescript
// Branded types for type safety at boundaries
type StationId = string & { readonly __brand: 'StationId' };
type TakaAmount = number & { readonly __brand: 'TakaAmount' };
type Minutes = number & { readonly __brand: 'Minutes' };
type Kilometers = number & { readonly __brand: 'Kilometers' };

// Strict coordinate type
interface Coordinates {
  readonly lat: number;
  readonly lng: number;
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

// Discount type with strict union
type DiscountType = 'single-journey' | 'mrt-pass' | 'rapid-pass';

// Error codes as const for type safety
const FARE_ERROR_CODES = {
  INVALID_STATIONS: 'INVALID_STATIONS',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  INVALID_DISCOUNT: 'INVALID_DISCOUNT',
  ROUTE_ERROR: 'ROUTE_ERROR',
} as const;

type FareErrorCode = typeof FARE_ERROR_CODES[keyof typeof FARE_ERROR_CODES];
```

### Result Pattern Implementation

```typescript
// Standard Result pattern for error handling
type Result<T, E = FareErrorCode> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E; readonly message: string };

// Success response with metadata
interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: {
    readonly calculationTime: number;
    readonly version: string;
  };
}

// Error response with structured error info
interface ErrorResponse<E extends FareErrorCode = FareErrorCode> {
  readonly success: false;
  readonly error: {
    readonly code: E;
    readonly message: string;
    readonly hint?: string;
  };
}

// Union type for all API responses
type ApiResponse<T, E extends FareErrorCode = FareErrorCode> = 
  | SuccessResponse<T>
  | ErrorResponse<E>;
```

### Fare Data Structures

```typescript
// Enhanced fare breakdown with modern TypeScript 2025 patterns
interface FareBreakdown {
  readonly id: FareId;
  readonly baseFare: TakaAmount;
  readonly discountAmount: TakaAmount;
  readonly finalAmount: TakaAmount;
  readonly components: FareComponents;
  readonly calculatedAt: Milliseconds;
  readonly status: "calculated" | "pending" | "confirmed";
}

// Fare components for detailed breakdown
interface FareComponents {
  readonly baseFare: TakaAmount;
  readonly distanceFare: TakaAmount;
  readonly timeFare: TakaAmount;
  readonly discountAmount: TakaAmount;
  readonly finalAmount: TakaAmount;
}

// Enhanced discount information
interface DiscountInfo {
  readonly id: DiscountId;
  readonly type: DiscountType;
  readonly amount: TakaAmount;
  readonly rate: number; // 0.10 for 10%
  readonly appliedAt: Milliseconds;
  readonly state: "active" | "expired" | "revoked";
}

// Route information
interface RouteInfo {
  readonly stations: readonly StationId[];
  readonly transfers: 0; // Phase 1 constant
}

// Main Fare interface with modern TypeScript 2025 patterns
interface Fare {
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
}

// Fare metadata for additional information
interface FareMetadata {
  readonly calculationMethod: "static" | "dynamic";
  readonly dataVersion: string;
  readonly lastUpdated: Milliseconds;
  readonly source: "mrt6_fare_matrix";
  readonly confidence: number;
}

// Additional branded types for fare system
type FareId = string & { readonly __brand: "FareId" };
type DiscountId = string & { readonly __brand: "DiscountId" };

// Route with complete information
interface Route {
  readonly origin: Station;
  readonly destination: Station;
  readonly stations: readonly Station[];
  readonly fare: Fare;
  readonly travelTime: Minutes;
  readonly distance: Kilometers;
  readonly transfers: 0; // Phase 1 constant
  readonly line: 'mrt-6';
  readonly instructions: readonly string[];
}

// Fare rules with strict typing
interface FareRules {
  readonly version: string;
  readonly lastUpdated: string;
  readonly minFare: TakaAmount;
  readonly maxFare: TakaAmount;
  readonly discounts: {
    readonly mrtPass: number;
    readonly rapidPass: number;
    readonly singleJourney: 0;
  };
  readonly baseFares: ReadonlyMap<`${StationId}-${StationId}`, TakaAmount>;
}
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

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_STATIONS` | Invalid origin or destination station ID |
| `CALCULATION_ERROR` | Fare calculation failed |
| `INVALID_DISCOUNT` | Invalid discount type |
| `ROUTE_ERROR` | Route calculation failed |

## Business Rules

### Fare Structure

- **Base Fare**: ৳20 (minimum)
- **Maximum Fare**: ৳100 (maximum)
- **Fare Range**: ৳20 - ৳100 based on distance traveled
- **Distance-based pricing**: Fares increase with distance between stations

### Distance-Based Fare Bands

| Distance Range | Regular Fare | MRT/Rapid Pass (10% off) | Example Routes |
|----------------|--------------|---------------------------|----------------|
| 1-2 stations | ৳20 | ৳18 | Uttara North → Uttara Center |
| 3-5 stations | ৳30-40 | ৳27-36 | Mirpur 10 → Farmgate |
| 6-10 stations | ৳50-70 | ৳45-63 | Agargaon → Shahbag |
| Full line (17 stations) | ৳100 | ৳90 | Uttara North → Kamalapur |
| Full operational line (16 stations) | ৳100 | ৳90 | Uttara North → Motijheel |

### Discounts

- **Single Journey Ticket**: 0% discount (full fare)
- **MRT Pass**: 10% discount on all fares
- **Rapid Pass**: 10% discount on all fares (same as MRT Pass)
- Only one discount type applies per calculation

### Travel Time Calculation

- **Time per segment**: 2.5 minutes between adjacent stations
- **Full operational line travel time**: ~38 minutes (15 segments × 2.5 min)
- **Full line travel time (including Kamalapur)**: ~40 minutes (16 segments × 2.5 min)
- **Calculation**: `segments × 2.5 minutes` (rounded to nearest minute)

### Fare Calculation Process

1. **Validate stations**: Ensure valid origin and destination IDs
2. **Calculate route**: Determine stations between origin and destination
3. **Lookup base fare**: Use distance-based fare table
4. **Apply discount**: Calculate discount amount (if applicable)
5. **Apply caps**: Ensure fare is between ৳20-৳100
6. **Round to integer**: Final fare in whole Taka

## Ticket Types

### Single Journey Ticket

- **One-time use only**
- **Valid until midnight** on purchase day
- **Available from**: TVMs and ticket counters
- **Discount**: 0% (full fare)
- **Maximum purchase**: 5 tickets at once from TVM

### MRT Pass

- **Reusable smart card**
- **Initial cost**: ৳500 (৳200 refundable deposit + ৳300 balance)
- **Validity**: 10 years
- **Discount**: 10% on all fares
- **Rechargeable**: Up to ৳10,000 balance
- **Where to buy**: Excess Fare Office (EFO) at any metro station

### Rapid Pass

- **Multi-modal smart card** (future-ready)
- **Initial cost**: ৳400 (৳200 refundable deposit + ৳200 balance)
- **Validity**: 10 years
- **Discount**: 10% on all fares (same as MRT Pass)
- **Where to buy**: Metro stations or DBBL branches
- **Future use**: Will work on buses and other public transport

## Implementation Notes

- All functions are client-side only (static data)
- Fare rules stored in TypeScript constants
- Calculations use pure functions for determinism
- Results cached for performance
- No real-time pricing (static data only)
- **No backend APIs in Phase 1** - all calculations run in the browser

## Validation Requirements

- **Fare accuracy**: 100% match with official DMTCL fare table
- **Discount calculations**: Exact 10% discount for MRT/Rapid Pass
- **Caps enforcement**: All fares between ৳20-৳100
- **Time calculations**: Consistent 2.5 min per segment
- **Distance calculations**: Accurate Haversine formula
- **Integer rounding**: All final fares in whole Taka

## Example Calculations

```typescript
// Uttara North → Motijheel (full operational line, 16 stations)
const result1 = calculateFare(
  createStationId('uttara-north'), 
  createStationId('motijheel'), 
  { type: 'single-journey' }
);
// Result: SuccessResponse<Fare> with:
// - amount: TakaAmount(100)
// - travelTime: Minutes(38)
// - discount: undefined
// - breakdown: { baseFare: 100, discountAmount: 0, finalAmount: 100 }

// Uttara North → Kamalapur (full line including under-construction, 17 stations)
const result2 = calculateFare(
  createStationId('uttara-north'), 
  createStationId('kamalapur'), 
  { type: 'single-journey' }
);
// Result: SuccessResponse<Fare> with:
// - amount: TakaAmount(100)
// - travelTime: Minutes(40)
// - discount: undefined
// - breakdown: { baseFare: 100, discountAmount: 0, finalAmount: 100 }

// Uttara North → Motijheel with MRT Pass (10% discount)
const result3 = calculateFare(
  createStationId('uttara-north'), 
  createStationId('motijheel'), 
  { type: 'mrt-pass' }
);
// Result: SuccessResponse<Fare> with:
// - amount: TakaAmount(90)
// - travelTime: Minutes(38)
// - discount: { type: 'mrt-pass', amount: TakaAmount(10), rate: 0.10 }
// - breakdown: { baseFare: 100, discountAmount: 10, finalAmount: 90 }

// Short distance: Uttara North → Uttara Center (2 stations)
const result4 = calculateFare(
  createStationId('uttara-north'), 
  createStationId('uttara-center'), 
  { type: 'single-journey' }
);
// Result: SuccessResponse<Fare> with:
// - amount: TakaAmount(20)
// - travelTime: Minutes(5)
// - discount: undefined
// - breakdown: { baseFare: 20, discountAmount: 0, finalAmount: 20 }

// Type-safe error handling
if (isSuccessResponse(result1)) {
  const fare = result1.data; // Type: Fare
  console.log(`Fare: ৳${fare.amount}`);
} else {
  const error = result1.error; // Type: FareErrorCode
  console.error(`Error: ${error.code} - ${error.message}`);
}
```

---

*This contract ensures accurate fare calculations based on official DMTCL pricing and ticket types for MRT Line 6.*
