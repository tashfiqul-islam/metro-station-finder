import type { Station } from "@/data/stations";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Coords {
  lat: number;
  lng: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

const toRad = (deg: number): number => deg * DEG_TO_RAD;

// ─── Haversine ────────────────────────────────────────────────────────────────

/**
 * Computes the great-circle distance in kilometres between two coordinates.
 * Accurate to within ~1 m for terrestrial distances.
 */
export const haversineKm = (a: Coords, b: Coords): number => {
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

// ─── Nearest station ──────────────────────────────────────────────────────────

/**
 * Returns the station closest to `from`.
 * Ties broken by `orderIndex` — the station with the lower index wins.
 * Iterates stations in ascending orderIndex order, so the first minimum wins.
 * Throws `RangeError` if `stations` is empty.
 */
export const findNearest = (from: Coords, stations: readonly Station[]): Station => {
  const ordered = [...stations].toSorted((a, b) => a.orderIndex - b.orderIndex);

  let nearest: Station | undefined;
  let minDist = Infinity;

  for (const station of ordered) {
    const dist = haversineKm(from, station);
    if (dist < minDist) {
      minDist = dist;
      nearest = station;
    }
  }

  if (!nearest) {
    throw new RangeError("findNearest requires a non-empty stations array");
  }

  return nearest;
};
