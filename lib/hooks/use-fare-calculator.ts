import { useMemo } from "react";
import { calculateFare } from "@/lib/api/fares";
import type { StationId } from "@/lib/types";
import type { Fare } from "@/lib/types/fare";

type Options = {
  readonly origin?: StationId;
  readonly destination?: StationId;
  readonly discountType?: "single-journey" | "mrt-pass" | "rapid-pass";
};

/**
 * Calculates fare between two stations with memoization.
 * Returns undefined if either station is missing or calculation fails.
 */
export function useFareCalculator({
  origin,
  destination,
  discountType = "single-journey",
}: Options): Fare | undefined {
  return useMemo(() => {
    if (origin === undefined || destination === undefined) {
      return;
    }
    try {
      const result = calculateFare(origin, destination, { type: discountType });
      return result.success ? result.data : undefined;
    } catch {
      return;
    }
  }, [origin, destination, discountType]);
}
