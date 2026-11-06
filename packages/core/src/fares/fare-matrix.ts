import type { StationId } from "../stations/station.ts";

/** Square matrix: `amounts[i][j]` is the fare from `order[i]` to `order[j]`. */
export interface FareTable {
  readonly order: readonly StationId[];
  readonly amounts: readonly (readonly number[])[];
}
