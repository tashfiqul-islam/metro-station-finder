import { baselineDataset } from "@metro/core";
import type { Coordinate, Station } from "@metro/core";

import type { PlaceSearchService, PlaceSuggestion } from "./context";
import { createSession } from "./session";

/** The only field requested for a chosen place: Essentials tier, no displayName, no address (ADR-0009). */
export const PLACE_FIELDS = ["location"];

/** Bangladesh (CLDR code, lower case in the docs): suggestions are limited to this region. */
export const REGION_CODES = ["bd"];

/** The latest predictions kept for choosing, a few lists' worth: older ones are dropped. */
const MAX_KEPT = 12;

/** At most this many place suggestions are listed (the handoff). */
export const MAX_PLACES = 4;

/** A box in degrees, as Google's `locationRestriction` takes it. */
export interface Bounds {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

/** About 5.5 km of margin around the line, so a place just beyond a terminus still suggests. */
const MARGIN_DEGREES = 0.05;

/** The box around the stations, grown by a margin: a restriction, not a bias (the handoff). */
export function lineBounds(stations: readonly Station[], margin = MARGIN_DEGREES): Bounds {
  const lats = stations.map((station) => station.coordinate.lat);
  const lngs = stations.map((station) => station.coordinate.lng);
  return {
    north: Math.max(...lats) + margin,
    south: Math.min(...lats) - margin,
    east: Math.max(...lngs) + margin,
    west: Math.min(...lngs) - margin,
  };
}

/** Google's formatted text as we read it: the text and the ranges the input matched. */
interface FormattableLike {
  readonly text: string;
  readonly matches: readonly { readonly startOffset: number; readonly endOffset: number }[];
}

/** One `Place` from `toPlace()`: `fetchFields` fills `location`. */
interface PlaceLike {
  fetchFields(request: { fields: string[] }): Promise<unknown>;
  readonly location?: { lat(): number; lng(): number } | null | undefined;
}

/** A `PlacePrediction`, as we read it. */
export interface PredictionLike {
  readonly placeId: string;
  readonly text: FormattableLike;
  readonly mainText: FormattableLike | null;
  readonly secondaryText: FormattableLike | null;
  toPlace(): PlaceLike;
}

/** What we send to `AutocompleteSuggestion.fetchAutocompleteSuggestions`: input, region, box and token. */
export interface SuggestRequest {
  readonly input: string;
  readonly includedRegionCodes: string[];
  readonly locationRestriction: Bounds;
  readonly sessionToken: object;
}

/** One `AutocompleteSuggestion`, as we read it: a place prediction, or null for a query suggestion. */
export interface SuggestionLike {
  readonly placePrediction: PredictionLike | null;
}

/** What we use of the Maps `places` library (and a fake can supply). */
export interface PlacesApi {
  readonly AutocompleteSessionToken: new () => object;
  readonly AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(
      request: SuggestRequest,
    ): Promise<{ readonly suggestions: readonly SuggestionLike[] }>;
  };
}

/** The first matched range of the main text, or null. */
function firstRange(text: FormattableLike): readonly [number, number] | null {
  const first = text.matches[0];
  return first === undefined ? null : [first.startOffset, first.endOffset];
}

/**
 * Place search over `AutocompleteSuggestion` with our own session token (ADR-0009 amendment 5, METRO-163).
 *
 * One `AutocompleteSessionToken` covers the requests of a search; `choose` makes one `fetchFields(["location"])`
 * on the prediction's place, which Google ends the session with, and drops the token at once. `abandon` drops it
 * for a search that ended with no selection. A dropped token is never used again: the next request makes a new
 * one. The volume rules (three characters, no exact station match, 180 ms) belong to the caller. Nothing from
 * Google leaves this file except plain text and a coordinate; a failure carries no message on purpose, because
 * it can hold the typed text or a URL.
 */
export function createPlaceSearch(
  api: PlacesApi,
  bounds: Bounds = lineBounds(baselineDataset.stations),
): PlaceSearchService {
  const session = createSession(() => new api.AutocompleteSessionToken());
  /**
   * The predictions the list may still show, by place id, with the token each was fetched under. Answers only add to
   * it (a late answer for older text never removes what a newer one listed, and never replaces an entry the open
   * session stored), a choice removes the entries of the session it ends, and it holds the latest few only.
   */
  const entries = new Map<string, { prediction: PredictionLike; token: object }>();
  /** Sessions a choice has ended: an answer asked under one lists nothing afterwards. */
  const finished = new WeakSet();
  function remember(prediction: PredictionLike, token: object): void {
    if (finished.has(token)) return;
    const existing = entries.get(prediction.placeId);
    if (existing !== undefined && existing.token !== token && existing.token === session.peek())
      return;
    entries.delete(prediction.placeId);
    entries.set(prediction.placeId, { prediction, token });
    for (const [id] of entries) {
      if (entries.size <= MAX_KEPT) break;
      entries.delete(id);
    }
  }
  return {
    suggest: async (text) => {
      const token = session.token();
      const { suggestions } = await api.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
        includedRegionCodes: REGION_CODES,
        locationRestriction: bounds,
        sessionToken: token,
      });
      const found = new Set<string>();
      const listed: PlaceSuggestion[] = [];
      for (const { placePrediction } of suggestions) {
        if (placePrediction === null || found.has(placePrediction.placeId)) continue;
        if (listed.length === MAX_PLACES) break;
        found.add(placePrediction.placeId);
        remember(placePrediction, token);
        const main = placePrediction.mainText ?? placePrediction.text;
        listed.push({
          id: placePrediction.placeId,
          name: main.text,
          detail: placePrediction.secondaryText?.text ?? "",
          range: firstRange(main),
        });
      }
      // What is returned for an ended session is not stored, so the caller's list may show it but a choice of it
      // is refused; the hook drops an answer for text that is no longer typed.
      return listed;
    },
    choose: async (suggestion): Promise<Coordinate> => {
      const entry = entries.get(suggestion.id);
      // An unknown suggestion changes nothing: not the entries, not the open session.
      if (entry === undefined) throw new Error("Unknown suggestion");
      // The session this prediction belongs to ends with this call whatever the answer is: its token is never
      // used for another request, and nothing it listed stays choosable. A newer session is left alone.
      finished.add(entry.token);
      for (const [id, other] of entries) if (other.token === entry.token) entries.delete(id);
      session.end(entry.token);
      const place = entry.prediction.toPlace();
      await place.fetchFields({ fields: PLACE_FIELDS });
      const { location } = place;
      if (location === null || location === undefined) throw new Error("No location");
      return { lat: location.lat(), lng: location.lng() };
    },
    // The listed suggestions stay choosable: choosing one after this still ends the session it was fetched in.
    abandon: () => {
      session.end();
    },
  };
}
