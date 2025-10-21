/**
 * Fare Data Types for Metro Station Finder
 *
 * This module defines all types related to fare calculation, tickets,
 * discounts, and route information for the metro system.
 *
 * @fileoverview Fare-related type definitions
 * @version 1.0.0
 * @since 2025-09-28
 */

import { type DISCOUNT_TYPES, FARE_CONSTANTS, type TICKET_TYPES } from "@/lib/config/constants";
import type { Kilometers, Milliseconds, Minutes, StationId, TakaAmount } from "@/lib/types";
import type { Station } from "@/lib/types/station";

/**
 * Branded types for financial calculations
 */
export type FareId = string & { readonly __brand: "FareId" };
export type DiscountId = string & { readonly __brand: "DiscountId" };
export type TicketId = string & { readonly __brand: "TicketId" };

/**
 * Template literal types for fare operations
 */
export type FareOperation = `fare:${"calculate" | "validate" | "apply_discount" | "format"}`;
export type DiscountOperation = `discount:${"apply" | "remove" | "validate" | "calculate"}`;

/**
 * Discount type enumeration
 *
 * Represents the available discount types for metro fares.
 * Each type has different discount rates and eligibility.
 */
export type DiscountType = (typeof DISCOUNT_TYPES)[keyof typeof DISCOUNT_TYPES];

/**
 * Ticket type enumeration
 *
 * Represents the available ticket types for metro travel.
 * Each type has different characteristics and pricing.
 */
export type TicketType = (typeof TICKET_TYPES)[keyof typeof TICKET_TYPES];

/**
 * Discount information with discriminated unions
 *
 * Contains details about applied discounts including
 * type, amount, and percentage rate.
 */
export type DiscountInfo = {
  /** Unique discount identifier */
  readonly id: DiscountId;
  /** Type of discount applied */
  readonly type: DiscountType;
  /** Discount amount in Taka */
  readonly amount: TakaAmount;
  /** Discount rate as decimal (0.10 for 10%) */
  readonly rate: number;
  /** When the discount was applied */
  readonly appliedAt: Milliseconds;
  /** Discount validity period */
  readonly validUntil?: Milliseconds;
  /** Discriminated union for discount state */
  readonly state: "active" | "expired" | "revoked";
};

/**
 * Fare breakdown with utility types
 *
 * Detailed breakdown of fare calculation including
 * base fare, discounts, and final amount.
 */
export type FareBreakdown = {
  /** Unique breakdown identifier */
  readonly id: string;
  /** Base fare before discounts */
  readonly baseFare: TakaAmount;
  /** Total discount amount */
  readonly discountAmount: TakaAmount;
  /** Final fare after discounts */
  readonly finalAmount: TakaAmount;
  /** Template literal types for breakdown components */
  readonly components: {
    readonly [K in `component_${string}`]?: TakaAmount;
  };
  /** Calculation timestamp */
  readonly calculatedAt: Milliseconds;
  /** Discriminated union for calculation status */
  readonly status: "calculated" | "pending" | "error";
};

/**
 * Route information
 *
 * Contains route details including stations and transfers.
 * Phase 1 supports only direct routes with no transfers.
 */
export type RouteInfo = {
  /** Ordered list of station IDs in the route */
  readonly stations: readonly StationId[];
  /** Number of transfers required (0 for Phase 1) */
  readonly transfers: 0;
};

/**
 * Main Fare entity with advanced patterns
 *
 * Represents a complete fare calculation between two stations
 * including all pricing details and route information.
 */
export type Fare = {
  /** Unique fare identifier */
  readonly id: FareId;
  /** Origin station ID */
  readonly origin: StationId;
  /** Destination station ID */
  readonly destination: StationId;
  /** Final fare amount in Taka */
  readonly amount: TakaAmount;
  /** Estimated travel time in minutes */
  readonly travelTime: Minutes;
  /** Distance between stations in kilometers */
  readonly distance: Kilometers;
  /** Route information */
  readonly route: RouteInfo;
  /** Applied discount information (if any) */
  readonly discount?: DiscountInfo;
  /** Detailed fare breakdown */
  readonly breakdown: FareBreakdown;
  /** Discriminated union for fare state */
  readonly state: "calculated" | "pending" | "confirmed" | "cancelled";
  /** Creation timestamp */
  readonly createdAt: Milliseconds;
  /** Last updated timestamp */
  readonly updatedAt: Milliseconds;
  /** Template literal types for fare metadata */
  readonly metadata: {
    readonly [K in `fare_${string}`]?: unknown;
  };
};

/**
 * Complete Route entity
 *
 * Represents a complete route between two stations with
 * full station details and fare information.
 */
