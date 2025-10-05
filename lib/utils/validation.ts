import { MRT6_FARE_CONSTANTS } from "@/lib/constants";
import MRT6_STATIONS from "@/lib/data/stations";
import type { Station } from "@/lib/types/station";

/**
 * Validate station invariants at module load. Throws in development if invalid.
 */
export function validateStationsData(stations: readonly Station[]): void {
  const ids = new Set<string>();
  const orders = new Set<number>();
  const aliasKeys = new Set<string>();
  for (const s of stations) {
    const id = s.id as unknown as string;
    if (ids.has(id)) {
      throw new Error(`Duplicate StationId: ${id}`);
    }
    ids.add(id);
    if (orders.has(s.order)) {
      throw new Error(`Duplicate station order: ${s.order}`);
    }
    orders.add(s.order);
    for (const a of s.aliases) {
      const key = a.toLowerCase();
      if (aliasKeys.has(key)) {
        throw new Error(`Alias collision: ${a}`);
      }
      aliasKeys.add(key);
    }
  }
}

/** Validate fare constants basic bounds. */
export function validateFaresConfig(): void {
  const { minFareAmount, maxFareAmount, validFareIncrements } =
    MRT6_FARE_CONSTANTS;
  if (!(minFareAmount >= 0 && maxFareAmount >= minFareAmount)) {
    throw new Error("Invalid fare bounds");
  }
  for (const inc of validFareIncrements) {
    if (inc < 0) {
      throw new Error("Invalid fare increment");
    }
  }
}

// Perform validation in development only
if (process.env.NODE_ENV !== "production") {
  validateStationsData(MRT6_STATIONS);
  validateFaresConfig();
}
