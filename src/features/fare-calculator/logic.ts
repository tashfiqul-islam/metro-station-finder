import { lookupFare } from "@/data/fares";
import { STATIONS_BY_SLUG } from "@/data/stations";

// ─── Errors ───────────────────────────────────────────────────────────────────

export class InvalidStationError extends Error {
  constructor(slug: string) {
    super(`Unknown station slug: "${slug}"`);
    this.name = "InvalidStationError";
  }
}

// ─── Fare lookup ──────────────────────────────────────────────────────────────

/**
 * Returns the fare in BDT between two stations.
 * Returns 0 for same-station.
 * Throws `InvalidStationError` for unknown slugs.
 */
export const calculateFare = (fromSlug: string, toSlug: string): number => {
  const fare = lookupFare(fromSlug, toSlug);

  if (fare === undefined) {
    const unknownSlug = STATIONS_BY_SLUG.has(fromSlug) ? toSlug : fromSlug;
    throw new InvalidStationError(unknownSlug);
  }

  return fare;
};
