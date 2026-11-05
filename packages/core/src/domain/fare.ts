import type { StationId } from "./station.ts";

/** A fare amount in BDT. Zero is a real fare (same station); absence is `UnknownFare`. */
export interface Fare {
  readonly amount: number;
  readonly currency: "BDT";
}

/** Square matrix: `amounts[i][j]` is the fare from `order[i]` to `order[j]`. */
export interface FareTable {
  readonly order: readonly StationId[];
  readonly amounts: readonly (readonly number[])[];
}

/** Explicit "no fare". Deliberately has no amount field, so it can never read as zero. */
export interface UnknownFare {
  readonly kind: "unknown-fare";
  readonly reason: "unknown-station" | "no-fare-entry";
}

export type FareResult = { readonly kind: "fare"; readonly fare: Fare } | UnknownFare;

export function createFare(amount: number): Fare {
  if (!Number.isFinite(amount) || amount < 0)
    throw new RangeError("Fare must be a finite, non-negative amount");
  return { amount, currency: "BDT" };
}
