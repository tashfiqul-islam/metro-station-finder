import { runInNewContext } from "node:vm";

import { expect, test } from "vitest";

import source from "../../public/theme-boot.js?raw";
import { THEME_KEY } from "./theme";

/** A stand-in for <html> that records attribute changes, so the shipped file runs against nothing else. */
function fakeRoot(initial: string | null) {
  const attributes = new Map<string, string>();
  if (initial !== null) attributes.set("data-theme", initial);
  return {
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
}

/** Runs the shipped file once in a sandbox that has only `document` and the given `localStorage`. */
function boot(storage: { getItem: (key: string) => string | null }, before: string | null = null) {
  const root = fakeRoot(before);
  runInNewContext(source, { document: { documentElement: root }, localStorage: storage });
  return root.attributes.get("data-theme") ?? null;
}

const saved = (value: string | null) => ({
  getItem: (key: string) => (key === THEME_KEY ? value : "wrong key"),
});

test("METRO-105 the boot script reads the same key the theme store writes", () => {
  expect(source).toContain(`"${THEME_KEY}"`);
});

test("METRO-105 a saved dark or light theme is on <html> after the script runs", () => {
  expect(boot(saved("dark"))).toBe("dark");
  expect(boot(saved("light"))).toBe("light");
  expect(boot(saved("light"), "dark")).toBe("light");
});

test("METRO-105 System, a stray value and no value leave no data-theme so the OS decides", () => {
  for (const value of ["system", "purple", "", "Dark", null]) {
    expect(boot(saved(value), "dark"), String(value)).toBeNull();
  }
});

test("METRO-105 blocked storage does not throw and follows the OS", () => {
  const blocked = {
    getItem: (): string => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  expect(boot(blocked, "dark")).toBeNull();
});

test("METRO-105 the script is a plain classic script: no import, no inline-only API, no network", () => {
  expect(source).not.toMatch(
    /\bimport\b|\bexport\b|fetch\(|XMLHttpRequest|eval\(|document\.write/u,
  );
});
