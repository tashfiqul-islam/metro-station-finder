import { PlaceSearch } from "./place-search";
import type { MapsAdapter } from "./port";
import { MapsProvider } from "./provider";

export { UNAVAILABLE } from "./context";

/** The real adapter. Features receive it as a prop, so tests inject a fake and never load Google. */
export const mapsAdapter: MapsAdapter = { Provider: MapsProvider, PlaceSearch };
