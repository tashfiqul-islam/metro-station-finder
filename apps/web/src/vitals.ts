import type { WebVitalPayload } from "@metro/contracts";
import type { Metric } from "web-vitals";

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

/** sendBeacon survives page unload; if the browser refuses it, fall back to a keepalive fetch. */
export const sendVital: Send = (payload) => {
  const body = JSON.stringify(payload);
  const beacon = new Blob([body], { type: "application/json" });
  if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(VITALS_PATH, beacon)) {
    return;
  }
  // The failure is not reported anywhere: a lost sample is acceptable and nothing may be logged.
  fetch(VITALS_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit",
  }).catch(() => null);
};

type Report = (metric: Metric) => void;
export interface Library {
  onCLS: (report: Report) => void;
  onINP: (report: Report) => void;
  onLCP: (report: Report) => void;
}

/** Runs `task` once the page has loaded, so the library never competes with first paint. */
export function afterLoad(task: () => void): void {
  if (document.readyState === "complete") task();
  else window.addEventListener("load", task, { once: true });
}

/**
 * Registers the three observers after the page loads, with web-vitals fetched by a dynamic import (a
 * separate chunk: this is for load speed, the bundle budget still counts every file). Off unless
 * `enabled` (production builds only), so unit tests and the dev server send nothing; tests inject the
 * rest.
 */
export function startVitals(
  enabled: boolean = import.meta.env.PROD,
  load: () => Promise<Library> = () => import("web-vitals"),
  send: Send = sendVital,
  schedule: (task: () => void) => void = afterLoad,
): void {
  if (!enabled) return;
  const report: Report = (metric) => {
    const payload = toPayload(metric);
    if (payload !== undefined) send(payload);
  };
  const register = async (): Promise<boolean> => {
    try {
      const library = await load();
      library.onCLS(report);
      library.onINP(report);
      library.onLCP(report);
      return true;
    } catch {
      // A failed chunk load costs only the sample; nothing is rendered or logged.
      return false;
    }
  };
  schedule(() => {
    void register();
  });
}
