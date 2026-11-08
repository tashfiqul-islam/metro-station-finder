import type { Coordinate, Station } from "@metro/core";
import { useEffect, useState } from "react";

import type { MapsStatus, RouteService, WalkingRoute } from "../../adapters/maps/context";

export type RouteView =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "success"; readonly route: WalkingRoute }
  | { readonly phase: "failure" };

type RouteResult =
  | { readonly key: string; readonly route: WalkingRoute }
  | { readonly key: string; readonly route: null };

function noop(): void {}

/**
 * One request per (origin, station) key; the view is derived so a stale answer is never shown. A null origin
 * (a device fix in METRO-113: the position never leaves the device before the route slice) or a null station
 * asks for nothing.
 */
export function useWalkingRoute(
  service: RouteService | null,
  status: MapsStatus,
  origin: Coordinate | null,
  station: Station | null,
): RouteView {
  const [result, setResult] = useState<RouteResult | null>(null);
  const key =
    origin === null || station === null ? null : `${origin.lat},${origin.lng}>${station.id}`;

  useEffect(() => {
    if (service === null || key === null || origin === null || station === null) return noop;
    let current = true;
    void (async () => {
      try {
        const route = await service.walk(origin, station.coordinate);
        if (current) setResult({ key, route });
      } catch {
        // The cause is dropped on purpose: its message can carry coordinates or a URL.
        if (current) setResult({ key, route: null });
      }
    })();
    return () => {
      current = false;
    };
  }, [service, key, origin, station]);

  if (key === null) return { phase: "idle" };
  if (result?.key === key) {
    return result.route === null ? { phase: "failure" } : { phase: "success", route: result.route };
  }
  // No service yet: wait while the library loads, fail visibly when it never will.
  if (service === null && status === "unavailable") return { phase: "failure" };
  return { phase: "loading" };
}
