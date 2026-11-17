import type { Station } from "@metro/core";

import type { PlaceSuggestion } from "../../adapters/maps/context";
import { matchStations, normalizeName } from "../station-picker/match";
import type { StationMatch } from "../station-picker/match";

/** No Places request under this many characters (owner rule, ADR-0009 amendment 5). */
const MIN_PLACE_CHARACTERS = 3;

/** Stations listed for typed text; "Browse all" lists every one. */
const MAX_STATIONS = 5;

/** The pause in typing before a Places request (ADR-0009 amendment 5). */
export const DEBOUNCE_MS = 180;

/** True when the text, ignoring case, spaces and hyphens, is a whole station name or alias. */
export function hasExactStation(stations: readonly Station[], text: string): boolean {
  const needle = normalizeName(text);
  if (needle === "") return false;
  return stations.some(
    (station) =>
      normalizeName(station.name) === needle ||
      station.aliases.some((alias) => normalizeName(alias) === needle),
  );
}

/**
 * The text to send to Places, or null when the volume rules say no request: fewer than three characters (counted
 * on the trimmed text, by code point), no letter or number in it ("---" asks nothing), or a whole station name
 * already typed. The one place these rules live.
 */
export function placeQuery(stations: readonly Station[], text: string): string | null {
  const trimmed = text.trim();
  if (Array.from(trimmed).length < MIN_PLACE_CHARACTERS) return null;
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return null;
  return hasExactStation(stations, trimmed) ? null : trimmed;
}

/** The stations to list for the typed text: nothing for empty text, up to five, or all of them when browsing. */
export function listStations(
  stations: readonly Station[],
  text: string,
  browsing: boolean,
): readonly StationMatch[] {
  if (browsing) return matchStations(stations, "");
  if (text.trim() === "") return [];
  return matchStations(stations, text).slice(0, MAX_STATIONS);
}

/** One selectable row of the listbox, stations first. `key` is unique across both groups. */
export type Row =
  | { readonly kind: "station"; readonly key: string; readonly match: StationMatch }
  | { readonly kind: "place"; readonly key: string; readonly suggestion: PlaceSuggestion };

export function buildRows(
  stationMatches: readonly StationMatch[],
  places: readonly PlaceSuggestion[],
): readonly Row[] {
  return [
    ...stationMatches.map((match): Row => ({
      kind: "station",
      key: `station-${match.station.id}`,
      match,
    })),
    ...places.map((suggestion): Row => ({
      kind: "place",
      key: `place-${suggestion.id}`,
      suggestion,
    })),
  ];
}

/** What the Places part of the list shows: nothing yet, the suggestions, or the unavailable notice. */
export type PlacesView = "none" | "list" | "unavailable";

/**
 * The Places group follows the rules in one place: asked for (`wanted`) and unavailable shows the notice in
 * the group's place; results show the group (and with it the attribution row); anything else shows nothing.
 */
export function placesView(
  wanted: boolean,
  unavailable: boolean,
  places: readonly PlaceSuggestion[],
): PlacesView {
  if (!wanted) return "none";
  if (unavailable) return "unavailable";
  return places.length > 0 ? "list" : "none";
}
