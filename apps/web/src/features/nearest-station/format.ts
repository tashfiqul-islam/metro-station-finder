const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

/** "2.31 km" for a straight-line distance in kilometres. */
export function formatKm(km: number): string {
  return `${km.toFixed(2)} km`;
}

/** Whole metres below 1 km, else km with two decimals. */
export function formatWalkingDistance(meters: number): string {
  // Round first, so 999.5 m reads "1.00 km" and never "1000 m".
  const whole = Math.round(meters);
  return whole < 1000 ? `${whole} m` : formatKm(meters / 1000);
}

/** An accuracy radius: whole metres below 1 km, else km with at most one decimal ("25 km", "1.5 km"). */
export function formatAccuracy(meters: number): string {
  const whole = Math.round(meters);
  if (whole < 1000) return `${whole} m`;
  const km = Math.round(meters / 100) / 10;
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

/** Whole minutes, at least 1. */
export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/** "8 September 2022" from an ISO 8601 date (no time zone shift). */
export function formatIsoDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}
