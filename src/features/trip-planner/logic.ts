import type { LngLat, Mrt6LineFeature } from "@/data/mrt6-line";
import mrt6Line from "@/data/mrt6-line";
import type { Station } from "@/data/stations";
import { STATIONS, STATIONS_BY_SLUG } from "@/data/stations";
import { calculateFare } from "@/features/fare-calculator/logic";
import { haversineKm } from "@/features/station-finder/logic";

export interface TripResult {
  /** Ordered list of stations from origin to destination (inclusive). */
  stops: Station[];
  /** Total fare in BDT. */
  fare: number;
  /** Total haversine distance in km (sum of segment distances). */
  distanceKm: number;
  /** Estimated travel time in minutes (2 min/segment). */
  estimatedMinutes: number;
  /** Clipped LineString coordinates in [lng, lat] order. */
  segmentCoords: LngLat[];
}

// ─── Line clipping ────────────────────────────────────────────────────────────

/**
 * Returns a slice of the LineString coordinates between two 0-based indices.
 * Always returns coordinates in the direction from `fromIdx` to `toIdx`
 * (i.e. reversed when `fromIdx > toIdx`).
 */
export const clipLineToSegment = (
  line: Mrt6LineFeature,
  fromIdx: number,
  toIdx: number,
): LngLat[] => {
  const coords = line.geometry.coordinates;

  if (fromIdx === toIdx) {
    return [coords[fromIdx] as LngLat];
  }

  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  const slice = coords.slice(lo, hi + 1) as LngLat[];

  return fromIdx > toIdx ? [...slice].toReversed() : slice;
};

// ─── Trip planning ────────────────────────────────────────────────────────────

/**
 * Plans a trip between two stations.
 * Returns a zero-length trip (fare 0, distance 0) for same origin and destination.
 * Throws `InvalidStationError` for unknown slugs.
 */
export const planTrip = (fromSlug: string, toSlug: string): TripResult => {
  const from = STATIONS_BY_SLUG.get(fromSlug);
  const to = STATIONS_BY_SLUG.get(toSlug);

  // calculateFare throws InvalidStationError for unknown slugs — let it propagate.
  // If it returns, both slugs are valid station identifiers.
  const fare = calculateFare(fromSlug, toSlug);

  // Non-null assertions are safe: calculateFare validated both slugs above.
  const fromStation = from as Station;
  const toStation = to as Station;

  const fromIdx = fromStation.orderIndex - 1;
  const toIdx = toStation.orderIndex - 1;

  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);

  const forwardStops = STATIONS.filter((s) => s.orderIndex >= lo + 1 && s.orderIndex <= hi + 1);

  const stops = fromIdx <= toIdx ? forwardStops : [...forwardStops].toReversed();

  let distanceKm = 0;
  let prev: Station | undefined;
  for (const stop of stops) {
    if (prev) {
      distanceKm += haversineKm(prev, stop);
    }
    prev = stop;
  }

  const estimatedMinutes = (stops.length - 1) * 2;

  const segmentCoords = clipLineToSegment(mrt6Line, fromIdx, toIdx);

  return {
    distanceKm,
    estimatedMinutes,
    fare,
    segmentCoords,
    stops,
  };
};
