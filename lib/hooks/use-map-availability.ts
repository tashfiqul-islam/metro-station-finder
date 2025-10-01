import { useMemo } from "react";

/**
 * Determines whether Google Maps can be rendered based on:
 * - API key presence
 * - Environment kill-switch (NEXT_PUBLIC_MAPS_DISABLED)
 * - Network connectivity
 * - Quota status
 *
 * Returns availability boolean and reason for debugging/fallback UI.
 *
 * Note: Directly accesses process.env for client-side compatibility with static export.
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
    // Access process.env directly for Next.js to inline during build
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapsDisabled = process.env.NEXT_PUBLIC_MAPS_DISABLED === "true";

    if (!apiKey || apiKey.length === 0) {
      return { available: false, reason: "missing-api-key" as const };
    }
    if (mapsDisabled) {
      return { available: false, reason: "disabled-by-env" as const };
    }
    if (!isOnline || quotaExceeded) {
      return { available: false, reason: "offline" as const };
    }
    return { available: true, reason: "ok" as const };
  }, [isOnline, quotaExceeded]);
}
