import type { Coordinate } from "../geo/coordinate.ts";
import { geographicDistanceKm } from "../geo/distance.ts";
import type { GeographicDistanceKm } from "../geo/distance.ts";
import type { Station } from "./station.ts";

export interface NearestTwo {
  readonly station: Station;
  readonly distance: GeographicDistanceKm;
  /** Distance to the second-nearest station; `Infinity` when only one station has a finite distance. */
  readonly runnerUpDistance: number;
}

/**
 * The nearest station and the distance to the runner-up, for an origin that is already validated.
 * Strict less-than keeps the first station in dataset order on an exact tie, and the runner-up of a
 * tie has the same distance as the nearest. A station with a non-finite distance is skipped.
 * Undefined when no station has a finite distance.
 */
export function rankNearest(
  stations: readonly Station[],
  origin: Coordinate,
): NearestTwo | undefined {
  let best: { station: Station; distance: GeographicDistanceKm } | undefined;
  let runnerUpDistance = Infinity;
  for (const station of stations) {
    const distance = geographicDistanceKm(origin, station.coordinate);
    if (!Number.isFinite(distance)) continue;
    if (best === undefined || distance < best.distance) {
      if (best !== undefined) runnerUpDistance = best.distance;
      best = { station, distance };
    } else if (distance < runnerUpDistance) {
      runnerUpDistance = distance;
    }
  }
  return best === undefined ? undefined : { ...best, runnerUpDistance };
}
