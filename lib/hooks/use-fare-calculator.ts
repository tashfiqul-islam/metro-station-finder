import { useMemo } from "react";
import { calculateFare } from "@/lib/data/fares";
import type { FareInput } from "@/lib/schemas";
import type { StationId } from "@/lib/types";

type Options = {
  readonly origin?: StationId;
  readonly destination?: StationId;
};

/**
 * Calculates fare between two stations with memoization.
 * Returns undefined if either station is missing or calculation fails.
 */
export function useFareCalculator({ origin, destination }: Options) {
  return useMemo(() => {
    if (origin === undefined || destination === undefined) {
      return;
    }
    try {
      return calculateFare(origin, destination) as unknown as FareInput;
    } catch {
      return;
    }
  }, [origin, destination]);
}
