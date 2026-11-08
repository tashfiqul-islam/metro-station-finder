import { parseCoordinate } from "../geo/coordinate.ts";
import type { Coordinate } from "../geo/coordinate.ts";
import { geographicDistanceKm } from "../geo/distance.ts";
import type { Station } from "./station.ts";

export type NearestReliability =
  | { readonly kind: "reliable" }
  | {
      readonly kind: "uncertain";
      /**
       * `accuracy-unknown`: the radius is missing, not a number, infinite or negative.
       * `ambiguous`: the true point could lie nearer the runner-up station.
       * `no-nearest`: the origin is invalid or there is no station to compare.
       */
      readonly reason: "accuracy-unknown" | "ambiguous" | "no-nearest";
    };

/**
 * Whether the nearest station is trustworthy for a fix with an accuracy radius (metres; the browser's
 * `coords.accuracy`). The true point lies within the radius `r` of the reported one, so the answer can
 * change when the runner-up is not farther than the nearest by more than `2r` (the true point could sit
 * `r` closer to the runner-up while the nearest is `r` farther). An exact tie is uncertain even at
 * `r = 0`. One station has no runner-up and is reliable once the radius is known. Pure: no network, no
 * storage.
 */
export function assessNearestReliability(
  stations: readonly Station[],
  origin: Coordinate,
  accuracyMeters?: number,
): NearestReliability {
  if (accuracyMeters === undefined || !Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
    return { kind: "uncertain", reason: "accuracy-unknown" };
  }
  const checked = parseCoordinate(origin.lat, origin.lng);
  if (!checked.ok) return { kind: "uncertain", reason: "no-nearest" };
  let nearest = Infinity;
  let runnerUp = Infinity;
  for (const station of stations) {
    const km = geographicDistanceKm(checked.coordinate, station.coordinate);
    if (!Number.isFinite(km)) continue;
    if (km < nearest) {
      runnerUp = nearest;
      nearest = km;
    } else if (km < runnerUp) {
      runnerUp = km;
    }
  }
  if (nearest === Infinity) return { kind: "uncertain", reason: "no-nearest" };
  if (runnerUp === Infinity) return { kind: "reliable" };
  return (runnerUp - nearest) * 1000 > 2 * accuracyMeters
    ? { kind: "reliable" }
    : { kind: "uncertain", reason: "ambiguous" };
}
