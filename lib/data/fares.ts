/**
 * MRT-6 Fare Data for Metro Station Finder
 *
 * This module contains the complete static fare data for MRT-6 stations in Dhaka,
 * including fare matrices, ticket types, discounts, and fare calculation utilities.
 * Implemented with modern TypeScript 2025 patterns and project architecture alignment.
 *
 * @fileoverview MRT-6 fare data with modern TypeScript 2025 patterns
 * @version 1.0.0
 * @since 2025-09-28
 */

import { MRT6_FARE_CONSTANTS } from "@/lib/constants";
import type {
  Kilometers,
  Milliseconds,
  Minutes,
  StationId,
  TakaAmount,
} from "@/lib/types";
import type {
  DiscountInfo,
  DiscountType,
  Fare,
  FareBreakdown,
} from "@/lib/types/fare";
import { createDiscountId, createFareId } from "@/lib/types/fare";

/**
 * MRT-6 Station fare matrix
 * Based on official DMTCL fare structure
 * Format: [from_station_index][to_station_index] = fare_amount
 */
const MRT6_FARE_MATRIX: readonly (readonly TakaAmount[])[] = [
  [
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare100,
    MRT6_FARE_CONSTANTS.fare100,
  ], // Uttara North
  [
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare90,
  ], // Uttara Center
  [
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare90,
  ], // Uttara South
  [
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
  ], // Pallabi
  [
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
  ], // Mirpur 11
  [
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
  ], // Mirpur 10
  [
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
  ], // Kazipara
  [
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
  ], // Shewrapara
  [
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
  ], // Agargaon
  [
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
  ], // Bijoy Sarani
  [
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
  ], // Farmgate
  [
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
  ], // Karwan Bazar
  [
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
  ], // Shahbagh
  [
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
  ], // Dhaka University
  [
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
  ], // Bangladesh Secretariat
  [
    MRT6_FARE_CONSTANTS.fare100,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
    MRT6_FARE_CONSTANTS.fare20,
  ], // Motijheel
  [
    MRT6_FARE_CONSTANTS.fare100,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare90,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare80,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare70,
    MRT6_FARE_CONSTANTS.fare60,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare50,
    MRT6_FARE_CONSTANTS.fare40,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare30,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare20,
    MRT6_FARE_CONSTANTS.fare0,
  ], // Kamalapur
] as const satisfies readonly (readonly TakaAmount[])[];

/**
 * Modern TypeScript 2025: Fare calculation utilities
 */

/**
 * Get station index from station name
 */
function getStationIndex(stationName: string): number {
  const index = MRT6_FARE_CONSTANTS.stationOrder.indexOf(
    stationName as (typeof MRT6_FARE_CONSTANTS.stationOrder)[number]
  );
  if (index === -1) {
    throw new Error(`Station "${stationName}" not found in fare matrix`);
  }
  return index;
}

/**
 * Calculate base fare between two stations
 */
export function calculateBaseFare(
  fromStation: string,
  toStation: string
): TakaAmount {
  const fromIndex = getStationIndex(fromStation);
  const toIndex = getStationIndex(toStation);

  if (fromIndex < 0 || fromIndex >= MRT6_FARE_CONSTANTS.matrixSize) {
    throw new Error(`Invalid from station index: ${fromIndex}`);
  }
  if (toIndex < 0 || toIndex >= MRT6_FARE_CONSTANTS.matrixSize) {
    throw new Error(`Invalid to station index: ${toIndex}`);
  }

  const fare = MRT6_FARE_MATRIX[fromIndex]?.[toIndex];
  if (fare === undefined) {
    throw new Error(`Fare not found for ${fromStation} to ${toStation}`);
  }

  return fare;
}

/**
 * Calculate discount amount based on discount type
 */
function calculateDiscountAmount(
  baseFare: TakaAmount,
  discountType: DiscountType
): TakaAmount {
  let discountRate: number;

  switch (discountType) {
    case "single-journey": {
      discountRate = MRT6_FARE_CONSTANTS.singleJourneyDiscountRate;
      break;
    }
    case "mrt-pass": {
      discountRate = MRT6_FARE_CONSTANTS.mrtPassDiscountRate;
      break;
    }
    case "rapid-pass": {
      discountRate = MRT6_FARE_CONSTANTS.rapidPassDiscountRate;
      break;
    }
    default: {
      discountRate = MRT6_FARE_CONSTANTS.singleJourneyDiscountRate;
      break;
    }
  }

  return Math.round(baseFare * discountRate) as TakaAmount;
}

/**
 * Calculate travel time between stations (2.5 minutes per segment)
 */
function calculateTravelTime(fromStation: string, toStation: string): number {
  const fromIndex = getStationIndex(fromStation);
  const toIndex = getStationIndex(toStation);
  const segments = Math.abs(toIndex - fromIndex);
  return Math.round(segments * MRT6_FARE_CONSTANTS.minutesPerSegment);
}

/**
 * Calculate distance between stations (approximate)
 */
