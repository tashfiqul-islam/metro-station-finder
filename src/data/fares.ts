import * as v from "valibot";

import { STATIONS } from "@/data/stations";
import { parseOrThrow } from "@/lib/validation";

// ─── Schema ───────────────────────────────────────────────────────────────────

const FareRowSchema = v.pipe(
  v.array(
    v.pipe(v.number(), v.integer("Fare must be an integer"), v.minValue(0, "Fare must be >= 0")),
  ),
  v.length(17, "Each fare row must have exactly 17 entries"),
);

const FareMatrixSchema = v.pipe(
  v.array(FareRowSchema),
  v.length(17, "Fare matrix must have exactly 17 rows"),
  v.check(
    (matrix) => matrix.every((row, i) => row[i] === 0),
    "Diagonal must be zero (same-station fare = 0)",
  ),
  v.check(
    (matrix) => matrix.every((row, i) => row.every((fare, j) => fare === matrix.at(j)?.at(i))),
    "Fare matrix must be symmetric (fare[a][b] === fare[b][a])",
  ),
);

// ─── Data ─────────────────────────────────────────────────────────────────────
// Row/column index = station.orderIndex - 1 (0-based).
// Source: DMTCL official fare card.
// Invariants: symmetric, diagonal zero, all values non-negative integers (BDT).

const FARE_MATRIX_DATA: number[][] = [
  // 0:uttara-north
  [0, 20, 30, 40, 50, 50, 60, 60, 70, 80, 80, 90, 90, 100, 100, 100, 100],
  // 1:uttara-center
  [20, 0, 20, 30, 40, 50, 50, 60, 60, 70, 80, 80, 90, 90, 100, 100, 100],
  // 2:uttara-south
  [30, 20, 0, 20, 30, 40, 40, 50, 50, 60, 70, 70, 80, 80, 90, 90, 100],
  // 3:pallabi
  [40, 30, 20, 0, 20, 30, 30, 40, 40, 50, 60, 60, 70, 70, 80, 80, 90],
  // 4:mirpur-11
  [50, 40, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50, 60, 60, 70, 70, 80],
  // 5:mirpur-10
  [50, 50, 40, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50, 60, 60, 70, 70],
  // 6:kazipara
  [60, 50, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50, 60, 60, 70],
  // 7:shewrapara
  [60, 60, 50, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50, 60, 60],
  // 8:agargaon
  [70, 60, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50, 60],
  // 9:bijoy-sarani
  [80, 70, 60, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40, 50, 50],
  // 10:farmgate
  [80, 80, 70, 60, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40, 50],
  // 11:karwan-bazar
  [90, 80, 70, 60, 50, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30, 40, 40],
  // 12:shahbagh
  [90, 90, 80, 70, 60, 50, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30, 40],
  // 13:dhaka-university
  [100, 90, 80, 70, 60, 60, 50, 50, 40, 40, 30, 30, 20, 0, 20, 30, 30],
  // 14:bangladesh-secretariat
  [100, 100, 90, 80, 70, 60, 60, 50, 50, 40, 40, 30, 30, 20, 0, 20, 30],
  // 15:motijheel
  [100, 100, 90, 80, 70, 70, 60, 60, 50, 50, 40, 40, 30, 30, 20, 0, 20],
  // 16:kamalapur
  [100, 100, 100, 90, 80, 70, 70, 60, 60, 50, 50, 40, 40, 30, 30, 20, 0],
];

// Assert invariants at module load.
export const FARE_MATRIX: readonly (readonly number[])[] = parseOrThrow(
  FareMatrixSchema,
  FARE_MATRIX_DATA,
);

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Returns the fare (BDT) between two stations by their slugs.
 * Returns 0 for same-station.
 * Returns undefined for unknown slugs — callers should throw `InvalidStationError`.
 */
export const lookupFare = (fromSlug: string, toSlug: string): number | undefined => {
  const from = STATIONS.find((s) => s.slug === fromSlug);
  const to = STATIONS.find((s) => s.slug === toSlug);

  if (!from || !to) {
    return undefined;
  }

  const row = FARE_MATRIX.at(from.orderIndex - 1);
  return row?.at(to.orderIndex - 1);
};
