/** A point in angular degrees. Datum and survey accuracy are unknown (see the glossary). */
export interface Coordinate {
  readonly lat: number;
  readonly lng: number;
}

export type CoordinateRejection =
  | "not-finite-number"
  | "latitude-out-of-range"
  | "longitude-out-of-range";

export type CoordinateResult =
  | { readonly ok: true; readonly coordinate: Coordinate }
  | { readonly ok: false; readonly reason: CoordinateRejection };

/** Validates untrusted input: finite numbers, latitude in [-90, 90], longitude in [-180, 180]. */
export function parseCoordinate(lat: unknown, lng: unknown): CoordinateResult {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    return { ok: false, reason: "not-finite-number" };
  if (lat < -90 || lat > 90) return { ok: false, reason: "latitude-out-of-range" };
  if (lng < -180 || lng > 180) return { ok: false, reason: "longitude-out-of-range" };
  return { ok: true, coordinate: { lat, lng } };
}
