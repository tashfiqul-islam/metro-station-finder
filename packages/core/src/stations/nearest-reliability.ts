import { parseCoordinate } from "../geo/coordinate.ts";
import type { Coordinate } from "../geo/coordinate.ts";
import { rankNearest } from "./rank-nearest.ts";
import type { Station } from "./station.ts";

/**
 * A fix with accuracy radius `r <= GOOD_FIX_METERS` is treated as reliable: the nearest station by distance
 * is shown. At worst the runner-up is then within `2r = 200 m` of equal distance, an acceptable detour. This
 * is a product judgment (METRO-103), not derived (Inferred): it keeps a GPS-grade fix from ever being told it
 * is "only rough". The `2r` rule below applies only when `r` is above this. An exact tie at a small `r`
 * returns the deterministic first station in dataset order (`findNearestStation`).
 */
export const GOOD_FIX_METERS = 100;

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
 * `coords.accuracy`, a radius at a 68 percent confidence level per the W3C Geolocation API (Web-verified), so
 * "reliable" is probabilistic, not a guarantee).
 *
 * Above `GOOD_FIX_METERS`: the true point lies within `r` of the reported one, so by the triangle inequality
 * the nearest can only change when the runner-up is not farther than the nearest by more than `2r`. That is
 * a SUFFICIENT bound for "reliable" (conservative; tight only for collinear geometry), not an exact test:
 * some positions flagged uncertain would in fact be safe. An exact tie is uncertain. One station has no
 * runner-up and is reliable once the radius is known.
 *
 * Check order: the accuracy is judged first, then the origin and the stations. An unknown accuracy therefore
 * wins over an invalid origin. Pure: no network, no storage.
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
  const ranked = checked.ok ? rankNearest(stations, checked.coordinate) : undefined;
  if (ranked === undefined) return { kind: "uncertain", reason: "no-nearest" };
  if (accuracyMeters <= GOOD_FIX_METERS) return { kind: "reliable" };
  return (ranked.runnerUpDistance - ranked.distance) * 1000 > 2 * accuracyMeters
    ? { kind: "reliable" }
    : { kind: "uncertain", reason: "ambiguous" };
}
