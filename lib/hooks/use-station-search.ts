import { useMemo } from "react";
import stations from "@/lib/data/stations";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
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
  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const results = useMemo<readonly Station[]>(() => {
    const q = debounced.trim().toLowerCase();
    if (q === "") {
      return [] as const;
    }
    // Substring matching optimized for MRT-6 Phase 1 (17 stations)
    // Linear search provides instant results at this scale
    const matches: Station[] = [];
    for (const s of stations) {
      const name = s.name.toLowerCase();
      if (
        name.includes(q) ||
        s.aliases.some((a) => a.toLowerCase().includes(q))
      ) {
        matches.push(s);
        if (matches.length >= limit) {
          break;
        }
      }
    }
    return matches;
  }, [debounced, limit]);

  return results;
}
