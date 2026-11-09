import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("METRO-106 the worker entry binds the build-time config to the worker scope", async () => {
  const added: string[] = [];
  vi.stubGlobal("SW_CONFIG", { version: "t1", precache: ["/"], kill: false });
  vi.stubGlobal("self", {
    addEventListener: (type: string) => added.push(type),
    location: { origin: "https://metro.test" },
    caches: {},
    clients: {},
    skipWaiting: () => Promise.resolve(),
    fetch: () => Promise.reject(new Error("unused")),
  });
  await import("./sw");
  expect(added).toEqual(["install", "activate", "fetch", "message"]);
});

test("METRO-106 the entry refuses to run outside a service worker", async () => {
  vi.stubGlobal("SW_CONFIG", { version: "t1", precache: ["/"], kill: false });
  vi.stubGlobal("self", {});
  await expect(import("./sw")).rejects.toThrow("not a service worker");
});
