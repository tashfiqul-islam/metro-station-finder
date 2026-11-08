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

test("METRO-105 where View Transitions exist the change runs inside one, loaded on first use", async () => {
  const animate = vi.fn();
  Reflect.set(document.documentElement, "animate", animate);
  const startViewTransition = vi.fn((update: () => void) => {
    update();
    return { ready: Promise.resolve(), finished: Promise.resolve() };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });
  try {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Theme: System. Switch to Light" }));
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Theme: Light. Switch to Dark" })).toBeTruthy();
    });
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  } finally {
    Reflect.deleteProperty(document, "startViewTransition");
    Reflect.deleteProperty(document.documentElement, "animate");
  }
});

test("METRO-105 under reduced motion the change is immediate even where View Transitions exist", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const startViewTransition = vi.fn();
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });
  try {
    render(<ThemeToggle />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Theme: System. Switch to Light" }));
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(startViewTransition).not.toHaveBeenCalled();
  } finally {
    Reflect.deleteProperty(document, "startViewTransition");
  }
});

test("METRO-105 the icon is decorative and the button has no inline style", () => {
  const { container } = render(<ThemeToggle />);
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("[style]")).toBeNull();
});
