import { useDeferredValue, useMemo } from "react";
import { getAllStations } from "@/lib/adapters/stations";
import {
  useDebouncedValue,
  useSearchDebouncedValue,
} from "@/lib/hooks/performance/use-debounced-value";
import stations from "@/lib/services/data/stations";
import type { Station } from "@/lib/types/station";

/**
 * Client-side station search with debouncing for performance.
 * Searches station names and aliases; returns limited, ranked results.
 */

type Options = {
  readonly query: string;
  readonly limit?: number;
};

const DEFAULT_LIMIT = 10;
const DEBOUNCE_MS = 200;

export function useStationSearch({ query, limit = DEFAULT_LIMIT }: Options) {
  const { debouncedValue, isDebouncing, shouldSearch } = useSearchDebouncedValue(
    query,
    DEBOUNCE_MS,
    {
      immediate: true,
      minLength: 1,
    }
  );

  // Use deferred value for heavy filtering operations
  const deferredQuery = useDeferredValue(debouncedValue);
  const isStale = debouncedValue !== deferredQuery;

  const results = useMemo<readonly Station[]>(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (q === "" || !shouldSearch) {
      return [] as const;
    }
    // Substring matching optimized for MRT-6 Phase 1 (17 stations)
    // Linear search provides instant results at this scale
    const matches: Station[] = [];
    for (const s of stations) {
      const name = s.name.toLowerCase();
      if (name.includes(q) || s.aliases.some((a) => a.toLowerCase().includes(q))) {
        matches.push(s);
        if (matches.length >= limit) {
          break;
        }
      }
    }
    return matches;
  }, [deferredQuery, limit, shouldSearch]);

  return { results, isDebouncing, isStale } as const;
}

const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Custom hook for managing station search and filtering
 */
export function useStationData(state: { originSearch: string; destinationSearch: string }) {
  const debouncedOriginSearch = useDebouncedValue(state.originSearch, SEARCH_DEBOUNCE_DELAY);
  const debouncedDestinationSearch = useDebouncedValue(
    state.destinationSearch,
    SEARCH_DEBOUNCE_DELAY
  );

  const { results: filteredOriginStations } = useStationSearch({
    query: debouncedOriginSearch,
    limit: 50,
  });
  const { results: filteredDestinationStations } = useStationSearch({
    query: debouncedDestinationSearch,
    limit: 50,
  });

  const allStations = useMemo(() => {
    const result = getAllStations();
    return result.success ? result.data : [];
  }, []);

  return {
    originStations: debouncedOriginSearch ? filteredOriginStations : allStations,
    destinationStations: debouncedDestinationSearch ? filteredDestinationStations : allStations,
  };
}
