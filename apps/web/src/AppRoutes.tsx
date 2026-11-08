import { lazyFeature } from "./lazy-feature";
import { AppShell } from "./shell/AppShell";

/**
 * The nearest-station slice is the app, at every path (a deep link gets the SPA shell and the same slice).
 * There is no router yet; add one with the second screen. The slice and the Maps adapter load as one lazy
 * chunk (ADR-0021 moves them out of the first visit so the design foundation fits the budget); the shell,
 * tokens and base styles are in the entry. The Maps API loads only while the slice is on screen.
 */
const Landing = lazyFeature(async () => {
  const [{ NearestStation }, { mapsAdapter }] = await Promise.all([
    import("./features/nearest-station/NearestStation"),
    import("./adapters/maps"),
  ]);
  return { default: () => <NearestStation maps={mapsAdapter} /> };
});

/** Wiring only: the shell around the slice. */
export function AppRoutes() {
  return (
    <AppShell>
      <Landing />
    </AppShell>
  );
}
