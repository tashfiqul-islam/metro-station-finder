import { useMemo } from "react";
import stations from "@/lib/data/stations";
import type { Coordinates, Meters } from "@/lib/types";
import { calculateDistance } from "@/lib/utils/distance";

/**
 * Computes the nearest station to a given coordinate using Haversine distance.
 * Memoized for performance; recalculates only when origin changes.
 */

type Nearest = {
  readonly stationId: string;
  readonly distanceMeters: Meters;
  readonly coordinates: Coordinates;
};

export function useNearestStation(origin?: Coordinates): Nearest | undefined {
  return useMemo(() => {
    if (!origin) {
      return;
    }
    // Linear scan optimized for MRT-6 Phase 1 (17 stations)
    // Provides instant distance calculations at this scale
    let best: Nearest | undefined;
    for (const s of stations) {
      const result = calculateDistance(origin, s.coordinates);
      if (!result.success) {
        continue;
      }
      if (!best || result.distanceMeters < best.distanceMeters) {
        best = {
          stationId: s.id,
          distanceMeters: result.distanceMeters,
          coordinates: s.coordinates,
        };
      }
    }
    return best;
  }, [origin]);
}