function calculateDistance(fromStation: string, toStation: string): number {
  const fromIndex = getStationIndex(fromStation);
  const toIndex = getStationIndex(toStation);
  const segments = Math.abs(toIndex - fromIndex);
  return (
    Math.round(
      segments *
        MRT6_FARE_CONSTANTS.kilometersPerSegment *
        MRT6_FARE_CONSTANTS.percentageMultiplier
    ) / MRT6_FARE_CONSTANTS.percentageMultiplier
  );
}

/**
 * Create route information
 */
function createRouteInfo(
  fromStation: string,
  toStation: string
): { stations: readonly StationId[]; transfers: 0 } {
  const fromIndex = getStationIndex(fromStation);
  const toIndex = getStationIndex(toStation);

  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);

  const stations = MRT6_FARE_CONSTANTS.stationOrder
    .slice(startIndex, endIndex + 1)
    .map((station) => station as StationId);

  return {
    stations,
    transfers: 0 as const,
  };
}

/**
 * Calculate fare with discount type (as per contracts)
 */
export function calculateFare(
  fromStation: string,
  toStation: string,
  discountType: DiscountType = "single-journey"
): Fare {
  const baseFare = calculateBaseFare(fromStation, toStation);
  const discountAmount = calculateDiscountAmount(baseFare, discountType);
  const finalAmount = Math.max(
    MRT6_FARE_CONSTANTS.minFareAmount,
    Math.min(MRT6_FARE_CONSTANTS.maxFareAmount, baseFare - discountAmount)
  ) as TakaAmount;

  const travelTime = calculateTravelTime(fromStation, toStation);
  const distance = calculateDistance(fromStation, toStation);
  const route = createRouteInfo(fromStation, toStation);

  const breakdown: FareBreakdown = {
    id: createFareId(),
    baseFare,
    discountAmount,
    finalAmount,
    components: {},
    calculatedAt: Date.now() as Milliseconds,
    status: "calculated" as const,
  };

  const discount: DiscountInfo | undefined =
    discountType !== "single-journey"
      ? {
          id: createDiscountId(),
          type: discountType,
          amount: discountAmount,
          rate:
            discountType === "mrt-pass"
              ? MRT6_FARE_CONSTANTS.mrtPassDiscountRate
              : MRT6_FARE_CONSTANTS.rapidPassDiscountRate,
          appliedAt: Date.now() as Milliseconds,
          state: "active" as const,
        }
      : undefined;

  return {
    id: createFareId(),
    origin: fromStation as StationId,
    destination: toStation as StationId,
    amount: finalAmount,
    travelTime: travelTime as Minutes,
    distance: distance as Kilometers,
    route,
    discount,
    breakdown,
    state: "calculated" as const,
    createdAt: Date.now() as Milliseconds,
    updatedAt: Date.now() as Milliseconds,
    metadata: {},
  } as Fare;
}

/**
 * Get all possible fares from a station
 */
export function getFaresFromStation(
  fromStation: string
): readonly { toStation: string; fare: TakaAmount }[] {
  const fromIndex = getStationIndex(fromStation);
  const stationFares = MRT6_FARE_MATRIX[fromIndex];

  if (stationFares === undefined) {
    throw new Error(`Station fares not found for ${fromStation}`);
  }

  return MRT6_FARE_CONSTANTS.stationOrder.map((stationName, index) => ({
    toStation: stationName,
    fare: stationFares[index] as TakaAmount,
  }));
}

/**
 * Get all possible fares to a station
 */
export function getFaresToStation(
  toStation: string
): readonly { fromStation: string; fare: TakaAmount }[] {
  const toIndex = getStationIndex(toStation);

  return MRT6_FARE_CONSTANTS.stationOrder.map((stationName, index) => {
    const fare = MRT6_FARE_MATRIX[index]?.[toIndex];
    if (fare === undefined) {
      throw new Error(`Fare not found for ${stationName} to ${toStation}`);
    }
    return {
      fromStation: stationName,
      fare: fare as TakaAmount,
    };
  });
}

/**
 * Find stations within a fare budget
 */
export function findStationsWithinBudget(
  fromStation: string,
  maxFare: TakaAmount
): readonly { toStation: string; fare: TakaAmount }[] {
  const fares = getFaresFromStation(fromStation);
  return fares.filter(({ fare }) => fare <= maxFare);
}

/**
 * Get fare statistics
 */
