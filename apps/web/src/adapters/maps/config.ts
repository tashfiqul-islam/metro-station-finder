/**
 * Maps JavaScript API version, pinned (ADR-0009). Web-verified 2026-11-07: a numeric version stays
 * available for about a year and a deleted one silently falls back to the default channel, so the live
 * check (`bun run smoke:live`) prints `google.maps.version`. Bump quarterly with `@types/google.maps`.
 */
export const MAPS_VERSION = "3.66";

/**
 * The browser key, supplied at build time as `VITE_GOOGLE_MAPS_API_KEY`. It is public once built:
 * safety comes from the referrer and API restrictions and daily quota caps set on the key, never from
 * secrecy. `null` when absent or blank; the key is never logged or returned in an error.
 */
export function readMapsKey(
  // Read statically, so the bundler inlines this one variable and not the whole environment object.
  value: unknown = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"],
): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
