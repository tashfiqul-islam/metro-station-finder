import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { readMapsKey } from "./config";
import { MapsContext, PlacesContext, UNAVAILABLE } from "./context";
import type { MapsState, PlacesApi } from "./context";
import { loadLibraries } from "./libraries";
import { createRouteService } from "./routes";
import type { RouteApi } from "./routes";

interface Loaded {
  readonly places: PlacesApi;
  readonly routes: { readonly Route: RouteApi };
}

/** Loads the Maps libraries; the real one is `loadLibraries`, whose Google types satisfy `Loaded`. */
type Load = (apiKey: string) => Promise<Loaded>;

const LOADING: MapsState = { status: "loading", routes: null };

interface LoaderProps {
  readonly apiKey: string;
  readonly load: Load;
  readonly children: ReactNode;
}

function Loader({ apiKey, load, children }: LoaderProps) {
  const [libraries, setLibraries] = useState<Loaded | "failed" | null>(null);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const loaded = await load(apiKey);
        if (current) setLibraries(loaded);
      } catch {
        // The cause is dropped on purpose: its message can carry the script URL, which holds the key.
        if (current) setLibraries("failed");
      }
    })();
    return () => {
      current = false;
    };
  }, [apiKey, load]);

  const state = useMemo<MapsState>(() => {
    if (libraries === null) return LOADING;
    if (libraries === "failed") return UNAVAILABLE;
    return { status: "ready", routes: createRouteService(libraries.routes.Route) };
  }, [libraries]);
  const places = libraries === null || libraries === "failed" ? null : libraries.places;

  return (
    <PlacesContext value={places}>
      <MapsContext value={state}>{children}</MapsContext>
    </PlacesContext>
  );
}

interface ProviderProps {
  readonly children: ReactNode;
  /** Tests pass a key or `null`; the app reads the build-time key. */
  readonly apiKey?: string | null;
  /** Tests pass a fake loader; the app uses the real one. */
  readonly load?: Load;
}

/**
 * Loads the Maps JavaScript API once, only while the feature that mounts this is on screen. With no key
 * nothing loads and the status is `unavailable` (a visible state, never a silent one).
 */
export function MapsProvider({
  children,
  apiKey = readMapsKey(),
  load = loadLibraries,
}: ProviderProps) {
  if (apiKey === null) return <MapsContext value={UNAVAILABLE}>{children}</MapsContext>;
  return (
    <Loader apiKey={apiKey} load={load}>
      {children}
    </Loader>
  );
}
