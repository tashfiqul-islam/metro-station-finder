import { useState } from "react";
import type { ReactNode } from "react";

import { lazyFeature } from "./lazy-feature";
import { AppShell } from "./shell/AppShell";

interface NearbySlot {
  readonly setMap: (map: ReactNode) => void;
}

/**
 * The Nearby screen is the app, at every path (a deep link gets the SPA shell and the same screen). There is no
 * router yet; add one with the second screen. One lazy boundary loads the whole screen: the nearest-station page,
 * the Maps adapter, the schematic line map and the station picker (METRO-112, ADR-0022). The shell, tokens and
 * base styles are in the entry; the shell's map slot is filled by the screen once it has loaded, through `setMap`.
 * The Maps API loads only while the screen is on show.
 */
const Landing = lazyFeature(async () => {
  const [{ Nearby }, { mapsAdapter }] = await Promise.all([
    import("./features/nearby/Nearby"),
    import("./adapters/maps"),
  ]);
  return { default: ({ setMap }: NearbySlot) => <Nearby maps={mapsAdapter} setMap={setMap} /> };
});

/** Wiring only: the shell around the screen. */
export function AppRoutes() {
  const [map, setMap] = useState<ReactNode>(null);
  return (
    // No map yet, or the screen failed to load: no map frame at all (an empty frame is not a region).
    <AppShell map={map ?? undefined}>
      <Landing setMap={setMap} />
    </AppShell>
  );
}
