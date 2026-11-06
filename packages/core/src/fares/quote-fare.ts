import type { StationId } from "../stations/station.ts";
import type { FareTable } from "./fare-matrix.ts";
import { createFare } from "./fare.ts";
import type { FareResult } from "./fare.ts";

/** Fare between two stations; any gap or malformed cell is `unknown-fare`, never zero. */
export function findFare(table: FareTable, from: StationId, to: StationId): FareResult {
  const row = table.order.indexOf(from);
  const column = table.order.indexOf(to);
  if (row < 0 || column < 0) return { kind: "unknown-fare", reason: "unknown-station" };
  const amount = table.amounts[row]?.[column];
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
    return { kind: "unknown-fare", reason: "no-fare-entry" };
  return { kind: "fare", fare: createFare(amount) };
}
