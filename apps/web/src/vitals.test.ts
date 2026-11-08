import { isWebVitalPayload, type WebVitalPayload } from "@metro/contracts";
import { afterEach, expect, test, vi } from "vitest";
import type { Metric } from "web-vitals";

import { afterLoad, sendVital, startVitals, toPayload, VITALS_PATH, type Library } from "./vitals";

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

test("METRO-44 startVitals loads the library after the schedule fires and sends each reported metric", async () => {
  const sent: WebVitalPayload[] = [];
  const reporters: ((metric: Metric) => void)[] = [];
  const library: Library = {
    onCLS: (report) => reporters.push(report),
    onINP: (report) => reporters.push(report),
    onLCP: (report) => reporters.push(report),
  };
  const load = vi.fn(() => Promise.resolve(library));
  let task: (() => void) | undefined;
  startVitals(
    true,
    load,
    (payload) => sent.push(payload),
    (given) => {
      task = given;
    },
  );
  expect(load).not.toHaveBeenCalled(); // nothing loads before the page is ready
  task?.();
  await vi.waitFor(() => expect(reporters).toHaveLength(3));
  reporters[0]?.(metric());
  reporters[1]?.(metric({ navigationType: "soft-navigation" }));
  expect(sent).toHaveLength(1);
  expect(sent[0]?.name).toBe("LCP");
});

test("METRO-44 a failed library load is swallowed and sends nothing", async () => {
  const error = vi.spyOn(console, "error");
  const send = vi.fn();
  const load = vi.fn(() => Promise.reject(new Error("lat=23.81")));
  startVitals(true, load, send, (task) => task());
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await Promise.resolve();
  expect(send).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

test("METRO-44 startVitals is off by default under test: nothing is scheduled, loaded or sent", () => {
  const load = vi.fn();
  const schedule = vi.fn();
  startVitals(undefined, load, vi.fn(), schedule);
  expect(schedule).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
  expect(import.meta.env.PROD).toBe(false);
});

test("METRO-44 afterLoad runs at once when the page is loaded and on the load event otherwise", () => {
  const task = vi.fn();
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  afterLoad(task);
  expect(task).toHaveBeenCalledTimes(1);
  const later = vi.fn();
  vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
  afterLoad(later);
  expect(later).not.toHaveBeenCalled();
  window.dispatchEvent(new Event("load"));
  expect(later).toHaveBeenCalledTimes(1);
});

test("METRO-44 sendVital sends a JSON blob with sendBeacon to the fixed path", async () => {
  const beacon = vi.fn((_url: string, _data: Blob) => true);
  const fetcher = vi.fn();
  vi.stubGlobal("navigator", { sendBeacon: beacon });
  vi.stubGlobal("fetch", fetcher);
  const payload = expectPayload(metric());
  sendVital(payload);
  expect(beacon).toHaveBeenCalledTimes(1);
  const call = beacon.mock.calls[0];
  expect(call?.[0]).toBe(VITALS_PATH);
  expect(VITALS_PATH).toBe("/api/vitals");
  expect(call?.[1].type).toBe("application/json");
  expect(JSON.parse((await call?.[1].text()) ?? "")).toEqual(payload);
  expect(fetcher).not.toHaveBeenCalled();
});

test("METRO-44 sendVital falls back to a keepalive fetch when sendBeacon refuses or is missing", () => {
  const payload = expectPayload(metric());
  for (const nav of [{ sendBeacon: () => false }, {}]) {
    const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal("navigator", nav);
    vi.stubGlobal("fetch", fetcher);
    sendVital(payload);
    expect(fetcher).toHaveBeenCalledWith(VITALS_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    });
  }
});

test("METRO-44 a failed fallback fetch is swallowed and reports nothing", async () => {
  const error = vi.spyOn(console, "error");
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("fetch", () => Promise.reject(new Error("lat=23.81")));
  sendVital(expectPayload(metric()));
  await Promise.resolve();
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
});
