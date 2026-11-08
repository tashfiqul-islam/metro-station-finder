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

/**
 * The schematic line map fills the shell's map slot (METRO-111). Pure SVG from the core dataset: no network and
 * no Google code, its own lazy chunk, so the first visit does not carry it. The Google JS map is untouched.
 */
const LineMapSlot = lazyFeature(
  async () => {
    const { LineMap } = await import("./features/line-map/LineMap");
    return { default: LineMap };
  },
  undefined,
  // Silent while loading: the slice beside it already announces "Loading this part of the page."
  null,
);

/** Wiring only: the shell around the slice. */
export function AppRoutes() {
  return (
    <AppShell map={<LineMapSlot />}>
      <Landing />
    </AppShell>
  );
}
