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

/**
 * A keepalive fetch survives page unload like sendBeacon, and unlike sendBeacon it can drop the Referer:
 * a same-origin request would otherwise carry the full page URL, query string included, to the Worker
 * (measured in Chromium, METRO-44 e2e). The failure is not reported anywhere: a lost sample is
 * acceptable and nothing may be logged.
 */
export const sendVital: Send = (payload) => {
  // No connection: the sample is dropped rather than queued or retried (METRO-106, ADR-0023).
  if (!navigator.onLine) return;
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
export type LoadObservers = () => Promise<readonly Observer[]>;
export type Schedule = (task: () => void) => void;

/**
 * The library is a dynamic import, so it is its own chunk and stays out of the first-visit set (METRO-104,
 * ADR-0020). The observers read buffered performance entries, so registering after load still sees the
 * paint and layout-shift history.
 */
export const loadObservers: LoadObservers = async () => {
  const { onCLS, onINP, onLCP } = await import("web-vitals");
  return [onCLS, onINP, onLCP];
};

/** Longest wait for an idle period before the task runs anyway. */
const IDLE_TIMEOUT_MS = 1000;
/** Where `requestIdleCallback` is missing (Safari), a timer stands in. */
const FALLBACK_DELAY_MS = 1000;

/** Runs `task` once the page has loaded and the browser is idle, so the chunk never competes with the first paint. */
export const afterIdle: Schedule = (task) => {
  const idle = (): void => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(task, FALLBACK_DELAY_MS);
  };
  if (document.readyState === "complete") idle();
  else addEventListener("load", idle, { once: true });
};

/**
 * Registers the three observers once the page is idle. Off unless `enabled` (production builds only), so
 * unit tests and the dev server send nothing; tests inject the loader, the scheduler and the sender. A
 * failed chunk load (offline, 404) or registration is dropped without a log: a lost sample is acceptable,
 * the error text can carry a URL, and the page must never break.
 */
export function startVitals(
  enabled: boolean = import.meta.env.PROD,
  load: LoadObservers = loadObservers,
  send: Send = sendVital,
  schedule: Schedule = afterIdle,
): void {
  if (!enabled) return;
  const report: Report = (metric) => {
    const payload = toPayload(metric);
    if (payload !== undefined) send(payload);
  };
  const register = async (): Promise<void> => {
    for (const observe of await load()) {
      // One failing observer must not skip the others; the error text is never kept or logged.
      try {
        observe(report);
      } catch {
        continue;
      }
    }
  };
  schedule(() => {
    register().catch(() => null);
  });
}
