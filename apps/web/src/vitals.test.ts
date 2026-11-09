import { isWebVitalPayload, type WebVitalPayload } from "@metro/contracts";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Metric } from "web-vitals";

import {
  afterIdle,
  loadObservers,
  sendVital,
  startVitals,
  toPayload,
  VITALS_PATH,
  type Observer,
  type Schedule,
} from "./vitals";

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

const now: Schedule = (task) => {
  task();
};
const settle = async () => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

test("METRO-44 startVitals registers every observer and sends each reported metric", async () => {
  const sent: WebVitalPayload[] = [];
  const reporters: ((metric: Metric) => void)[] = [];
  const observer: Observer = (report) => reporters.push(report);
  startVitals(
    true,
    () => Promise.resolve([observer, observer, observer]),
    (payload) => sent.push(payload),
    now,
  );
  await settle();
  expect(reporters).toHaveLength(3);
  reporters[0]?.(metric());
  reporters[1]?.(metric({ navigationType: "soft-navigation" }));
  expect(sent).toHaveLength(1);
  expect(sent[0]?.name).toBe("LCP");
});

test("METRO-104 startVitals loads nothing until the scheduler runs the task", async () => {
  const load = vi.fn(() => Promise.resolve([]));
  let task: (() => void) | undefined;
  startVitals(true, load, vi.fn(), (scheduled) => {
    task = scheduled;
  });
  await settle();
  expect(load).not.toHaveBeenCalled();
  task?.();
  expect(load).toHaveBeenCalledTimes(1);
});

test("METRO-44 startVitals is off by default under test: nothing is scheduled, loaded or sent", () => {
  const load = vi.fn(() => Promise.resolve([]));
  const schedule = vi.fn();
  startVitals(undefined, load, vi.fn(), schedule);
  expect(schedule).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
  expect(import.meta.env.PROD).toBe(false);
});

test("METRO-104 a failed chunk load or registration is swallowed: no log, no throw, no unhandled rejection", async () => {
  const error = vi.spyOn(console, "error");
  const warn = vi.spyOn(console, "warn");
  const unhandled = vi.fn();
  process.on("unhandledRejection", unhandled);
  startVitals(
    true,
    () =>
      Promise.reject(
        new TypeError("Failed to fetch dynamically imported module: https://x.test/?lat=23.81"),
      ),
    vi.fn(),
    now,
  );
  startVitals(
    true,
    () =>
      Promise.resolve([
        () => {
          throw new RangeError("lat=23.81");
        },
      ]),
    vi.fn(),
    now,
  );
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 0));
  process.off("unhandledRejection", unhandled);
  expect(error).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  expect(unhandled).not.toHaveBeenCalled();
});

test("METRO-104 a throwing first observer does not stop the others from registering", async () => {
  const error = vi.spyOn(console, "error");
  const second = vi.fn();
  const third = vi.fn();
  startVitals(
    true,
    () =>
      Promise.resolve([
        () => {
          throw new RangeError("lat=23.81");
        },
        second,
        third,
      ]),
    vi.fn(),
    now,
  );
  await settle();
  expect(second).toHaveBeenCalledTimes(1);
  expect(third).toHaveBeenCalledTimes(1);
  expect(error).not.toHaveBeenCalled();
});

test("METRO-104 loadObservers resolves the three web-vitals observers from a dynamic import", async () => {
  const observers = await loadObservers();
  expect(observers).toHaveLength(3);
  for (const observer of observers) expect(observer).toBeTypeOf("function");
});

describe("METRO-104 afterIdle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("waits for the load event when the page is still loading, then uses requestIdleCallback", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    const task = vi.fn();
    afterIdle(task);
    expect(idle).not.toHaveBeenCalled();
    dispatchEvent(new Event("load"));
    expect(idle).toHaveBeenCalledWith(task, { timeout: 1000 });
  });

  test("with a loaded page and no requestIdleCallback it falls back to a 1 s timer", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    vi.stubGlobal("requestIdleCallback", null);
    const task = vi.fn();
    afterIdle(task);
    vi.advanceTimersByTime(999);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("with a loaded page it asks for an idle callback at once", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    afterIdle(vi.fn());
    expect(idle).toHaveBeenCalledTimes(1);
  });
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

test("METRO-106 sendVital sends nothing while the browser reports no connection, and sends again when it returns", () => {
  const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("navigator", { onLine: false });
  sendVital(expectPayload(metric()));
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubGlobal("navigator", { onLine: true });
  sendVital(expectPayload(metric()));
  expect(fetcher).toHaveBeenCalledOnce();
});