export type Route = {
  /** Origin station details */
  readonly origin: Station;
  /** Destination station details */
  readonly destination: Station;
  /** All stations in the route */
  readonly stations: readonly Station[];
  /** Fare information for this route */
  readonly fare: Fare;
  /** Total travel time */
  readonly travelTime: Minutes;
  /** Total distance */
  readonly distance: Kilometers;
  /** Number of transfers (0 for Phase 1) */
  readonly transfers: 0;
  /** Metro line identifier */
  readonly line: "mrt-6";
  /** Step-by-step directions */
  readonly instructions: readonly string[];
};

/**
 * Fare calculation rules
 *
 * Contains the fare calculation rules and pricing information
 * used for computing fares between stations.
 */
export type FareRules = {
  /** Data version for cache invalidation */
  readonly version: string;
  /** Last updated timestamp */
  readonly lastUpdated: string;
  /** Minimum fare amount */
  readonly minFare: TakaAmount;
  /** Maximum fare amount */
  readonly maxFare: TakaAmount;
  /** Discount rates for each ticket type */
  readonly discounts: {
    readonly mrtPass: number;
    readonly rapidPass: number;
    readonly singleJourney: 0;
  };
  /** Base fare lookup table */
  readonly baseFares: ReadonlyMap<`${StationId}-${StationId}`, TakaAmount>;
};

/**
 * Ticket information
 *
 * Details about different ticket types including
 * pricing, validity, and discount information.
 */
export type TicketInfo = {
  /** Ticket type identifier */
  readonly type: TicketType;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Initial cost (including deposit if applicable) */
  readonly initialCost: TakaAmount;
  /** Refundable deposit amount */
  readonly deposit?: TakaAmount;
  /** Discount rate applied to fares */
  readonly discountRate: number;
  /** Validity period in days */
  readonly validityDays: number;
  /** Maximum balance that can be loaded */
  readonly maxBalance?: TakaAmount;
  /** Whether the ticket is reusable */
  readonly reusable: boolean;
};

/**
 * Fare calculation options
 *
 * Configuration options for fare calculation operations.
 */
export type FareCalculationOptions = {
  /** Discount type to apply */
  readonly discountType?: DiscountType;
  /** Whether to round up final fare */
  readonly roundUp?: boolean;
  /** Include detailed breakdown */
  readonly includeBreakdown?: boolean;
  /** Calculation timestamp */
  readonly timestamp?: Milliseconds;
};

/**
 * Fare calculation result (legacy)
 *
 * Result of a fare calculation operation including
 * success/error status and calculated fare.
 */
export type LegacyFareCalculationResult = {
  /** Whether calculation was successful */
  readonly success: boolean;
  /** Calculated fare (if successful) */
  readonly fare?: Fare;
  /** Error message (if failed) */
  readonly error?: string;
  /** Calculation metadata */
  readonly metadata: {
    readonly processingTime: Milliseconds;
    readonly timestamp: Milliseconds;
  };
};

/**
 * Type guards for Fare types
 */

/**
 * Type guard for DiscountType
 *
 * @param value The value to check
 * @returns True if value is a valid DiscountType
 */
export function isDiscountType(value: unknown): value is DiscountType {
  return (
    typeof value === "string" &&
    (value === "single-journey" || value === "mrt-pass" || value === "rapid-pass")
  );
}

/**
 * Type guard for TicketType
 *
 * @param value The value to check
 * @returns True if value is a valid TicketType
 */
export function isTicketType(value: unknown): value is TicketType {
  return (
    typeof value === "string" &&
    (value === "single-journey" || value === "mrt-pass" || value === "rapid-pass")
  );
}

/**
 * Type guard for DiscountInfo
 *
 * @param value The value to check
 * @returns True if value is valid DiscountInfo
 */
export function isDiscountInfo(value: unknown): value is DiscountInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const discount = value as {
    type?: unknown;
    amount?: unknown;
    rate?: unknown;
  };

  return (
    "type" in value &&
    "amount" in value &&
    "rate" in value &&
    isDiscountType(discount.type) &&
    typeof discount.amount === "number" &&
    typeof discount.rate === "number" &&
    discount.rate >= 0 &&
    discount.rate <= 1
  );
}

/**
 * Type guard for FareBreakdown
 *
 * @param value The value to check
 * @returns True if value is valid FareBreakdown
 */
