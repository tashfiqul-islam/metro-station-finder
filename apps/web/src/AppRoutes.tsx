import { mapsAdapter } from "./adapters/maps";
import { App } from "./App";
import { NearestStation } from "./features/nearest-station/NearestStation";

/**
 * Wiring only: `/nearest` is the reference slice, every other path keeps the scaffold page until the
 * retirement ticket removes it. The Maps API loads only when the slice is on screen.
 */
export function AppRoutes({ pathname }: { readonly pathname: string }) {
  return pathname === "/nearest" ? <NearestStation maps={mapsAdapter} /> : <App />;
}
