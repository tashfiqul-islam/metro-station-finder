import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { lazyFeature } from "./lazy-feature";
import { usePathname } from "./navigation";
import { matchRoute, routes as appRoutes } from "./routes";
import type { AppRoute, RouteTable, ScreenProps } from "./routes";
import { AppShell } from "./shell/AppShell";

interface AppRoutesProps {
  /** The route table; the app's own by default. A test passes its own. */
  readonly routes?: RouteTable;
}

interface Entry extends AppRoute {
  /** The route's lazy boundary: one chunk, loaded when the route first shows. */
  readonly Screen: ComponentType<ScreenProps>;
}

const toEntry = (route: AppRoute): Entry => ({ ...route, Screen: lazyFeature(route.load) });

interface MapSlot {
  readonly path: string;
  readonly map: ReactNode;
}

/**
 * Wiring only: the shell and the screen of the current path (METRO-159). Every route gets its
 * own lazy boundary from its loader, so the screen's chunk loads when it first shows and a failure or a render
 * error is handled as in `lazy-feature.tsx`. The shell, tokens and base styles are in the entry; the shell's
 * map slot is filled by the screen once it has loaded, through `setMap`.
 */
export function AppRoutes({ routes = appRoutes }: AppRoutesProps) {
  const entries = useMemo((): readonly [Entry, ...Entry[]] => {
    const [head, ...tail] = routes;
    return [toEntry(head), ...tail.map(toEntry)];
  }, [routes]);
  const [slot, setSlot] = useState<MapSlot | null>(null);
  const [shownPath, setShownPath] = useState<string | null>(null);
  const { path, Screen } = matchRoute(entries, usePathname());
  // A new route starts with no map: the one a screen left behind is dropped, so coming back to it (or a route
  // that never sets one) never shows a stale map. Adjusting state during render, as React documents for this.
  if (shownPath !== path) {
    setShownPath(path);
    setSlot(null);
  }
  // Stable per route, so a screen can list it as an effect dependency.
  const setMap = useCallback(
    (next: ReactNode) => {
      setSlot({ path, map: next });
    },
    [path],
  );
  // A map belongs to the screen that set it; another route never shows it.
  const map = slot?.path === path ? slot.map : null;
  return (
    // No map yet, or the screen failed to load: no map frame at all (an empty frame is not a region).
    <AppShell map={map ?? undefined}>
      <Screen key={path} setMap={setMap} />
    </AppShell>
  );
}