export function isFareBreakdown(value: unknown): value is FareBreakdown {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const breakdown = value as {
    baseFare?: unknown;
    discountAmount?: unknown;
    finalAmount?: unknown;
  };

  return (
    "baseFare" in value &&
    "discountAmount" in value &&
    "finalAmount" in value &&
    typeof breakdown.baseFare === "number" &&
    typeof breakdown.discountAmount === "number" &&
    typeof breakdown.finalAmount === "number" &&
    breakdown.baseFare >= 0 &&
    breakdown.discountAmount >= 0 &&
    breakdown.finalAmount >= 0
  );
}

/**
 * Type guard for Fare
 *
 * @param value The value to check
 * @returns True if value is a valid Fare
 */
export function isFare(value: unknown): value is Fare {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const fare = value as {
    origin?: unknown;
    destination?: unknown;
    amount?: unknown;
    travelTime?: unknown;
    distance?: unknown;
    route?: unknown;
    breakdown?: unknown;
    discount?: unknown;
  };

  return (
    "origin" in value &&
    "destination" in value &&
    "amount" in value &&
    "travelTime" in value &&
    "distance" in value &&
    "route" in value &&
    "breakdown" in value &&
    typeof fare.origin === "string" &&
    typeof fare.destination === "string" &&
    typeof fare.amount === "number" &&
    typeof fare.travelTime === "number" &&
    typeof fare.distance === "number" &&
    isFareBreakdown(fare.breakdown) &&
    (fare.discount === undefined || isDiscountInfo(fare.discount))
  );
}

/**
 * Utility functions for Fare operations
 */

/**
 * Calculate discount amount
 *
 * @param baseFare The base fare amount
 * @param discountRate The discount rate (0-1)
 * @returns The discount amount
 */
export function calculateDiscountAmount(baseFare: TakaAmount, discountRate: number): TakaAmount {
  return Math.floor(baseFare * discountRate) as TakaAmount;
}

/**
 * Apply discount to fare
 *
 * @param baseFare The base fare amount
 * @param discountType The type of discount to apply
 * @returns The discounted fare amount
 */
export function applyDiscount(baseFare: TakaAmount, discountType: DiscountType): TakaAmount {
  const discountRates = {
    "single-journey": FARE_CONSTANTS.singleJourneyDiscount,
    "mrt-pass": FARE_CONSTANTS.mrtPassDiscount,
    "rapid-pass": FARE_CONSTANTS.rapidPassDiscount,
  };

  const discountRate = discountRates[discountType];
  const discountAmount = calculateDiscountAmount(baseFare, discountRate);

  return Math.max(FARE_CONSTANTS.minFare, baseFare - discountAmount) as TakaAmount;
}

/**
 * Calculate travel time between stations
 *
 * @param stationCount Number of stations in the route
 * @returns Travel time in minutes
 */
export function calculateTravelTime(stationCount: number): Minutes {
  return Math.ceil((stationCount - 1) * FARE_CONSTANTS.minutesPerSegment) as Minutes;
}

/**
 * Format fare amount for display
 *
 * @param amount The fare amount
 * @returns Formatted fare string
 */
export function formatFareAmount(amount: TakaAmount): string {
  return `৳${amount}`;
}

/**
 * Get ticket type display name
 *
 * @param ticketType The ticket type
 * @returns Display name for the ticket type
 */
export function getTicketTypeDisplayName(ticketType: TicketType): string {
  const displayNames = {
    "single-journey": "Single Journey Ticket",
    "mrt-pass": "MRT Pass",
    "rapid-pass": "Rapid Pass",
  };

  return displayNames[ticketType];
}

/**
 * Check if discount is available for ticket type
 *
 * @param ticketType The ticket type to check
 * @returns True if discount is available
 */
export function hasDiscount(ticketType: TicketType): boolean {
  return ticketType === "mrt-pass" || ticketType === "rapid-pass";
}

/**
 * Get discount rate for ticket type
 *
 * @param ticketType The ticket type
 * @returns Discount rate (0-1)
 */
export function getDiscountRate(ticketType: TicketType): number {
  const discountRates = {
    "single-journey": FARE_CONSTANTS.singleJourneyDiscount,
    "mrt-pass": FARE_CONSTANTS.mrtPassDiscount,
    "rapid-pass": FARE_CONSTANTS.rapidPassDiscount,
  };

  return discountRates[ticketType];
}

/**
 * Validate fare amount
 *
 * @param amount The fare amount to validate
 * @returns True if fare amount is valid
 */
export function isValidFareAmount(amount: TakaAmount): boolean {
  return (
    amount >= FARE_CONSTANTS.minFare && amount <= FARE_CONSTANTS.maxFare && Number.isInteger(amount)
  );
}

/**
 * Create fare breakdown
 *
 * @param baseFare Base fare amount
 * @param discountAmount Discount amount
 * @returns Fare breakdown object
 */
