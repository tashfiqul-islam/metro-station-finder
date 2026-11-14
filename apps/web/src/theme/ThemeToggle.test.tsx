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

test("METRO-105 two quick presses before React re-renders move two steps, not one", async () => {
  render(<ThemeToggle />);
  const button = screen.getByRole("button", { name: "Theme: System. Switch to Light" });
  await act(async () => {
    button.click();
    button.click();
  });
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  expect(screen.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeTruthy();
});

test("METRO-105 two quick presses while a reveal is running still cycle twice", async () => {
  const animate = vi.fn();
  Reflect.set(document.documentElement, "animate", animate);
  const startViewTransition = vi.fn((update: () => void) => {
    queueMicrotask(update);
    return { ready: Promise.resolve(), finished: Promise.resolve() };
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: startViewTransition,
  });
  try {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Theme: System. Switch to Light" });
    await act(async () => {
      button.click();
      button.click();
    });
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeTruthy();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  } finally {
    Reflect.deleteProperty(document, "startViewTransition");
    Reflect.deleteProperty(document.documentElement, "animate");
  }
});

test("METRO-105 the icon is decorative and the button has no inline style", () => {
  const { container } = render(<ThemeToggle />);
  expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(container.querySelector("[style]")).toBeNull();
});

/** Two theme-color tags as in `theme.test.ts`: each keeps its own colour in `data-system`. */
function addTags(): HTMLMetaElement[] {
  return [
    ["#aaaaaa", "light"],
    ["#111111", "dark"],
  ].map(([content, scheme]) => {
    const tag = document.createElement("meta");
    tag.name = "theme-color";
    tag.content = content ?? "";
    tag.setAttribute("media", `(prefers-color-scheme: ${scheme})`);
    tag.dataset["scheme"] = scheme;
    tag.dataset["system"] = content ?? "";
    document.head.append(tag);
    return tag;
  });
}

/** Another tab's change: set storage, then deliver the event it would raise here. */
async function remote(key: string | null, change: () => void): Promise<void> {
  change();
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
}

test("METRO-133 a theme saved in another tab applies here: html, button, both theme-color tags, no write", async () => {
  const tags = addTags();
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  try {
    render(<ThemeToggle />);
    await remote(THEME_KEY, () => {
      localStorage.setItem(THEME_KEY, "dark");
      setItem.mockClear();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeTruthy();
    expect(tags.map((tag) => tag.content)).toEqual(["#111111", "#111111"]);
    expect(setItem).not.toHaveBeenCalled();
  } finally {
    setItem.mockRestore();
    for (const tag of tags) tag.remove();
  }
});

test("METRO-133 localStorage.clear() in another tab (key null) returns this tab to System", async () => {
  localStorage.setItem(THEME_KEY, "dark");
  document.documentElement.setAttribute("data-theme", "dark");
  render(<ThemeToggle />);
  await remote(null, () => {
    localStorage.clear();
  });
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
});

test("METRO-133 an event for another key changes nothing, and a stored invalid value reads as System", async () => {
  render(<ThemeToggle />);
  await remote("other", () => {
    localStorage.setItem(THEME_KEY, "dark");
  });
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
  await remote(THEME_KEY, () => {
    localStorage.setItem(THEME_KEY, "dark");
  });
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  await remote(THEME_KEY, () => {
    localStorage.setItem(THEME_KEY, "blue");
  });
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
});

test("METRO-133 a pageshow after storage changed applies the stored theme", async () => {
  render(<ThemeToggle />);
  localStorage.setItem(THEME_KEY, "light");
  await act(async () => {
    window.dispatchEvent(new Event("pageshow"));
  });
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  expect(screen.getByRole("button", { name: "Theme: Light. Switch to Dark" })).toBeTruthy();
});

test("METRO-133 after unmount, storage and pageshow events change nothing", async () => {
  const { unmount } = render(<ThemeToggle />);
  // Live first, so the test fails where no listener exists at all.
  await remote(THEME_KEY, () => {
    localStorage.setItem(THEME_KEY, "dark");
  });
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  unmount();
  document.documentElement.removeAttribute("data-theme");
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY }));
    window.dispatchEvent(new Event("pageshow"));
  });
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});

test("METRO-133 a press after a remote change to Dark goes to System, not past the stale value", async () => {
  render(<ThemeToggle />);
  await remote(THEME_KEY, () => {
    localStorage.setItem(THEME_KEY, "dark");
  });
  await press("Theme: Dark. Switch to System");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(localStorage.getItem(THEME_KEY)).toBe("system");
  expect(screen.getByRole("button", { name: "Theme: System. Switch to Light" })).toBeTruthy();
});