export function getFareStatistics() {
  const allFares: TakaAmount[] = [];

  for (let i = 0; i < MRT6_FARE_CONSTANTS.matrixSize; i++) {
    for (let j = 0; j < MRT6_FARE_CONSTANTS.matrixSize; j++) {
      const fare = MRT6_FARE_MATRIX[i]?.[j];
      if (fare !== undefined) {
        allFares.push(fare);
      }
    }
  }

  const sortedFares = [...allFares].sort((a, b) => a - b);
  const uniqueFares = [...new Set(allFares)].sort((a, b) => a - b);

  return {
    totalFareCombinations: allFares.length,
    uniqueFareAmounts: uniqueFares.length,
    minFare: Math.min(...allFares),
    maxFare: Math.max(...allFares),
    averageFare:
      allFares.reduce((sum, fare) => sum + fare, 0) / allFares.length,
    medianFare: sortedFares[Math.floor(sortedFares.length / 2)],
    fareDistribution: uniqueFares.map((fare) => ({
      fare,
      count: allFares.filter((f) => f === fare).length,
      percentage:
        (allFares.filter((f) => f === fare).length / allFares.length) *
        MRT6_FARE_CONSTANTS.percentageMultiplier,
    })),
  };
}

/**
 * Check matrix dimensions
 */
function validateMatrixDimensions(): boolean {
  if (MRT6_FARE_MATRIX.length !== MRT6_FARE_CONSTANTS.matrixSize) {
    return false;
  }

  for (let i = 0; i < MRT6_FARE_CONSTANTS.matrixSize; i++) {
    const row = MRT6_FARE_MATRIX[i];
    if (row === undefined || row.length !== MRT6_FARE_CONSTANTS.matrixSize) {
      return false;
    }
  }

  return true;
}

/**
 * Check diagonal values (should be 0)
 */
function validateDiagonalValues(): boolean {
  for (let i = 0; i < MRT6_FARE_CONSTANTS.matrixSize; i++) {
    const row = MRT6_FARE_MATRIX[i];
    if (row === undefined || row[i] !== MRT6_FARE_CONSTANTS.fare0) {
      return false;
    }
  }

  return true;
}

/**
 * Check fare values are within valid range
 */
function validateFareValues(): boolean {
  for (let i = 0; i < MRT6_FARE_CONSTANTS.matrixSize; i++) {
    const row = MRT6_FARE_MATRIX[i];
    if (row === undefined) {
      return false;
    }

    for (let j = 0; j < MRT6_FARE_CONSTANTS.matrixSize; j++) {
      const fare = row[j];
      if (fare === undefined) {
        return false;
      }

      if (
        fare < MRT6_FARE_CONSTANTS.minFareAmount ||
        fare > MRT6_FARE_CONSTANTS.maxFareAmount
      ) {
        return false;
      }

      if (
        !MRT6_FARE_CONSTANTS.validFareIncrements.includes(
          fare as (typeof MRT6_FARE_CONSTANTS.validFareIncrements)[number]
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check matrix symmetry
 */
function validateMatrixSymmetry(): boolean {
  for (let i = 0; i < MRT6_FARE_CONSTANTS.matrixSize; i++) {
    for (let j = 0; j < MRT6_FARE_CONSTANTS.matrixSize; j++) {
      const fareAB = MRT6_FARE_MATRIX[i]?.[j];
      const fareBA = MRT6_FARE_MATRIX[j]?.[i];

      if (fareAB === undefined || fareBA === undefined || fareAB !== fareBA) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate fare matrix integrity
 */
export function validateFareMatrix(): boolean {
  return (
    validateMatrixDimensions() &&
    validateDiagonalValues() &&
    validateFareValues() &&
    validateMatrixSymmetry()
  );
}

/**
 * Get fare rules as per contracts
 */
export function getFareRules() {
  return {
    version: MRT6_FARE_CONSTANTS.dataVersion,
    lastUpdated: MRT6_FARE_CONSTANTS.lastUpdated,
    minFare: MRT6_FARE_CONSTANTS.minFareAmount as TakaAmount,
    maxFare: MRT6_FARE_CONSTANTS.maxFareAmount as TakaAmount,
    discounts: {
      mrtPass: MRT6_FARE_CONSTANTS.mrtPassDiscountRate,
      rapidPass: MRT6_FARE_CONSTANTS.rapidPassDiscountRate,
      singleJourney: MRT6_FARE_CONSTANTS.singleJourneyDiscountRate,
    },
    baseFares: new Map(
      MRT6_FARE_CONSTANTS.stationOrder.flatMap((fromStation, fromIndex) =>
        MRT6_FARE_CONSTANTS.stationOrder.map((toStation, toIndex) => [
          `${fromStation}-${toStation}` as const,
          MRT6_FARE_MATRIX[fromIndex]?.[toIndex] as TakaAmount,
        ])
      )
    ),
  };
}

/**
 * Modern TypeScript 2025: Fare data constants
 */
export const MRT6_FARE_DATA_CONSTANTS = {
  ...MRT6_FARE_CONSTANTS,
  matrixHash: JSON.stringify(MRT6_FARE_MATRIX),
  lastValidated: Date.now() as Milliseconds,
  validationPassed: validateFareMatrix(),
} as const satisfies Record<
  string,
  | string
  | number
  | TakaAmount
  | Milliseconds
  | boolean
  | readonly string[]
  | readonly number[]
>;

/**
 * Export default fare matrix for easy access
 */
export default MRT6_FARE_MATRIX;
