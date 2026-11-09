import type { Coordinate, WalkingDistanceMeters } from "@metro/core";
import { createContext, useContext } from "react";
import type { ComponentType, ReactNode } from "react";

/** What the feature knows about Google Maps: nothing Google-shaped crosses this port. */
export type MapsStatus = "idle" | "loading" | "ready" | "unavailable";

/** The id of the plain input (the label's `for`); the swapped-in widget replaces it at the same place. */
export const PLACE_INPUT_ID = "place-input";

export interface PlaceSearchProps {
  /** Id of the visible label that names the search control (the plain input and the widget's group). */
  readonly labelId: string;
  /** Id of the visible hint; the plain input is described by it, the widget gets the same text as `description`. */
  readonly hintId: string;
  /**
   * Hint text that the widget exposes as the description of its input (screen readers read it on focus).
   * Google documents no way to set the input's accessible name, so the visible label must be contained in
   * Google's own name instead (METRO-101).
   */
  readonly description: string;
  /** Soft bias for suggestions; a hint, not a restriction. */
  readonly bias: { readonly center: Coordinate; readonly radiusMeters: number };
  readonly onPlace: (location: Coordinate) => void;
  /** The search could not produce a location. Carries no cause on purpose. */
  readonly onFailure: () => void;
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
  /** Asks for the Maps libraries (the first focus of the place search, or the first walking route). */
  readonly load: () => void;
}

function noop(): void {}

export interface MapsAdapter {
  /** Supplies `MapsState` (read with `useMaps`) and loads the Maps API once while mounted. */
  readonly Provider: ComponentType<{ readonly children: ReactNode }>;
  readonly PlaceSearch: ComponentType<PlaceSearchProps>;
}

/** Outside a provider (or with no key) Maps is simply unavailable. */
export const UNAVAILABLE: MapsState = { status: "unavailable", routes: null, load: noop };

export const MapsContext = createContext<MapsState>(UNAVAILABLE);

export function useMaps(): MapsState {
  return useContext(MapsContext);
}

/** What the search needs from the Maps `places` library, as we call it (and a fake can supply). */
export interface PlacesApi {
  readonly PlaceAutocompleteElement: new (options: {
    description: string;
    includedRegionCodes: string[];
    locationBias: { center: { lat: number; lng: number }; radius: number };
  }) => HTMLElement & { value: string | null };
}

/** Adapter-private: the loaded `places` library, null until ready. Never part of the port. */
export const PlacesContext = createContext<PlacesApi | null>(null);

export function usePlaces(): PlacesApi | null {
  return useContext(PlacesContext);
}
