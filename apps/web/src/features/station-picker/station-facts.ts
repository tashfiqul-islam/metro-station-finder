import { findFare } from "@metro/core";
import type { FareTable, Station } from "@metro/core";

export interface FareRange {
  readonly cheapest: number;
  readonly dearest: number;
}

/**
 * Cheapest and dearest single fare from `from` to every other station of the table. A station whose fare is
 * unknown is left out; with no known fare at all there is no range (null), never a zero.
 */
export function fareRange(
  table: FareTable,
  stations: readonly Station[],
  from: Station,
): FareRange | null {
  const amounts: number[] = [];
  for (const to of stations) {
    if (to.id === from.id) continue;
    const result = findFare(table, from.id, to.id);
    if (result.kind === "fare") amounts.push(result.fare.amount);
  }
  if (amounts.length === 0) return null;
  return { cheapest: Math.min(...amounts), dearest: Math.max(...amounts) };
}

/**
 * The Google Maps directions link for a station. The destination is the station's own public coordinate and
 * nothing else: no origin, no user position (ADR-0009). No travel mode either, so the link does not suggest a walk.
 */
export function directionsUrl(station: Station): string {
  const { lat, lng } = station.coordinate;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** "05" for the fifth station of the line, as the roundel shows it. */
export function stopLabel(position: number): string {
  return String(position).padStart(2, "0");
}
