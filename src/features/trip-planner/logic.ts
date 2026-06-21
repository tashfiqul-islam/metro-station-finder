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

const toStationPoint = (station: Pick<Station, "lat" | "lng">): LngLat => [
  station.lng,
  station.lat,
];

const areSamePoint = (a: LngLat | undefined, b: LngLat): boolean =>
  a?.[0] === b[0] && a?.[1] === b[1];

const findNearestLineCoordIndex = (
  coords: readonly LngLat[],
  station: Pick<Station, "lat" | "lng">,
): number => {
  let nearestIdx = 0;
  let minDistance = Infinity;

  for (const [index, coord] of coords.entries()) {
    const distance = haversineKm(station, { lat: coord[1], lng: coord[0] });
    if (distance < minDistance) {
      minDistance = distance;
      nearestIdx = index;
    }
  }

  return nearestIdx;
};

/**
 * Returns a dense slice of the LineString between two station indices.
 * The segment is anchored to the actual station coordinates and follows
 * the dense line geometry in the requested travel direction.
 */
export const clipLineToSegment = (
  line: Mrt6LineFeature,
  fromIdx: number,
  toIdx: number,
): LngLat[] => {
  const coords = line.geometry.coordinates;
  const fromStation = STATIONS[fromIdx];
  const toStation = STATIONS[toIdx];

  if (!fromStation || !toStation) {
    throw new RangeError("clipLineToSegment requires valid station indices");
  }

  const fromPoint = toStationPoint(fromStation);
  const toPoint = toStationPoint(toStation);

  if (fromIdx === toIdx) {
    return [fromPoint];
  }

  const fromCoordIdx = findNearestLineCoordIndex(coords, fromStation);
  const toCoordIdx = findNearestLineCoordIndex(coords, toStation);
  const lo = Math.min(fromCoordIdx, toCoordIdx);
  const hi = Math.max(fromCoordIdx, toCoordIdx);
  const slice = coords.slice(lo, hi + 1) as LngLat[];
  const lineSegment = fromCoordIdx > toCoordIdx ? [...slice].toReversed() : slice;

  const anchoredSegment: LngLat[] = [];

  if (!areSamePoint(anchoredSegment.at(-1), fromPoint)) {
    anchoredSegment.push(fromPoint);
  }

  for (const coord of lineSegment) {
    if (!areSamePoint(anchoredSegment.at(-1), coord)) {
      anchoredSegment.push(coord);
    }
  }

  if (!areSamePoint(anchoredSegment.at(-1), toPoint)) {
    anchoredSegment.push(toPoint);
  }

  return anchoredSegment;
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
