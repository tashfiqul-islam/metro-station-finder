import { createContext, useContext } from "react";

import type { MapsState } from "./port";

/** Outside a provider (or with no key) Maps is simply unavailable. */
export const UNAVAILABLE: MapsState = { status: "unavailable", routes: null };

export const MapsContext = createContext<MapsState>(UNAVAILABLE);

export function useMaps(): MapsState {
  return useContext(MapsContext);
}

/** What the search needs from the Maps `places` library, as we call it (and a fake can supply). */
export interface PlacesApi {
  readonly PlaceAutocompleteElement: new (options: {
    includedRegionCodes: string[];
    locationBias: { center: { lat: number; lng: number }; radius: number };
  }) => HTMLElement;
}

/** Adapter-private: the loaded `places` library, null until ready. Never part of the port. */
export const PlacesContext = createContext<PlacesApi | null>(null);

export function usePlaces(): PlacesApi | null {
  return useContext(PlacesContext);
}
