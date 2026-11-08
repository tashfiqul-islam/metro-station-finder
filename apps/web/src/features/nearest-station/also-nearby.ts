import { geographicDistanceKm } from "@metro/core";
import type { Coordinate, Station, StationId } from "@metro/core";

export interface AlsoNearby {
  readonly station: Station;
  /** Straight-line kilometres from the origin. */
  readonly km: number;
}

/**
 * The `count` stations nearest to `origin` other than `exclude` (the result's own station), nearest first, with
 * their straight-line distance. Ties keep dataset order. A station whose distance is not finite is left out.
 * Pure: the origin goes nowhere.
 */
export function alsoNearby(
  stations: readonly Station[],
  origin: Coordinate,
  exclude: StationId,
  count = 2,
): readonly AlsoNearby[] {
  // A short insertion pass, not a sort of the whole list: `count` is 2 and the dataset has 16 stations.
  const best: AlsoNearby[] = [];
  for (const station of stations) {
    if (station.id === exclude) continue;
    const km = geographicDistanceKm(origin, station.coordinate);
    if (!Number.isFinite(km)) continue;
    // Strictly nearer than the first kept entry that is farther: ties keep dataset order.
    const at = best.findIndex((entry) => km < entry.km);
    if (at === -1) best.push({ station, km });
    else best.splice(at, 0, { station, km });
    if (best.length > count) best.pop();
  }
  return best.slice(0, count);
}
