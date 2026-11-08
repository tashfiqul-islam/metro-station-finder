import { parseCoordinate } from "../geo/coordinate.ts";
import type { Coordinate, CoordinateRejection } from "../geo/coordinate.ts";
import type { GeographicDistanceKm } from "../geo/distance.ts";
import { rankNearest } from "./rank-nearest.ts";
import type { Station } from "./station.ts";

export type NearestStationResult =
  | { readonly kind: "nearest"; readonly station: Station; readonly distance: GeographicDistanceKm }
  | { readonly kind: "no-result"; readonly reason: "empty-dataset" }
  | {
      readonly kind: "no-result";
      readonly reason: "invalid-coordinate";
      readonly detail: CoordinateRejection;
    };

/**
 * Nearest by geographic (Haversine) distance. Strict less-than keeps the first station in dataset
 * order on an exact tie. The origin is validated here; an invalid one is reported before an empty
 * dataset.
 */
export function findNearestStation(
  stations: readonly Station[],
  origin: Coordinate,
): NearestStationResult {
  const checked = parseCoordinate(origin.lat, origin.lng);
  if (!checked.ok)
    return { kind: "no-result", reason: "invalid-coordinate", detail: checked.reason };
  const ranked = rankNearest(stations, checked.coordinate);
  if (ranked === undefined) return { kind: "no-result", reason: "empty-dataset" };
  return { kind: "nearest", station: ranked.station, distance: ranked.distance };
}

/** Exact, case-sensitive match on a station name or alias; undefined when nothing matches. */
export function resolveStation(stations: readonly Station[], label: string): Station | undefined {
  return stations.find((s) => s.name === label || s.aliases.includes(label));
}
