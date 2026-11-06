import type { Coordinate, WalkingDistanceMeters } from "@metro/core";
import type { ComponentType, ReactNode } from "react";

/** What the feature knows about Google Maps: nothing Google-shaped crosses this port. */
export type MapsStatus = "loading" | "ready" | "unavailable";

export interface PlaceSearchProps {
  /** Id of the visible label that names the search control. */
  readonly labelId: string;
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
