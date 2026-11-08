import { afterEach, expect, test, vi } from "vitest";

import { REVEAL_MS, revealTheme } from "./reveal";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.className = "";
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
