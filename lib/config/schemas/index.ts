/**
 * Zod Validation Schemas for Metro Station Finder
 *
 * Production-ready validation schemas following strict TypeScript patterns and Zod v4 best practices.
 * Uses simple error messages, proper branded types, and follows project linting rules.
 *
 * @fileoverview Runtime validation schemas with strict TypeScript patterns
 * @version 1.0.0
 * @since 2025-09-29
 *
 * @example
 * ```typescript
 * // Parse and validate station data
 * const station = StationSchema.parse(untrustedData);
 *
 * // Safe parse with error handling
 * const result = StationSchema.safeParse(untrustedData);
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */

import { z } from "zod";
import {
  COORDINATE_BOUNDS,
  FARE_CONSTANTS,
  STATION_CONSTANTS,
  VALIDATION_PATTERNS,
} from "@/lib/config/constants";

/**
 * Station name maximum length constant
 */
const STATION_NAME_MAX_LENGTH = 100;

/**
 * Latitude schema with WGS84 bounds (-90 to 90)
 */
export const LatitudeSchema = z
  .number()
  .gte(COORDINATE_BOUNDS.latitudeMin)
  .lte(COORDINATE_BOUNDS.latitudeMax)
  .brand<"Latitude">();

/**
 * Longitude schema with WGS84 bounds (-180 to 180)
 */
export const LongitudeSchema = z
  .number()
  .gte(COORDINATE_BOUNDS.longitudeMin)
  .lte(COORDINATE_BOUNDS.longitudeMax)
  .brand<"Longitude">();

/**
 * Geographic coordinates
 */
export const CoordinatesSchema = z
  .object({
    lat: LatitudeSchema,
    lng: LongitudeSchema,
  })
  .readonly();

/**
 * Station ID with pattern validation
 */
export const StationIdSchema = z
  .string("Station ID must be a string")
  .min(1, "Station ID cannot be empty")
  .regex(VALIDATION_PATTERNS.stationIdPattern, "Invalid station ID format")
  .brand<"StationId">();

/**
 * Taka amount (non-negative integer)
 */
export const TakaAmountSchema = z.number().int().nonnegative().brand<"TakaAmount">();

/**
 * Distance in meters
 */
export const MetersSchema = z.number().nonnegative().brand<"Meters">();

/**
 * Distance in kilometers
 */
export const KilometersSchema = z.number().nonnegative().brand<"Kilometers">();

/**
 * Time in minutes
 */
export const MinutesSchema = z.number().nonnegative().brand<"Minutes">();

/**
 * Unix timestamp in milliseconds
 */
export const MillisecondsSchema = z.number().int().nonnegative().brand<"Milliseconds">();

/**
 * Google Place ID
 */
export const PlaceIdSchema = z
  .string("Place ID must be a string")
  .min(1, "Place ID cannot be empty")
  .brand<"PlaceId">();

/**
 * Fare ID
 */
export const FareIdSchema = z
  .string("Fare ID must be a string")
  .min(1, "Fare ID cannot be empty")
  .brand<"FareId">();

/**
 * Discount ID
 */
export const DiscountIdSchema = z
  .string("Discount ID must be a string")
  .min(1, "Discount ID cannot be empty")
  .brand<"DiscountId">();

/**
 * Station status
 */

const StationStatusSchema = z.enum([
  "operational",
  "under-construction",
  "planned",
  "maintenance",
  "closed",
]);

const MetroLineSchema = z.enum(["mrt-6", "mrt-1", "mrt-2"]);

const AmenityStateSchema = z.enum(["verified", "unverified", "pending"]);

export const StationAmenitiesSchema = z
  .object({
    elevator: z.boolean(),
    escalator: z.boolean(),
    wheelchair: z.boolean(),
    parking: z.boolean(),
    restroom: z.boolean(),
    atm: z.boolean().optional(),
    wifi: z.boolean().optional(),
    charging: z.boolean().optional(),
    food: z.boolean().optional(),
    shop: z.boolean().optional(),
    state: AmenityStateSchema.default("unverified"),
    lastVerified: MillisecondsSchema.optional(),
    confidence: z.number().min(0).max(1).default(0),
  })
  .strict();

const AccessibilityLevelSchema = z.enum(["full", "partial", "limited", "none"]);

const OperatingHoursSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default("Asia/Dhaka"),
  })
  .strict();

const ContactInfoSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
  })
  .strict();

const SocialMediaSchema = z
  .object({
    facebook: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
  })
  .strict();

