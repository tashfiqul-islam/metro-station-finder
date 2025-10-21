import { STATION_CONSTANTS } from "@/lib/config/constants";

/**
 * Simple, fast non-cryptographic hash for ETag-like strings without bitwise ops.
 * Uses modular multiply-add and encodes in configured base.
 */
export function hashStringToEtag(input: string): string {
  let hash = 0;
  const multiplier = STATION_CONSTANTS.hashMultiplier;
  const modulus = STATION_CONSTANTS.hashModulo;
  const base = STATION_CONSTANTS.hashBase;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = (hash * multiplier + ch) % modulus;
  }
  const positive = hash < 0 ? -hash : hash;
  return Math.trunc(positive).toString(base);
}
