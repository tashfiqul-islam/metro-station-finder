import type { Station } from "@metro/core";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PlaceSearchService, PlaceSuggestion } from "../../adapters/maps/context";
import { DEBOUNCE_MS, placeQuery } from "./model";

function noop(): void {}

interface Answer {
  readonly query: string;
  /** Null when the request failed (a refused key, a cap, the network). */
  readonly places: readonly PlaceSuggestion[] | null;
}

interface Arguments {
  readonly stations: readonly Station[];
  /** The text the rider typed; empty after a pick or a clear, so a programmatic text asks for nothing. */
  readonly typed: string;
  /** Offline, or Maps failed to load: nothing is asked. */
  readonly unavailable: boolean;
  readonly service: PlaceSearchService | null;
  /** Asks the provider to load the Maps libraries; idempotent. */
  readonly load: () => void;
}

export interface Suggestions {
  /** True when the volume rules allow a request for the typed text (whether or not Places can be asked now). */
  readonly wanted: boolean;
  readonly places: readonly PlaceSuggestion[];
  /** Waiting for an answer to `query` (the libraries or the request are on their way). */
  readonly pending: boolean;
  /** The request for `query` failed. */
  readonly failed: boolean;
  /** Ends the search session: the next request starts a new one. The listed suggestions stay choosable. */
  readonly abandon: () => void;
}

/**
 * Places for the typed text under the volume rules of ADR-0009 amendment 5 (METRO-163): no request under three
 * characters, none while a whole station name is typed, one after 180 ms of no typing, never while unavailable.
 * The first wanted query also asks the provider to load Maps. An answer is kept with the text it answered, so
 * suggestions for older text are never shown. A failure carries no cause: its message can hold the typed text.
 */
export function usePlaceSuggestions({
  stations,
  typed,
  unavailable,
  service,
  load,
}: Arguments): Suggestions {
  const wanted = placeQuery(stations, typed);
  const query = unavailable ? null : wanted;
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (query !== null) load();
  }, [query, load]);

  // The search is over when the text no longer asks for places (under three characters, no letter or number, a
  // whole station name) and when the field goes: the session ends, so the next query starts a new one. Not on
  // blur: a blur comes before the click that chooses an option.
  const asking = useRef(false);
  useEffect(() => {
    if (wanted === null && asking.current) service?.abandon();
    asking.current = wanted !== null;
  }, [wanted, service]);
  useEffect(() => () => service?.abandon(), [service]);

  // The pause is counted from the last keystroke, not from when Maps arrives: the timer starts with the text, and a
  // request follows as soon as both the pause has passed and the library is there (a slow library load must not
  // add a second pause).
  const [paused, setPaused] = useState<string | null>(null);
  useEffect(() => {
    if (query === null) return noop;
    const timer = setTimeout(() => setPaused(query), DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      setPaused(null);
    };
  }, [query]);

  useEffect(() => {
    if (query === null || service === null || paused !== query) return noop;
    let current = true;
    const ask = async (): Promise<void> => {
      try {
        const places = await service.suggest(query);
        if (current) setAnswer({ query, places });
      } catch {
        // The cause is dropped on purpose: its message can carry the typed text or a key.
        if (current) setAnswer({ query, places: null });
      }
    };
    void ask();
    return () => {
      current = false;
    };
  }, [query, service, paused]);

  const abandon = useCallback((): void => service?.abandon(), [service]);

  const answered = query !== null && answer?.query === query ? answer : null;
  return {
    wanted: wanted !== null,
    places: answered?.places ?? [],
    pending: query !== null && answered === null,
    failed: answered !== null && answered.places === null,
    abandon,
  };
}
