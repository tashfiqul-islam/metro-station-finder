import { expect, test } from "vitest";

import { MAPS_VERSION, readMapsKey } from "./config";

test("METRO-88 the Maps version is a pinned numeric version, not a channel", () => {
  expect(MAPS_VERSION).toMatch(/^3\.\d{2}$/u);
});

test("METRO-88 readMapsKey returns a trimmed key and null for a missing, blank or non-string value", () => {
  expect(readMapsKey({ VITE_GOOGLE_MAPS_API_KEY: "  fake-key-for-tests " })).toBe(
    "fake-key-for-tests",
  );
  expect(readMapsKey({})).toBeNull();
  expect(readMapsKey({ VITE_GOOGLE_MAPS_API_KEY: "   " })).toBeNull();
  expect(readMapsKey({ VITE_GOOGLE_MAPS_API_KEY: 42 })).toBeNull();
});

test("METRO-88 the default reads the build environment, which the web Vitest config blanks", () => {
  expect(import.meta.env["VITE_GOOGLE_MAPS_API_KEY"]).toBe("");
  expect(readMapsKey()).toBeNull();
});
