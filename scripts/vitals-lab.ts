/**
 * Pure rules of the lab web-vitals check (METRO-44 part C). The browser side lives in
 * `e2e/web-vitals-lab.e2e.ts`; everything that decides pass or fail is here so Bun proves it at 100 percent.
 */

/** Core Web Vitals "good" thresholds, assessed at the 75th percentile of page loads (web.dev/articles/vitals). */
export const LCP_LIMIT_MS = 2500;
export const CLS_LIMIT = 0.1;

/** One `layout-shift` entry as the page records it. */
export interface LayoutShift {
  readonly startTime: number;
  readonly value: number;
  readonly hadRecentInput: boolean;
}

export interface VitalsMeasurement {
  /** `startTime` of the last `largest-contentful-paint` entry, or null when the browser reported none. */
  readonly lcp: number | null;
  readonly shifts: readonly LayoutShift[];
}

/**
 * Cumulative Layout Shift as web.dev defines it: shifts with recent input are ignored, the rest are grouped
 * into session windows (a window ends after a 1 s gap between shifts or at 5 s total), and the score is the
 * largest window sum.
 */
export function cumulativeLayoutShift(shifts: readonly LayoutShift[]): number {
  let best = 0;
  let sum = 0;
  let windowStart = 0;
  let previous = 0;
  let open = false;
  for (const shift of shifts.filter((entry) => !entry.hadRecentInput)) {
    if (open && shift.startTime - previous < 1000 && shift.startTime - windowStart < 5000) {
      sum += shift.value;
    } else {
      sum = shift.value;
      windowStart = shift.startTime;
      open = true;
    }
    previous = shift.startTime;
    best = Math.max(best, sum);
  }
  return best;
}

export interface VitalsVerdict {
  readonly lcp: number | null;
  readonly cls: number;
  /** Empty when both vitals are within the limits. */
  readonly problems: string[];
}

/** A missing LCP fails: a browser or page that reports nothing must not read as a pass. */
export function evaluateVitals(measurement: VitalsMeasurement): VitalsVerdict {
  const cls = cumulativeLayoutShift(measurement.shifts);
  const problems: string[] = [];
  if (measurement.lcp === null)
    problems.push("LCP: the browser reported no largest-contentful-paint");
  else if (measurement.lcp > LCP_LIMIT_MS)
    problems.push(`LCP ${measurement.lcp.toFixed(0)} ms exceeds ${LCP_LIMIT_MS} ms`);
  if (cls > CLS_LIMIT) problems.push(`CLS ${cls.toFixed(4)} exceeds ${CLS_LIMIT}`);
  return { lcp: measurement.lcp, cls, problems };
}

/** One stable, greppable line for the CI log. */
export function describeVitals(verdict: VitalsVerdict): string {
  const lcp = verdict.lcp === null ? "none" : `${verdict.lcp.toFixed(0)}ms`;
  return `web-vitals-lab LCP=${lcp} (limit ${LCP_LIMIT_MS}ms) CLS=${verdict.cls.toFixed(4)} (limit ${CLS_LIMIT})`;
}
