import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { THEME_KEY } from "./theme";
import { ThemeToggle } from "./ThemeToggle";

// The reveal module cannot be loaded (offline, a stale chunk name): importing it rejects.
vi.mock("./reveal", () => {
  throw new Error("chunk could not be loaded");
});

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  Reflect.deleteProperty(document, "startViewTransition");
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-105 when the reveal module cannot load the theme still changes once and nothing is rendered about it", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(document, "startViewTransition", { configurable: true, value: vi.fn() });
  const save = vi.spyOn(Storage.prototype, "setItem");
  const { container } = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole("button", { name: "Theme: System. Switch to Light" }));
  await vi.waitFor(() => {
    expect(screen.getByRole("button", { name: "Theme: Light. Switch to Dark" })).toBeTruthy();
  });
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
  expect(save).toHaveBeenCalledTimes(1);
  // No error text reaches the page: the button is all there is.
  expect(container.textContent).toBe("");
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
