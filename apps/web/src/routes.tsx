import type { ReactNode } from "react";

import type { FeatureLoader } from "./lazy-feature";

/** What the shell hands every routed screen. A screen fills the shell's map slot through `setMap`. */
export interface ScreenProps {
  readonly setMap: (map: ReactNode) => void;
}

/**
 * One routed screen: its path and the lazy loader of its chunk. Adding a screen is one entry in `routes`
 * (METRO-159): `AppRoutes` makes a lazy chunk of the loader, fetched when the route first shows, so nothing else
 * changes. The nav label and icon come with the tab bar (planning#160).
 */
export interface AppRoute {
  /** Pathname, with a leading slash and no trailing one (the root is `/`). */
  readonly path: string;
  readonly load: FeatureLoader<ScreenProps>;
}

/** The route table: at least one entry; the first is the home screen and the fallback for an unknown path. */
export type RouteTable = readonly [AppRoute, ...AppRoute[]];

/** Anything with a `path`, so `matchRoute` also picks among routes paired with their lazy screens. */
interface Pathed {
  readonly path: string;
}

/**
 * Only Nearby exists today. It is the app at every path (a deep link gets the SPA shell and this screen), so an
 * unknown path shows the first route. One lazy boundary loads the whole screen: the nearest-station page, the
 * Maps adapter, the schematic line map and the station picker (METRO-112, ADR-0022). The Maps API loads only
 * while the screen is on show.
 */
export const routes: RouteTable = [
  {
    path: "/",
    load: async () => {
      const [{ Nearby }, { mapsAdapter }] = await Promise.all([
        import("./features/nearby/Nearby"),
        import("./adapters/maps"),
      ]);
      return { default: ({ setMap }) => <Nearby maps={mapsAdapter} setMap={setMap} /> };
    },
  },
];

/** The route that owns `pathname` (a trailing slash does not matter), or the first route when none does. */
export function matchRoute<T extends Pathed>(table: readonly [T, ...T[]], pathname: string): T {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  return table.find((entry) => entry.path === clean) ?? table[0];
}
