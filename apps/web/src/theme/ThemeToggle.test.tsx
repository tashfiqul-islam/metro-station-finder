import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { THEME_KEY } from "./theme";
import { ThemeToggle } from "./ThemeToggle";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

async function press(name: string): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

test("METRO-105 the button names the current theme and the next one", () => {
  render(<ThemeToggle />);
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
});

test("METRO-105 it starts from the saved preference", () => {
  localStorage.setItem(THEME_KEY, "dark");
  render(<ThemeToggle />);
  expect(screen.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeTruthy();
});

test("METRO-105 each press cycles System, Light, Dark, System, saving and applying every step", async () => {
  render(<ThemeToggle />);
  const root = document.documentElement;
  await press("Theme: System. Switch to Light");
  expect(root.getAttribute("data-theme")).toBe("light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
  await press("Theme: Light. Switch to Dark");
  expect(root.getAttribute("data-theme")).toBe("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  await press("Theme: Dark. Switch to System");
  expect(root.hasAttribute("data-theme")).toBe(false);
  expect(localStorage.getItem(THEME_KEY)).toBe("system");
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
});

test("METRO-105 the icon is decorative and the button has no inline style", () => {
  const { container } = render(<ThemeToggle />);
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("[style]")).toBeNull();
});
