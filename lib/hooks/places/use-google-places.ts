import { useCallback, useMemo, useRef, useState } from "react";
import { getQuotaStatus, isAutocompleteAvailable, searchDestinations } from "@/lib/adapters/places";
import { GOOGLE_PLACES_CONSTANTS } from "@/lib/config/constants";
import { useOnlineStatus } from "@/lib/hooks/network/use-online-status";
import { useDebouncedCallback } from "@/lib/hooks/performance/use-debounced-value";
import type { PlacePrediction } from "@/lib/types/places";
import { BoundedTtlCache } from "@/lib/utils/cache";
import { normalizeQuery } from "@/lib/utils/query";

/**
 * Google Places autocomplete hook.
 * - Debounces queries
 * - Respects online/quota status
 * - Caches results with TTL to reduce API usage
 */

type State =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly predictions: readonly PlacePrediction[];
    }
  | { readonly status: "error"; readonly messageId: string };

function mapPlacesErrorToCopyId(code: string): string {
  switch (code) {
    case "QUOTA_EXCEEDED":
      return "err.provider_unavailable";
    case "RATE_LIMITED":
      return "err.provider_unavailable";
    case "INVALID_QUERY":
      return "err.landmark_not_found";
    default:
      return "err.provider_unavailable";
  }
}

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  if (navigator.doNotTrack === "1") {
    return true;
  }
  if (typeof window !== "undefined") {
    const w = window as Window & { doNotTrack?: string };
    return w.doNotTrack === "1";
  }
  return false;
}

function isRateLimitedNow(quota: ReturnType<typeof getQuotaStatus>): boolean {
  return quota.success ? quota.data.isRateLimited : false;
}

const MIN_QUERY_LEN = GOOGLE_PLACES_CONSTANTS.minQueryLength;
const CACHE_TTL = GOOGLE_PLACES_CONSTANTS.cacheExpirationMs;
const CACHE_CAPACITY = GOOGLE_PLACES_CONSTANTS.maxCacheEntries;

export function useGooglePlaces() {
  const [state, setState] = useState<State>({ status: "idle" });
  const online = useOnlineStatus();
  const cacheRef = useRef(
    new BoundedTtlCache<string, readonly PlacePrediction[]>(CACHE_CAPACITY, CACHE_TTL)
  );
  // Simple per-session token; regenerated on mount
  const sessionTokenPrefix = "sess_";
  const base36 = 36;
  const sessionTokenRef = useRef<string>(`${sessionTokenPrefix}${Date.now().toString(base36)}`);

  const fetchPredictions = useCallback(
    (input: string) => {
      // Respect Do Not Track: disable remote suggestions when DNT is enabled
      const doNotTrack = isDoNotTrackEnabled();

      if (!online) {
        setState({ status: "error", messageId: "err.provider_unavailable" });
        return;
      }
      const normalized = normalizeQuery(input);
      if (normalized.length < MIN_QUERY_LEN) {
        setState({ status: "idle" });
        return;
      }
      try {
        setState({ status: "loading" });
        const cached = cacheRef.current.get(normalized);
        if (cached !== undefined) {
          setState({ status: "success", predictions: cached });
          return;
        }
        const quota = getQuotaStatus();
        const rateLimited = isRateLimitedNow(quota);
        const available = isAutocompleteAvailable();
        if (doNotTrack || !available || rateLimited) {
          // Neutral copy per spec when disabled/rate-limited
          setState({ status: "error", messageId: "err.provider_unavailable" });
          return;
        }
        const resp = searchDestinations(normalized, sessionTokenRef.current);
        if (resp.success) {
          cacheRef.current.set(normalized, resp.data);
          setState({ status: "success", predictions: resp.data });
        } else {
          // Map Google Places error codes to copy deck IDs
          const code = resp.error.code;
          setState({
            status: "error",
            messageId: mapPlacesErrorToCopyId(code),
          });
        }
      } catch {
        setState({ status: "error", messageId: "err.provider_unavailable" });
      }
    },
    [online]
  );

  const debounceMs = GOOGLE_PLACES_CONSTANTS.debounceDelayMs as number;
  const debounced = useDebouncedCallback((q: string) => {
    // Fire-and-forget; intentionally not awaited
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchPredictions(q);
  }, debounceMs);

  return useMemo(() => ({ state, search: debounced }) as const, [state, debounced]);
}
