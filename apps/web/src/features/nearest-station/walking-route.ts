import type { Coordinate, Station } from "@metro/core";
import { useEffect, useRef, useState } from "react";

import type { MapsState, WalkingRoute } from "../../adapters/maps/context";

export type RouteView =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "success"; readonly route: WalkingRoute }
  | { readonly phase: "failure" };

type RouteResult =
  | { readonly key: string; readonly route: WalkingRoute }
  | { readonly key: string; readonly route: null };

/**
 * A route request that has not answered by now is given up on (a callback that never fires must not leave
 * "Finding the walking route" on screen for ever). The late answer is ignored.
 */
export const ROUTE_WATCHDOG_MS = 15_000;

function noop(): void {}

/**
 * The walking route of one result (METRO-114): exactly one request per mounted result, made from this effect
 * and nowhere else. The caller mounts it only for a good device fix or a chosen place (never for a rough
 * position or a picked station), so a null origin or station asks for nothing. The first request also asks the
 * provider to load the Maps libraries. A result that was replaced unmounts this hook: the request is then never
 * made (if the libraries were still loading) or its answer is ignored (if it was in flight). The view is
 * derived from the key, so a stale answer is never shown. Nothing here keeps the error: its message can carry
 * coordinates or a URL.
 */
export function useWalkingRoute(
  maps: MapsState,
  origin: Coordinate | null,
  station: Station | null,
): RouteView {
  const { routes: service, status, load } = maps;
  const [result, setResult] = useState<RouteResult | null>(null);
  /**
   * The one request of this result's key. Effects can run again for the same key (StrictMode's second run, a
   * `service` object that changes after an answer or a watchdog failure was stored): they attach to this
   * request instead of making another, so a result never asks twice.
   */
  const requested = useRef<{
    readonly key: string;
    readonly pending: Promise<WalkingRoute>;
  } | null>(null);
  const key =
    origin === null || station === null ? null : `${origin.lat},${origin.lng}>${station.id}`;

  useEffect(() => {
    if (key === null || origin === null || station === null) return noop;
    if (service === null) {
      load();
      return noop;
    }
    if (requested.current?.key !== key) {
      requested.current = { key, pending: service.walk(origin, station.coordinate) };
    }
    const { pending } = requested.current;
    let current = true;
    const timer = setTimeout(() => {
      // Cleanup and every answer clear this timer, so it only ever fires for a request still wanted.
      setResult({ key, route: null });
      current = false;
    }, ROUTE_WATCHDOG_MS);
    void (async () => {
      try {
        const route = await pending;
        if (current) setResult({ key, route });
      } catch {
        // The cause is dropped on purpose: its message can carry coordinates or a URL.
        if (current) setResult({ key, route: null });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [service, key, origin, station, load]);

  if (key === null) return { phase: "idle" };
  if (result?.key === key) {
    return result.route === null ? { phase: "failure" } : { phase: "success", route: result.route };
  }
  // No service yet: wait while the library loads, fail visibly when it never will.
  if (service === null && status === "unavailable") return { phase: "failure" };
  return { phase: "loading" };
}
