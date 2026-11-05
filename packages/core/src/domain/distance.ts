import type { Coordinate } from "./coordinate.ts";

declare const geographicBrand: unique symbol;
declare const walkingBrand: unique symbol;

/** Point-to-point spherical (Haversine) distance in kilometres. Ranks "nearest". */
export type GeographicDistanceKm = number & { readonly [geographicBrand]: true };

/** Distance in metres along a walking route. Never interchangeable with geographic distance. */
export type WalkingDistanceMeters = number & { readonly [walkingBrand]: true };

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

/** Haversine distance, Earth radius 6371 km (the legacy baseline formula). */
export function geographicDistanceKm(from: Coordinate, to: Coordinate): GeographicDistanceKm {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the only place a brand is attached
  return (EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) as GeographicDistanceKm;
}

export function walkingDistanceMeters(meters: number): WalkingDistanceMeters {
  if (!Number.isFinite(meters) || meters < 0)
    throw new RangeError("Walking distance must be a finite, non-negative number of metres");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the only place a brand is attached
  return meters as WalkingDistanceMeters;
}
