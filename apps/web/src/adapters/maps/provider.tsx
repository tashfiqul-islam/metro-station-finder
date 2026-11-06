import { APILoadingStatus, APIProvider, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { MAPS_VERSION, readMapsKey } from "./config";
import { MapsContext, UNAVAILABLE } from "./context";
import type { MapsStatus } from "./port";
import { useRouteService } from "./routes";

function toStatus(status: APILoadingStatus): MapsStatus {
  if (status === APILoadingStatus.LOADED) return "ready";
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE)
    return "unavailable";
  return "loading";
}

/** Reads the loader status and the routes library under `APIProvider` and publishes them as one state. */
function StateBridge({ children }: { readonly children: ReactNode }) {
  const status = toStatus(useApiLoadingStatus());
  const routes = useRouteService();
  const state = useMemo(() => ({ status, routes }), [status, routes]);
  return <MapsContext value={state}>{children}</MapsContext>;
}

/** The library logs the load error itself unless a handler exists; the status already carries the outcome. */
function ignoreLoadError(_error: unknown): void {}

interface ProviderProps {
  readonly children: ReactNode;
  /** Tests pass a key or `null`; the app reads the build-time key. */
  readonly apiKey?: string | null;
}

/**
 * Loads the Maps JavaScript API once, only while the feature that mounts this is on screen. With no key
 * nothing loads and the status is `unavailable` (a visible state, never a silent one).
 */
export function MapsProvider({ children, apiKey = readMapsKey() }: ProviderProps) {
  if (apiKey === null) return <MapsContext value={UNAVAILABLE}>{children}</MapsContext>;
  return (
    <APIProvider apiKey={apiKey} version={MAPS_VERSION} onError={ignoreLoadError}>
      <StateBridge>{children}</StateBridge>
    </APIProvider>
  );
}
