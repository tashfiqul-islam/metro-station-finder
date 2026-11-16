import { expect, test } from "vitest";

import { mapsAdapter, UNAVAILABLE } from "./index";

test("METRO-88 the adapter exposes the provider, and Maps is unavailable by default", () => {
  expect(new Set(Object.keys(mapsAdapter))).toEqual(new Set(["Provider"]));
  expect(UNAVAILABLE.status).toBe("unavailable");
  expect(UNAVAILABLE.routes).toBeNull();
  expect(UNAVAILABLE.places).toBeNull();
  expect(() => UNAVAILABLE.load()).not.toThrow();
});