export function createFareBreakdown(
  baseFare: TakaAmount,
  discountAmount: TakaAmount
): FareBreakdown {
  return {
    id: `breakdown_${Date.now()}_${Math.random()
      .toString(FARE_CONSTANTS.base36)
      .slice(FARE_CONSTANTS.idStartIndex, FARE_CONSTANTS.idStartIndex + FARE_CONSTANTS.idLength)}`,
    baseFare,
    discountAmount,
    finalAmount: Math.max(FARE_CONSTANTS.minFare, baseFare - discountAmount) as TakaAmount,
    components: {},
    calculatedAt: Date.now() as Milliseconds,
    status: "calculated",
  };
}

/**
 * Advanced utility types for fare operations
 */

/**
 * Extract fare amount from fare object
 */
export type FareAmount<T extends Fare> = T["amount"];

/**
 * Extract discount information from fare object
 */
export type FareDiscount<T extends Fare> = T["discount"];

/**
 * Create partial fare for updates
 */
export type PartialFare = Partial<Pick<Fare, "state" | "updatedAt" | "metadata">>;

/**
 * Fare calculation strategy pattern
 */
export type FareCalculationStrategy = {
  readonly calculate: (baseFare: TakaAmount, options: FareCalculationOptions) => TakaAmount;
  readonly validate: (fare: Fare) => boolean;
  readonly applyDiscount: (fare: TakaAmount, discountType: DiscountType) => TakaAmount;
};

/**
 * Fare factory functions
 */
export const createFareId = (): FareId =>
  `fare_${Date.now()}_${Math.random()
    .toString(FARE_CONSTANTS.base36)
    .slice(
      FARE_CONSTANTS.idStartIndex,
      FARE_CONSTANTS.idStartIndex + FARE_CONSTANTS.idLength
    )}` as FareId;

export const createDiscountId = (): DiscountId =>
  `discount_${Date.now()}_${Math.random()
    .toString(FARE_CONSTANTS.base36)
    .slice(
      FARE_CONSTANTS.idStartIndex,
      FARE_CONSTANTS.idStartIndex + FARE_CONSTANTS.idLength
    )}` as DiscountId;

export const createTicketId = (): TicketId =>
  `ticket_${Date.now()}_${Math.random()
    .toString(FARE_CONSTANTS.base36)
    .slice(
      FARE_CONSTANTS.idStartIndex,
      FARE_CONSTANTS.idStartIndex + FARE_CONSTANTS.idLength
    )}` as TicketId;

/**
 * Fare validation with branded types
 */
export function validateFareAmount(amount: number): amount is TakaAmount {
  return (
    Number.isInteger(amount) && amount >= FARE_CONSTANTS.minFare && amount <= FARE_CONSTANTS.maxFare
  );
}

/**
 * Fare calculation with error handling
 */
export type FareCalculationResult<T = Fare> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

/**
 * Fare event types
 */
export type FareEvent<T = unknown> = {
  readonly type: FareOperation;
  readonly payload: T;
  readonly timestamp: Milliseconds;
  readonly fareId: FareId;
};

/**
 * Fare subscription types
 */
export type FareSubscription<T> = {
  readonly unsubscribe: () => void;
  readonly getValue: () => T;
  readonly subscribe: (callback: (value: T) => void) => void;
};

/**
 * Fare middleware types
 */
export type FareMiddleware<T> = (fare: T) => T;

export type FareMiddlewareChain<T> = readonly FareMiddleware<T>[];

/**
 * Fare performance metrics
 */
export type FarePerformanceMetrics = {
  readonly calculationTime: Milliseconds;
  readonly validationTime: Milliseconds;
  readonly totalTime: Milliseconds;
  readonly memoryUsage: number;
};

/**
 * Fare configuration types
 */
export type FareConfig = {
  readonly currency: string;
  readonly decimalPlaces: number;
  readonly roundingMethod: "floor" | "ceil" | "round";
  readonly enableCaching: boolean;
  readonly cacheTimeout: Milliseconds;
};

/**
 * Fare factory with configuration
 */
export const createFareFactory = (config: FareConfig) => ({
  createFare: (data: Omit<Fare, "id" | "createdAt" | "updatedAt">): Fare => ({
    ...data,
    id: createFareId(),
    createdAt: Date.now() as Milliseconds,
    updatedAt: Date.now() as Milliseconds,
  }),
  createDiscount: (data: Omit<DiscountInfo, "id" | "appliedAt">): DiscountInfo => ({
    ...data,
    id: createDiscountId(),
    appliedAt: Date.now() as Milliseconds,
  }),
  config,
});
