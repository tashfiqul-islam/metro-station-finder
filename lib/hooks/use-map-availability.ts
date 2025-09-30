import { useMemo } from "react";
import { env } from "@/lib/env";

/**
 * Determines whether Google Maps can be rendered based on:
 * - API key presence
 * - Environment kill-switch (NEXT_PUBLIC_MAPS_DISABLED)
 * - Network connectivity
 * - Quota status
 *
 * Returns availability boolean and reason for debugging/fallback UI.
 */

export type MapUnavailableReason =
  | "disabled-by-env"
  | "missing-api-key"
  | "offline"
  | "ok";

type Options = {
  readonly isOnline?: boolean;
  readonly quotaExceeded?: boolean;
};

export function useMapAvailability({
  isOnline = typeof navigator !== "undefined" ? navigator.onLine : true,
  quotaExceeded = false,
}: Options = {}) {
  return useMemo(() => {
    // Check conditions in priority order (most critical first)
    if (env.nextPublicGoogleMapsApiKey.length === 0) {
      return { available: false, reason: "missing-api-key" as const };
    }
    if (env.nextPublicMapsDisabled) {
      return { available: false, reason: "disabled-by-env" as const };
    }
    if (!isOnline || quotaExceeded) {
      return { available: false, reason: "offline" as const };
    }
    return { available: true, reason: "ok" as const };
  }, [isOnline, quotaExceeded]);
}
