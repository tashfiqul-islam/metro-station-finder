import {
  createFare,
  geographicDistanceKm,
  parseCoordinate,
  type Coordinate,
  type CoordinateRejection,
  type FareResult,
  type FareTable,
  type GeographicDistanceKm,
  type Station,
  type StationId,
} from "../domain/index.ts";

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
  let best: { station: Station; distance: GeographicDistanceKm } | undefined;
  for (const station of stations) {
    const distance = geographicDistanceKm(checked.coordinate, station.coordinate);
    if (!Number.isFinite(distance)) continue;
    if (best === undefined || distance < best.distance) best = { station, distance };
  }
  if (best === undefined) return { kind: "no-result", reason: "empty-dataset" };
  return { kind: "nearest", ...best };
}

/** Exact, case-sensitive match on a station name or alias; undefined when nothing matches. */
export function resolveStation(stations: readonly Station[], label: string): Station | undefined {
  return stations.find((s) => s.name === label || s.aliases.includes(label));
}

/** Fare between two stations; any gap or malformed cell is `unknown-fare`, never zero. */
export function findFare(table: FareTable, from: StationId, to: StationId): FareResult {
  const row = table.order.indexOf(from);
  const column = table.order.indexOf(to);
  if (row < 0 || column < 0) return { kind: "unknown-fare", reason: "unknown-station" };
  const amount = table.amounts[row]?.[column];
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
    return { kind: "unknown-fare", reason: "no-fare-entry" };
  return { kind: "fare", fare: createFare(amount) };
}
