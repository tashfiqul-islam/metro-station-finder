import { expect, test } from "vitest";

import { mapsAdapter, UNAVAILABLE } from "./index";

test("METRO-88 the adapter exposes the provider and the search, and Maps is unavailable by default", () => {
  expect(new Set(Object.keys(mapsAdapter))).toEqual(new Set(["PlaceSearch", "Provider"]));
  expect(UNAVAILABLE.status).toBe("unavailable");
  expect(UNAVAILABLE.routes).toBeNull();
  expect(() => UNAVAILABLE.load()).not.toThrow();
});
