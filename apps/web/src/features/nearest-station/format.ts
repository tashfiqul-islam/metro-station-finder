const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

/** "2.31 km" for a straight-line distance in kilometres. */
export function formatKm(km: number): string {
  return `${km.toFixed(2)} km`;
}

/**
 * A straight-line distance that is an estimate (the device position is a circle, not a point): metres to the
 * nearest 10 below 1 km (never "0 m"), else kilometres with one decimal. The caller adds "about" and "est.".
 */
export function formatEstimate(km: number): string {
  // Not a number (never from the dataset): no figure rather than "NaN m".
  if (!Number.isFinite(km)) return "";
  const tens = Math.max(10, Math.round((km * 1000) / 10) * 10);
  return tens < 1000 ? `${tens} m` : `${(Math.round(km * 10) / 10).toFixed(1)} km`;
}

/** Whole metres below 1 km, else km with two decimals. */
export function formatWalkingDistance(meters: number): string {
  // Round first, so 999.5 m reads "1.00 km" and never "1000 m".
  const whole = Math.round(meters);
  return whole < 1000 ? `${whole} m` : formatKm(meters / 1000);
}

/**
 * An accuracy radius for the rough-location message, always approximate: "about 20 m" below 1 km, else
 * "about 25 km" (at most one decimal), and "more than 1000 km" from 1000 km up.
 */
export function formatAccuracy(meters: number): string {
  if (meters >= 1_000_000) return "more than 1000 km";
  const whole = Math.round(meters);
  if (whole < 1000) return `about ${whole} m`;
  const km = Math.round(meters / 100) / 10;
  return `about ${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

/** Whole minutes, at least 1. */
export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** "8 September 2022" from an ISO 8601 date (no time zone shift). */
export function formatIsoDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}
