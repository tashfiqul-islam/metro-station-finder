import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  THEME_KEY,
  THEME_ORDER,
  applyPreference,
  isThemePreference,
  nextPreference,
  readPreference,
  savePreference,
} from "./theme";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.className = "";
});

test("METRO-105 the storage key is the one theme-boot.js reads", () => {
  expect(THEME_KEY).toBe("msf-theme");
  expect(THEME_ORDER).toEqual(["system", "light", "dark"]);
});

test("METRO-105 the preference cycles System, Light, Dark, System", () => {
  expect(nextPreference("system")).toBe("light");
  expect(nextPreference("light")).toBe("dark");
  expect(nextPreference("dark")).toBe("system");
});

test("METRO-105 isThemePreference accepts exactly the three values", () => {
  for (const value of ["system", "light", "dark"]) expect(isThemePreference(value)).toBe(true);
  for (const value of ["", "Dark", null, undefined, 1, {}])
    expect(isThemePreference(value)).toBe(false);
});

test("METRO-105 readPreference returns a saved value and System for anything else", () => {
  expect(readPreference({ getItem: () => "dark" })).toBe("dark");
  expect(readPreference({ getItem: () => "light" })).toBe("light");
  expect(readPreference({ getItem: () => null })).toBe("system");
  expect(readPreference({ getItem: () => "purple" })).toBe("system");
  expect(readPreference(null)).toBe("system");
});

test("METRO-105 readPreference survives storage that throws", () => {
  const blocked = {
    getItem: (): string => {
      throw new DOMException("blocked", "SecurityError");
    },
  };
  expect(readPreference(blocked)).toBe("system");
});

test("METRO-105 readPreference and savePreference use window.localStorage by default", () => {
  localStorage.clear();
  savePreference("dark");
  expect(localStorage.getItem("msf-theme")).toBe("dark");
  expect(readPreference()).toBe("dark");
  localStorage.clear();
});

test("METRO-105 blocked window.localStorage reads as System and a save is ignored", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  expect(readPreference()).toBe("system");
  expect(() => savePreference("light")).not.toThrow();
});

test("METRO-105 savePreference ignores a store that throws", () => {
  const full = {
    setItem: (): void => {
      throw new DOMException("full", "QuotaExceededError");
    },
  };
  expect(() => savePreference("light", full)).not.toThrow();
  expect(() => savePreference("light", null)).not.toThrow();
});

test("METRO-105 applyPreference sets data-theme for light and dark and removes it for System", () => {
  const root = document.documentElement;
  applyPreference("dark", root);
  expect(root.getAttribute("data-theme")).toBe("dark");
  applyPreference("light", root);
  expect(root.getAttribute("data-theme")).toBe("light");
  applyPreference("system", root);
  expect(root.hasAttribute("data-theme")).toBe(false);
});

beforeEach(() => {
  localStorage.clear();
});
