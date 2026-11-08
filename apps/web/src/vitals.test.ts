import { isWebVitalPayload, type WebVitalPayload } from "@metro/contracts";
import { afterEach, expect, test, vi } from "vitest";
import type { Metric } from "web-vitals";

import { sendVital, startVitals, toPayload, VITALS_PATH, type Observer } from "./vitals";

// Synthetic metric. The library fields that carry a URL or a position (navigationURL, entries) are
// filled with coordinate- and query-like values to prove none of them can reach a payload.
function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    name: "LCP",
    value: 812.4,
    rating: "good",
    delta: 812.4,
    id: "v5-1731000000000-4567890123456",
    entries: [],
    navigationType: "navigate",
    navigationId: 1,
    navigationURL: "https://example.test/?lat=23.81&lng=90.41&q=SECRET",
    ...overrides,
  };
}

function expectPayload(metricValue: Metric): WebVitalPayload {
  const payload = toPayload(metricValue);
  if (payload === undefined) throw new Error("expected a payload");
  return payload;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("METRO-44 a payload has exactly the five contract keys and parses under the contract", () => {
  const payload = expectPayload(metric());
  expect(new Set(Object.keys(payload))).toEqual(
    new Set(["id", "name", "navigationType", "rating", "value"]),
  );
  expect(isWebVitalPayload(payload)).toBe(true);
  for (const name of ["CLS", "INP", "LCP"] as const) {
    expect(isWebVitalPayload(expectPayload(metric({ name, value: 0.05 })))).toBe(true);
  }
});

test("METRO-44 a payload built from a metric never carries a URL, query string, lat or lng", () => {
  const text = JSON.stringify(expectPayload(metric()));
  for (const fragment of [
    "lat",
    "lng",
    "latitude",
    "longitude",
    "?",
    "=",
    "http",
    "SECRET",
    "23.81",
  ]) {
    expect(text, fragment).not.toContain(fragment);
  }
});

test("METRO-44 a metric the contract does not carry produces no payload", () => {
  expect(toPayload(metric({ navigationType: "soft-navigation" }))).toBeUndefined();
  expect(toPayload(metric({ name: "FCP" }))).toBeUndefined();
  expect(toPayload(metric({ name: "TTFB" }))).toBeUndefined();
});

test("METRO-44 startVitals registers every observer and sends each reported metric", () => {
  const sent: WebVitalPayload[] = [];
  const reporters: ((metric: Metric) => void)[] = [];
  const observer: Observer = (report) => reporters.push(report);
  startVitals(true, [observer, observer, observer], (payload) => sent.push(payload));
  expect(reporters).toHaveLength(3);
  reporters[0]?.(metric());
  reporters[1]?.(metric({ navigationType: "soft-navigation" }));
  expect(sent).toHaveLength(1);
  expect(sent[0]?.name).toBe("LCP");
});

test("METRO-44 startVitals is off by default under test: nothing is registered or sent", () => {
  const observer = vi.fn();
  startVitals(undefined, [observer], vi.fn());
  expect(observer).not.toHaveBeenCalled();
  expect(import.meta.env.PROD).toBe(false);
});

test("METRO-44 sendVital posts the payload as JSON to the fixed path with keepalive, no credentials and no referrer", () => {
  const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  vi.stubGlobal("fetch", fetcher);
  const payload = expectPayload(metric());
  sendVital(payload);
  expect(VITALS_PATH).toBe("/api/vitals");
  expect(fetcher).toHaveBeenCalledWith(VITALS_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
});

test("METRO-44 a failed send is swallowed and reports nothing", async () => {
  const error = vi.spyOn(console, "error");
  vi.stubGlobal("fetch", () => Promise.reject(new Error("lat=23.81")));
  sendVital(expectPayload(metric()));
  await Promise.resolve();
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
});