const StationMetadataSchema = z
  .object({
    description: z.string().optional(),
    capacity: z.number().int().positive().optional(),
    platformCount: z.number().int().positive().optional(),
    entranceCount: z.number().int().positive().optional(),
    exitCount: z.number().int().positive().optional(),
    accessibilityLevel: AccessibilityLevelSchema.default("limited"),
    operatingHours: OperatingHoursSchema.optional(),
    contactInfo: ContactInfoSchema.optional(),
    socialMedia: SocialMediaSchema.optional(),
    tags: z.array(z.string()).default([]),
    lastMaintenance: MillisecondsSchema.optional(),
    nextMaintenance: MillisecondsSchema.optional(),
  })
  .strict()
  .optional();

const StationStateSchema = z.enum(["active", "inactive", "archived", "pending"]);

export const StationSchema = z
  .object({
    id: StationIdSchema,
    name: z.string().min(1).max(STATION_NAME_MAX_LENGTH),
    coordinates: CoordinatesSchema,
    amenities: StationAmenitiesSchema,
    status: StationStatusSchema.default("operational"),
    line: MetroLineSchema,
    order: z
      .number()
      .int()
      .positive()
      .min(STATION_CONSTANTS.minOrder)
      .max(STATION_CONSTANTS.maxOrder),
    aliases: z.array(z.string()).default([]),
    createdAt: MillisecondsSchema,
    updatedAt: MillisecondsSchema,
    version: z.string().min(1).default(STATION_CONSTANTS.defaultVersion),
    hash: z.string().min(1),
    state: StationStateSchema.default("active"),
    metadata: StationMetadataSchema,
  })
  .strict()
  .refine((data) => data.updatedAt >= data.createdAt, {
    message: "Updated timestamp must be after created timestamp",
    path: ["updatedAt"],
  });

/**
 * Fare schemas
 */

const DiscountTypeSchema = z.enum(["single-journey", "mrt-pass", "rapid-pass"]);

const DiscountStateSchema = z.enum(["active", "expired", "revoked"]);

const FareCalculationStatusSchema = z.enum(["calculated", "pending", "error"]);

const FareStateSchema = z.enum(["calculated", "pending", "confirmed", "cancelled"]);

export const FareBreakdownSchema = z
  .object({
    id: z.string().min(1),
    baseFare: TakaAmountSchema,
    discountAmount: TakaAmountSchema,
    finalAmount: TakaAmountSchema,
    components: z.record(z.string(), TakaAmountSchema).default({}),
    calculatedAt: MillisecondsSchema,
    status: FareCalculationStatusSchema.default("calculated"),
  })
  .strict()
  .refine((data) => data.finalAmount === data.baseFare - data.discountAmount, {
    message: "Final amount must equal base fare minus discount",
    path: ["finalAmount"],
  })
  .refine((data) => data.discountAmount <= data.baseFare, {
    message: "Discount cannot exceed base fare",
    path: ["discountAmount"],
  });

const DiscountInfoSchema = z
  .object({
    id: DiscountIdSchema,
    type: DiscountTypeSchema,
    amount: TakaAmountSchema,
    rate: z.number().min(0).max(1),
    appliedAt: MillisecondsSchema,
    validUntil: MillisecondsSchema.optional(),
    state: DiscountStateSchema.default("active"),
  })
  .strict()
  .refine(
    (data) => {
      if (data.validUntil !== undefined) {
        return data.validUntil > data.appliedAt;
      }
      return true;
    },
    {
      message: "Valid until must be after applied at",
      path: ["validUntil"],
    }
  );

const RouteInfoSchema = z
  .object({
    stations: z.array(StationIdSchema).min(2),
    transfers: z.literal(0),
  })
  .strict();

export const FareSchema = z
  .object({
    id: FareIdSchema,
    origin: StationIdSchema,
    destination: StationIdSchema,
    amount: TakaAmountSchema,
    travelTime: MinutesSchema,
    distance: KilometersSchema,
    route: RouteInfoSchema,
    discount: DiscountInfoSchema.optional(),
    breakdown: FareBreakdownSchema,
    state: FareStateSchema.default("calculated"),
    createdAt: MillisecondsSchema,
    updatedAt: MillisecondsSchema,
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()
  .refine((data) => data.origin !== data.destination, {
    message: "Origin and destination must be different",
    path: ["destination"],
  })
  .refine((data) => data.amount >= FARE_CONSTANTS.minFare, {
    message: `Fare cannot be less than minimum (${FARE_CONSTANTS.minFare} Tk)`,
    path: ["amount"],
  })
  .refine((data) => data.amount <= FARE_CONSTANTS.maxFare, {
    message: `Fare cannot exceed maximum (${FARE_CONSTANTS.maxFare} Tk)`,
    path: ["amount"],
  });

/**
 * Geolocation schemas
 */

const LocationSourceSchema = z.enum(["geolocation", "manual", "search", "places", "cached"]);

const GeolocationStatusSchema = z.enum(["success", "error", "timeout"]);

const GeolocationErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    browserCode: z.number().int().positive().optional(),
    hint: z.string().optional(),
  })
  .strict();

