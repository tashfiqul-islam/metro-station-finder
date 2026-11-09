import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { readMapsKey } from "./config";
import { MapsContext, PlacesContext, UNAVAILABLE } from "./context";
import type { MapsState, PlacesApi } from "./context";
import { loadLibraries, resetLibraries } from "./libraries";
import { createRouteService } from "./routes";
import type { RouteApi } from "./routes";

function noop(): void {}

/** How long the Maps script may take before the libraries count as failed. */
export const LOAD_WATCHDOG_MS = 20_000;

interface Loaded {
  readonly places: PlacesApi;
  readonly routes: { readonly Route: RouteApi };
}

/** Loads the Maps libraries; the real one is `loadLibraries`, whose Google types satisfy `Loaded`. */
type Load = (apiKey: string) => Promise<Loaded>;

const IDLE_STATE = { status: "idle", routes: null } as const;
const LOADING_STATE = { status: "loading", routes: null } as const;

interface LoaderProps {
  readonly apiKey: string;
  readonly load: Load;
  /** Forgets a failed load; called when the connection returns after a failure that happened offline. */
  readonly reset: () => void;
  readonly children: ReactNode;
}

type Libraries = Loaded | "failed" | "failed-offline" | null;

function Loader({ apiKey, load, reset, children }: LoaderProps) {
  const [libraries, setLibraries] = useState<Libraries>(null);
  /** Nothing loads until something asks (METRO-114). Bumped to ask again after an offline failure. */
  const [asked, setAsked] = useState(0);
  const askedOnce = asked > 0;
  const request = useCallback((): void => setAsked((count) => (count === 0 ? 1 : count)), []);

  useEffect(() => {
    if (asked === 0) return noop;
    let current = true;
    const fail = (): void => {
      if (!current) return;
      current = false;
      setLibraries(navigator.onLine ? "failed" : "failed-offline");
    };
    // A script that neither loads nor errors must not leave the search and the route waiting for ever. A late
    // answer is ignored (the same page then reads as unavailable until it is reloaded).
    const timer = setTimeout(fail, LOAD_WATCHDOG_MS);
    void (async () => {
      try {
        const loaded = await load(apiKey);
        if (current) {
          current = false;
          setLibraries(loaded);
        }
      } catch {
        // The cause is dropped on purpose: its message can carry the script URL, which holds the key.
        fail();
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [apiKey, load, asked]);

  // A load that failed while the browser was offline is tried again when it reports the connection back.
  useEffect(() => {
    if (libraries !== "failed-offline") return noop;
    const retry = (): void => {
      reset();
      setLibraries(null);
      setAsked((count) => count + 1);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [libraries, reset]);

  const state = useMemo<MapsState>(() => {
    if (libraries === null) return { ...(askedOnce ? LOADING_STATE : IDLE_STATE), load: request };
    if (libraries === "failed" || libraries === "failed-offline") {
      return { ...UNAVAILABLE, load: request };
    }
    return { status: "ready", routes: createRouteService(libraries.routes.Route), load: request };
  }, [libraries, askedOnce, request]);
  const places = typeof libraries === "object" && libraries !== null ? libraries.places : null;

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
  readonly reset?: () => void;
}

/**
 * Loads the Maps JavaScript API once, and only when a feature asks with `load()` (the first focus of the place
 * search, the first walking route): mounting it loads nothing (METRO-114). With no key nothing ever loads and the
 * status is `unavailable` (a visible state, never a silent one).
 */
export function MapsProvider({
  children,
  apiKey = readMapsKey(),
  load = loadLibraries,
  reset = resetLibraries,
}: ProviderProps) {
  if (apiKey === null) return <MapsContext value={UNAVAILABLE}>{children}</MapsContext>;
  return (
    <Loader apiKey={apiKey} load={load} reset={reset}>
      {children}
    </Loader>
  );
}
