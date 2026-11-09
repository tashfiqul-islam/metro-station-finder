import { describe, expect, test, vi } from "vitest";

import { route, attach, type WorkerConfig, type WorkerScope } from "./worker";

/**
 * METRO-122: the Open Graph share image is for link-preview crawlers, so the shell worker must neither
 * precache it nor answer a request for it. This file is separate from `worker.test.ts` on purpose: it pins
 * only this one path and leaves the worker's general cases where they are.
 */
const ORIGIN = "https://metro.test";
const SHARE = `${ORIGIN}/og/og-default.png`;
const config: WorkerConfig = {
  version: "v1",
  precache: ["/", "/assets/app-1.js", "/theme-boot.js"],
  kill: false,
};
const shell = new Set(config.precache);

describe("the share image is not handled by the shell worker (METRO-122)", () => {
  test("route passes it, as an image request and as a top-level navigation", () => {
    expect(route({ method: "GET", mode: "no-cors", url: SHARE }, ORIGIN, shell)).toBe("pass");
    expect(route({ method: "GET", mode: "navigate", url: SHARE }, ORIGIN, shell)).toBe("pass");
    expect(route({ method: "GET", mode: "cors", url: `${SHARE}?v=2` }, ORIGIN, shell)).toBe("pass");
  });

  test("the fetch handler leaves it to the browser: no response, no cache opened, no fetch", () => {
    const listeners = new Map<string, (event: never) => void>();
    const caches = { open: vi.fn(), keys: vi.fn(), delete: vi.fn() };
    const fetcher = vi.fn();
    const scope: WorkerScope = {
      caches,
      fetch: fetcher,
      location: { origin: ORIGIN },
      registration: { unregister: () => Promise.resolve(true) },
      clients: { claim: () => Promise.resolve() },
      skipWaiting: () => Promise.resolve(),
      setTimeout: vi.fn(),
      addEventListener: (type, listener) => {
        listeners.set(type, listener);
      },
    };
    attach(scope, config);
    const respondWith = vi.fn();
    const handler = listeners.get("fetch");
    expect(handler).toBeDefined();
    Reflect.apply(handler ?? vi.fn(), undefined, [{ request: new Request(SHARE), respondWith }]);
    expect(respondWith).not.toHaveBeenCalled();
    expect(caches.open).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
