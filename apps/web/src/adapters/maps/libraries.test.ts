import { expect, test, vi } from "vitest";

import { MAPS_VERSION } from "./config";
import { createLoader, loadLibraries } from "./libraries";

const loader = vi.hoisted(() => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn((name: string) => Promise.resolve(`library:${name}`)),
}));

vi.mock("@googlemaps/js-api-loader", () => loader);

test("METRO-88 the loader sets the key and the pinned version once and imports both libraries", async () => {
  const setOptions = vi.fn<(options: { key: string; v: string }) => void>();
  const places = vi.fn(() => Promise.resolve("places-library"));
  const routes = vi.fn(() => Promise.resolve("routes-library"));
  const load = createLoader({ setOptions, places, routes });
  const first = load("fake-key-for-tests");
  const second = load("another-key");
  expect(second).toBe(first);
  expect(await first).toEqual({ places: "places-library", routes: "routes-library" });
  expect(setOptions).toHaveBeenCalledExactlyOnceWith({
    key: "fake-key-for-tests",
    v: MAPS_VERSION,
  });
  expect(places).toHaveBeenCalledTimes(1);
  expect(routes).toHaveBeenCalledTimes(1);
});

test("METRO-88 a failed load is kept and not retried", async () => {
  const places = vi.fn(() => Promise.reject(new Error("script blocked key=abc")));
  const routes = vi.fn(() => Promise.resolve("routes-library"));
  const load = createLoader({ setOptions: vi.fn(), places, routes });
  await expect(load("fake-key-for-tests")).rejects.toThrow("script blocked");
  await expect(load("fake-key-for-tests")).rejects.toThrow("script blocked");
  expect(places).toHaveBeenCalledTimes(1);
});

test("METRO-88 the real loader is wired to js-api-loader v2 setOptions and importLibrary", async () => {
  const libraries = await loadLibraries("fake-key-for-tests");
  expect(libraries).toEqual({ places: "library:places", routes: "library:routes" });
  expect(loader.setOptions).toHaveBeenCalledExactlyOnceWith({
    key: "fake-key-for-tests",
    v: MAPS_VERSION,
  });
  expect(loader.importLibrary.mock.calls).toEqual([["places"], ["routes"]]);
});
