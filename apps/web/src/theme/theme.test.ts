import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  REVEAL_MS,
  THEME_KEY,
  THEME_ORDER,
  applyPreference,
  isThemePreference,
  nextPreference,
  readPreference,
  revealTheme,
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

function stubMotion(reduced: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
  }));
}

const settled = { ready: Promise.resolve(), finished: Promise.resolve() };
const skipped = (): Promise<never> => Promise.reject(new DOMException("skipped", "AbortError"));

test("METRO-105 without View Transitions the theme changes at once", async () => {
  stubMotion(false);
  const change = vi.fn();
  await revealTheme(change, { x: 1, y: 2 }, { documentElement: document.documentElement });
  expect(change).toHaveBeenCalledTimes(1);
  expect(document.documentElement.classList.contains("vt-theme")).toBe(false);
});

test("METRO-105 under reduced motion the theme changes at once even with View Transitions", async () => {
  stubMotion(true);
  const startViewTransition = vi.fn();
  const change = vi.fn();
  await revealTheme(
    change,
    { x: 1, y: 2 },
    { documentElement: document.documentElement, startViewTransition },
  );
  expect(change).toHaveBeenCalledTimes(1);
  expect(startViewTransition).not.toHaveBeenCalled();
});

test("METRO-105 with View Transitions the change runs inside the transition and a circle reveal is animated", async () => {
  stubMotion(false);
  const animate = vi.fn();
  const root = document.documentElement;
  Reflect.set(root, "animate", animate);
  let during = false;
  const startViewTransition = (callback: () => void) => {
    during = root.classList.contains("vt-theme");
    callback();
    return settled;
  };
  const change = vi.fn();
  await revealTheme(change, { x: 10, y: 20 }, { documentElement: root, startViewTransition });
  expect(during).toBe(true);
  expect(change).toHaveBeenCalledTimes(1);
  expect(animate).toHaveBeenCalledWith(
    {
      clipPath: [
        "circle(0px at 10px 20px)",
        expect.stringMatching(/^circle\([\d.]+px at 10px 20px\)$/u),
      ],
    },
    expect.objectContaining({
      duration: REVEAL_MS,
      pseudoElement: "::view-transition-new(root)",
    }),
  );
  expect(root.classList.contains("vt-theme")).toBe(false);
  Reflect.deleteProperty(root, "animate");
});

test("METRO-105 a skipped transition still applies the change once and clears the marker", async () => {
  stubMotion(false);
  const change = vi.fn();
  await revealTheme(
    change,
    { x: 0, y: 0 },
    {
      documentElement: document.documentElement,
      startViewTransition: () => ({ ready: skipped(), finished: Promise.resolve() }),
    },
  );
  expect(change).toHaveBeenCalledTimes(1);
  expect(document.documentElement.classList.contains("vt-theme")).toBe(false);
});

test("METRO-105 a skipped transition whose callback did run does not apply the change twice", async () => {
  stubMotion(false);
  const change = vi.fn();
  await revealTheme(
    change,
    { x: 0, y: 0 },
    {
      documentElement: document.documentElement,
      startViewTransition: (callback) => {
        callback();
        return { ready: skipped(), finished: Promise.resolve() };
      },
    },
  );
  expect(change).toHaveBeenCalledTimes(1);
});

beforeEach(() => {
  localStorage.clear();
});
