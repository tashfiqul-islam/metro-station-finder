import { mapsAdapter } from "./adapters/maps";
import { NearestStation } from "./features/nearest-station/NearestStation";

/**
 * Wiring only: the nearest-station slice is the app, at every path (a deep link gets the SPA shell and
 * the same slice). There is no router yet; add one with the second screen. The Maps API loads only
 * while the slice is on screen.
 */
export function AppRoutes() {
  return <NearestStation maps={mapsAdapter} />;
}
