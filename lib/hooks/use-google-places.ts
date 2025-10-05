import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-value";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * Integrates with Google Places API for location autocomplete.
 * Respects online status and debounces requests to manage quota.
 * Phase 4: Stub implementation; full integration in Phase 7.
 */

type Prediction = {
  readonly description: string;
  readonly placeId: string;
};

type State =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly predictions: readonly Prediction[] }
  | { readonly status: "error"; readonly message: string };

const MIN_QUERY_LEN = 3;

export function useGooglePlaces() {
  const [state, setState] = useState<State>({ status: "idle" });
  const online = useOnlineStatus();

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!online) {
        setState({ status: "error", message: "Offline" });
        return;
      }
      if (input.trim().length < MIN_QUERY_LEN) {
        setState({ status: "idle" });
        return;
      }
      try {
        setState({ status: "loading" });
        // TODO Phase 7: integrate with @vis.gl/react-google-maps PlacesService
        // Stub returns empty results to maintain non-blocking architecture
        const predictions: Prediction[] = await Promise.resolve([]);
        setState({ status: "success", predictions });
      } catch {
        setState({ status: "error", message: "Failed to fetch predictions" });
      }
    },
    [online]
  );

  const debounceMs = 200;
  const debounced = useDebouncedCallback((q: string) => {
    // Fire-and-forget; intentionally not awaited
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchPredictions(q);
  }, debounceMs);

  return useMemo(
    () => ({ state, search: debounced }) as const,
    [state, debounced]
  );
}
