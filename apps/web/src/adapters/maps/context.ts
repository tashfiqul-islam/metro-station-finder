import type { Coordinate, WalkingDistanceMeters } from "@metro/core";
import { createContext, useContext } from "react";
import type { ComponentType, ReactNode } from "react";

/** What the feature knows about Google Maps: nothing Google-shaped crosses this port. */
export type MapsStatus = "idle" | "loading" | "ready" | "unavailable";

/** A place suggestion as the field shows it: plain text, never a Google object. */
export interface PlaceSuggestion {
  /** Google's place id: the key of the option, and what `choose` looks the prediction up by. */
  readonly id: string;
  readonly name: string;
  /** The secondary line (a district or city); empty when Google gave none. */
  readonly detail: string;
  /** The part of `name` the typed text matched (start, end), or null when Google marked none. */
  readonly range: readonly [number, number] | null;
}

/**
 * Place search over the Maps `places` library (ADR-0009 amendment 5). One billing session spans the requests of
 * one search and ends with `choose` (one `fetchFields` for the location) or `abandon`; the adapter owns the token.
 */
export interface PlaceSearchService {
  /** Up to four suggestions for `text`, in the open session. Rejects with no usable message when Google fails. */
  readonly suggest: (text: string) => Promise<readonly PlaceSuggestion[]>;
  /** Fetches the location of a suggestion from the latest `suggest` and ends the session. */
  readonly choose: (suggestion: PlaceSuggestion) => Promise<Coordinate>;
  /** Ends the open session without a selection; the next `suggest` starts a new one. */
  readonly abandon: () => void;
}

export interface WalkingRoute {
  readonly distance: WalkingDistanceMeters;
  readonly durationSeconds: number;
}

export interface RouteService {
  /** Rejects (without a usable message) when no walking route could be computed. */
  readonly walk: (origin: Coordinate, destination: Coordinate) => Promise<WalkingRoute>;
}

/**
 * What a feature reads under the adapter's `Provider`. Nothing loads until something asks (METRO-114): `idle` is
 * "not asked yet", `load()` asks (idempotent, a no-op without a key), `unavailable` is a missing key or a load
 * that failed.
 */
export interface MapsState {
  readonly status: MapsStatus;
  /** Null until the routes library is ready. */
  readonly routes: RouteService | null;
  /** Null until the places library is ready. */
  readonly places: PlaceSearchService | null;
  /** Asks for the Maps libraries (the first search that needs places, or the first walking route). */
  readonly load: () => void;
}

function noop(): void {}

export interface MapsAdapter {
  /** Supplies `MapsState` (read with `useMaps`) and loads the Maps API once while mounted. */
  readonly Provider: ComponentType<{ readonly children: ReactNode }>;
}

/** Outside a provider (or with no key) Maps is simply unavailable. */
export const UNAVAILABLE: MapsState = {
  status: "unavailable",
  routes: null,
  places: null,
  load: noop,
};

export const MapsContext = createContext<MapsState>(UNAVAILABLE);

export function useMaps(): MapsState {
  return useContext(MapsContext);
}
