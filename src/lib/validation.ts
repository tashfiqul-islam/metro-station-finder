import * as v from "valibot";

// ─── Primitive schemas ────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const SlugSchema = v.pipe(
  v.string(),
  v.regex(SLUG_REGEX, "Slug must be lowercase kebab-case (e.g. mirpur-10)"),
);

export const LatitudeSchema = v.pipe(
  v.number(),
  v.minValue(-90, "Latitude must be >= -90"),
  v.maxValue(90, "Latitude must be <= 90"),
);

export const LongitudeSchema = v.pipe(
  v.number(),
  v.minValue(-180, "Longitude must be >= -180"),
  v.maxValue(180, "Longitude must be <= 180"),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse `data` against `schema` and return the typed result.
 * Throws `v.ValiError` on failure — use at module load to assert invariants.
 */
export const parseOrThrow = <TOutput>(
  schema: v.GenericSchema<unknown, TOutput>,
  data: unknown,
): TOutput => v.parse(schema, data);

/** Returns true if `value` is a valid kebab-case slug. */
export const isSlug = (value: string): boolean => SLUG_REGEX.test(value);

/** Clamps a latitude value to the valid range [-90, 90]. */
export const clampLatitude = (lat: number): number => Math.max(-90, Math.min(90, lat));

/** Clamps a longitude value to the valid range [-180, 180]. */
export const clampLongitude = (lng: number): number => Math.max(-180, Math.min(180, lng));
