import type { WebVitalPayload } from "@metro/contracts";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

/**
 * Real-user Core Web Vitals (LCP, INP, CLS; METRO-44, ADR-0019). Each metric becomes a five-field payload
 * sent to the fixed same-origin path below. This module never reads `window.location`,
 * `document.referrer`, a query string or a position: the library's `navigationURL`, `entries` and `delta`
 * are dropped by `toPayload`, which copies the five contract fields and nothing else. The contract is
 * imported as a type only (no valibot in the browser bundle); the Worker validates every beacon, and the
 * tests check the built payload against the contract schema.
 */
export const VITALS_PATH = "/api/vitals";

function isSupported(metric: Metric): metric is Metric & {
  name: WebVitalPayload["name"];
  navigationType: WebVitalPayload["navigationType"];
} {
  return (
    (metric.name === "CLS" || metric.name === "INP" || metric.name === "LCP") &&
    metric.navigationType !== "soft-navigation"
  );
}

/** The one place a metric is turned into a payload. Undefined for a metric the contract does not carry. */
export function toPayload(metric: Metric): WebVitalPayload | undefined {
  if (!isSupported(metric)) return undefined;
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    id: metric.id,
  };
}

export type Send = (payload: WebVitalPayload) => void;

/**
 * A keepalive fetch survives page unload like sendBeacon, and unlike sendBeacon it can drop the Referer:
 * a same-origin request would otherwise carry the full page URL, query string included, to the Worker
 * (measured in Chromium, METRO-44 e2e). The failure is not reported anywhere: a lost sample is
 * acceptable and nothing may be logged.
 */
export const sendVital: Send = (payload) => {
  fetch(VITALS_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  }).catch(() => null);
};

type Report = (metric: Metric) => void;
export type Observer = (report: Report) => void;

/**
 * Registers the three observers. Off unless `enabled` (production builds only), so unit tests and the
 * dev server send nothing; tests inject the observers and the sender.
 */
export function startVitals(
  enabled: boolean = import.meta.env.PROD,
  observers: readonly Observer[] = [onCLS, onINP, onLCP],
  send: Send = sendVital,
): void {
  if (!enabled) return;
  const report: Report = (metric) => {
    const payload = toPayload(metric);
    if (payload !== undefined) send(payload);
  };
  for (const observe of observers) observe(report);
}
