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
  fromIdx = 0,
  toIdx = coords.length - 1,
): number => {
  let nearestIdx = fromIdx;
  let minDistance = Infinity;

  for (const [index, coord] of coords.entries()) {
    if (index < fromIdx || index > toIdx) {
      continue;
    }

    const distance = haversineKm(station, { lat: coord[1], lng: coord[0] });
    if (distance < minDistance) {
      minDistance = distance;
      nearestIdx = index;
    }
  }

  return nearestIdx;
};

export const getStationLineAnchorIndexes = (
  line: Mrt6LineFeature,
  stations: readonly Pick<Station, "lat" | "lng">[],
): number[] => {
  const coords = line.geometry.coordinates;

  if (stations.length > coords.length) {
    throw new RangeError(
      "getStationLineAnchorIndexes requires at least one dense-line point per station",
    );
  }

  let previousAnchorIdx = -1;

  return stations.map((station, stationIndex) => {
    const remainingStations = stations.length - stationIndex;
    const searchStart = previousAnchorIdx + 1;
    const searchEnd = coords.length - remainingStations;

    if (searchStart > searchEnd) {
      throw new RangeError(
        "getStationLineAnchorIndexes could not preserve station order on the dense line",
      );
    }

    const anchorIdx = findNearestLineCoordIndex(coords, station, searchStart, searchEnd);
    previousAnchorIdx = anchorIdx;
    return anchorIdx;
  });
};

export const getStationLineAnchorCoords = (
  line: Mrt6LineFeature,
  stations: readonly Pick<Station, "lat" | "lng">[],
): LngLat[] => {
  const anchorIndexes = getStationLineAnchorIndexes(line, stations);

  return anchorIndexes.map((anchorIndex) => {
    const coord = line.geometry.coordinates[anchorIndex];

    if (!coord) {
      throw new RangeError("getStationLineAnchorCoords requires valid station anchor indices");
    }

    return coord;
  });
};

const MIN_DISPLAY_ANCHOR_INDEX_GAP = 32;

const MOTIJHEEL_SLUG = "motijheel";
const KAMALAPUR_SLUG = "kamalapur";

export const getStationLineDisplayAnchorIndexes = (
  line: Mrt6LineFeature,
  stations: readonly Pick<Station, "lat" | "lng">[],
): number[] => {
  const anchorIndexes = getStationLineAnchorIndexes(line, stations);
  const displayIndexes = [...anchorIndexes];

  const stationIndexBySlug = new Map(
    STATIONS.map((station, index) => [station.slug, index] as const),
  );

  const motijheelIndex = stationIndexBySlug.get(MOTIJHEEL_SLUG);
  const kamalapurIndex = stationIndexBySlug.get(KAMALAPUR_SLUG);

  if (motijheelIndex === undefined || kamalapurIndex === undefined) {
    throw new RangeError(
      "getStationLineDisplayAnchorIndexes requires Motijheel and Kamalapur stations",
    );
  }

  const motijheelAnchor = displayIndexes[motijheelIndex];
  const kamalapurAnchor = displayIndexes[kamalapurIndex];
  const previousAnchor = displayIndexes[motijheelIndex - 1];

  if (
    motijheelAnchor === undefined ||
    kamalapurAnchor === undefined ||
    previousAnchor === undefined
  ) {
    throw new RangeError("getStationLineDisplayAnchorIndexes requires valid station anchors");
  }

  const currentGap = kamalapurAnchor - motijheelAnchor;
  if (currentGap < MIN_DISPLAY_ANCHOR_INDEX_GAP) {
    const candidateAnchor = kamalapurAnchor - MIN_DISPLAY_ANCHOR_INDEX_GAP;
    displayIndexes[motijheelIndex] = Math.max(candidateAnchor, previousAnchor + 1);
  }

  for (let index = 1; index < displayIndexes.length; index += 1) {
    const current = displayIndexes[index];
    const previous = displayIndexes[index - 1];

    if (current === undefined || previous === undefined || current <= previous) {
      throw new RangeError(
        "getStationLineDisplayAnchorIndexes could not preserve station order on the dense line",
      );
    }
  }

  return displayIndexes;
};

export const getStationLineDisplayAnchorCoords = (
  line: Mrt6LineFeature,
  stations: readonly Pick<Station, "lat" | "lng">[],
): LngLat[] => {
  const displayIndexes = getStationLineDisplayAnchorIndexes(line, stations);

  return displayIndexes.map((displayIndex) => {
    const coord = line.geometry.coordinates[displayIndex];

    if (!coord) {
      throw new RangeError(
        "getStationLineDisplayAnchorCoords requires valid display anchor indices",
      );
    }

    return coord;
  });
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

  const stationLineAnchorIndexes = getStationLineAnchorIndexes(line, STATIONS);
  const fromCoordIdx = stationLineAnchorIndexes[fromIdx];
  const toCoordIdx = stationLineAnchorIndexes[toIdx];

  if (fromCoordIdx === undefined || toCoordIdx === undefined) {
    throw new RangeError("clipLineToSegment requires valid station anchor indices");
  }

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