export const GeolocationResultSchema = z
  .object({
    id: z.string().min(1),
    coordinates: CoordinatesSchema,
    accuracy: MetersSchema,
    timestamp: MillisecondsSchema,
    source: LocationSourceSchema,
    sessionId: z.string().optional(),
    status: GeolocationStatusSchema,
    error: GeolocationErrorSchema.optional(),
    processingTime: MillisecondsSchema,
  })
  .strict()
  .refine(
    (data) => {
      if (data.status === "error") {
        return data.error !== undefined;
      }
      return true;
    },
    {
      message: "Error details required when status is error",
      path: ["error"],
    }
  );

/**
 * Google places schemas
 */

const MatchedSubstringSchema = z
  .object({
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
  })
  .strict();

const StructuredFormattingSchema = z
  .object({
    mainText: z.string().min(1),
    mainTextMatchedSubstrings: z.array(MatchedSubstringSchema).default([]),
    secondaryText: z.string().default(""),
    secondaryTextMatchedSubstrings: z.array(MatchedSubstringSchema).default([]),
  })
  .strict();

const PlaceTermSchema = z
  .object({
    offset: z.number().int().nonnegative(),
    value: z.string().min(1),
  })
  .strict();

export const PlacePredictionSchema = z
  .object({
    placeId: PlaceIdSchema,
    description: z.string().min(1),
    structuredFormatting: StructuredFormattingSchema,
    terms: z.array(PlaceTermSchema).min(1),
    types: z.array(z.string()).default([]),
    matchedSubstrings: z.array(MatchedSubstringSchema).default([]),
    reference: z.string().optional(),
    distanceMeters: MetersSchema.optional(),
  })
  .strict();

/**
 * Type inference
 */

export type StationInput = z.infer<typeof StationSchema>;
export type FareInput = z.infer<typeof FareSchema>;
export type GeolocationResultInput = z.infer<typeof GeolocationResultSchema>;
export type PlacePredictionInput = z.infer<typeof PlacePredictionSchema>;

/**
 * Validation result type
 */

export type ValidationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: z.ZodError<T> };

/**
 * Parser functions
 */

export function parseStation(value: unknown): ValidationResult<StationInput> {
  const result = StationSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function parseFare(value: unknown): ValidationResult<FareInput> {
  const result = FareSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function parseGeolocationResult(value: unknown): ValidationResult<GeolocationResultInput> {
  const result = GeolocationResultSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function parsePlacePrediction(value: unknown): ValidationResult<PlacePredictionInput> {
  const result = PlacePredictionSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Type guards
 */

export function isStationInput(value: unknown): value is StationInput {
  return StationSchema.safeParse(value).success;
}

export function isFareInput(value: unknown): value is FareInput {
  return FareSchema.safeParse(value).success;
}

export function isGeolocationResultInput(value: unknown): value is GeolocationResultInput {
  return GeolocationResultSchema.safeParse(value).success;
}

export function isPlacePredictionInput(value: unknown): value is PlacePredictionInput {
  return PlacePredictionSchema.safeParse(value).success;
}

/**
 * Validator factory
 */

export type SchemaValidator<T> = {
  readonly parse: (value: unknown) => ValidationResult<T>;
  readonly is: (value: unknown) => value is T;
  readonly schema: z.ZodSchema<T>;
};

export function createSchemaValidators() {
  return Object.freeze({
    station: Object.freeze({
      parse: parseStation,
      is: isStationInput,
      schema: StationSchema,
    } satisfies SchemaValidator<StationInput>),

    fare: Object.freeze({
      parse: parseFare,
      is: isFareInput,
      schema: FareSchema,
    } satisfies SchemaValidator<FareInput>),

    geolocation: Object.freeze({
      parse: parseGeolocationResult,
      is: isGeolocationResultInput,
      schema: GeolocationResultSchema,
    } satisfies SchemaValidator<GeolocationResultInput>),

    places: Object.freeze({
      parse: parsePlacePrediction,
      is: isPlacePredictionInput,
      schema: PlacePredictionSchema,
    } satisfies SchemaValidator<PlacePredictionInput>),
  } as const);
}

export const validators = createSchemaValidators();

/**
 * Error formatting
 */

export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return `${path ? `${path}: ` : ""}${issue.message}`;
    })
    .join("; ");
}

export function getFirstErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (firstIssue === undefined) {
    return "Validation failed";
  }
  return firstIssue.message;
}
