import { walkingDistanceMeters } from "@metro/core";
import type { Coordinate } from "@metro/core";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useMemo } from "react";

import type { RouteService, WalkingRoute } from "./port";

/** What we send: WALKING with the cheapest field mask, and nothing else. */
interface RouteRequest {
  readonly origin: Coordinate;
  readonly destination: Coordinate;
  readonly travelMode: "WALKING";
  readonly fields: readonly string[];
}

export interface RouteResponse {
  readonly routes?:
    | readonly {
        readonly distanceMeters?: number | null | undefined;
        readonly durationMillis?: number | null | undefined;
      }[]
    | undefined;
}

/** The one method used from the Maps `routes` library (`google.maps.routes.Route`), as we call it. */
export interface RouteApi {
  computeRoutes(request: RouteRequest): Promise<RouteResponse>;
}

/** Results by route pair, shared by every service made from the same library object. */
const caches = new WeakMap<object, Map<string, Promise<WalkingRoute>>>();

async function compute(
  api: RouteApi,
  origin: Coordinate,
  destination: Coordinate,
): Promise<WalkingRoute> {
  // Minimal fields keep the request in the cheapest tier: no path, no traffic, no alternatives.
  const { routes } = await api.computeRoutes({
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    travelMode: "WALKING",
    fields: ["distanceMeters", "durationMillis"],
  });
  const first = routes?.[0];
  const meters = first?.distanceMeters;
  const millis = first?.durationMillis;
  if (typeof meters !== "number" || typeof millis !== "number") throw new Error("No walking route");
  return { distance: walkingDistanceMeters(meters), durationSeconds: Math.round(millis / 1000) };
}

/**
 * One request per (origin, destination) pair: a repeat or a StrictMode re-run reuses the pending or
 * finished result. A failure is dropped from the cache so a later explicit selection can try again;
 * nothing retries by itself, because every call is billable.
 */
export function createRouteService(api: RouteApi): RouteService {
  const cache = caches.get(api) ?? new Map<string, Promise<WalkingRoute>>();
  caches.set(api, cache);
  return {
    walk(origin, destination) {
      const key = `${origin.lat},${origin.lng}>${destination.lat},${destination.lng}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const pending = compute(api, origin, destination);
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
      return pending;
    },
  };
}

export function useRouteService(): RouteService | null {
  const library = useMapsLibrary("routes");
  return useMemo(() => (library === null ? null : createRouteService(library.Route)), [library]);
}
