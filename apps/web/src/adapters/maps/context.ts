import type { Coordinate, WalkingDistanceMeters } from "@metro/core";
import { createContext, useContext } from "react";
import type { ComponentType, ReactNode } from "react";

/** What the feature knows about Google Maps: nothing Google-shaped crosses this port. */
export type MapsStatus = "loading" | "ready" | "unavailable";

export interface PlaceSearchProps {
  /** Id of the visible label that names the group around the search control. */
  readonly labelId: string;
  /**
   * Hint text that the widget exposes as the description of its input (screen readers read it on focus).
   * Google offers no way to set the input's accessible name, so the visible label must be contained in
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

/** What a feature reads under the adapter's `Provider`. */
export interface MapsState {
  readonly status: MapsStatus;
  /** Null until the routes library is ready. */
  readonly routes: RouteService | null;
}

export interface MapsAdapter {
  /** Supplies `MapsState` (read with `useMaps`) and loads the Maps API once while mounted. */
  readonly Provider: ComponentType<{ readonly children: ReactNode }>;
  readonly PlaceSearch: ComponentType<PlaceSearchProps>;
}

/** Outside a provider (or with no key) Maps is simply unavailable. */
export const UNAVAILABLE: MapsState = { status: "unavailable", routes: null };

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
  }) => HTMLElement;
}

/** Adapter-private: the loaded `places` library, null until ready. Never part of the port. */
export const PlacesContext = createContext<PlacesApi | null>(null);

export function usePlaces(): PlacesApi | null {
  return useContext(PlacesContext);
}
