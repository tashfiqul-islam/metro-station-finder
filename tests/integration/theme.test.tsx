import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Theme, applyTheme } from "@/components/navbar/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  delete document.documentElement.dataset["theme"];
});

describe("Theme", () => {
  it("renders all three theme buttons", async () => {
    render(<Theme />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /light theme/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /system theme/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /dark theme/i })).toBeDefined();
    });
  });

  it("clicking Dark button writes to localStorage and adds .dark class to html", async () => {
    render(<Theme />);
    const darkBtn = await screen.findByRole("button", { name: /dark theme/i });
    fireEvent.click(darkBtn);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("clicking System button writes to localStorage", async () => {
    render(<Theme />);
    const systemBtn = await screen.findByRole("button", { name: /system theme/i });
    fireEvent.click(systemBtn);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("system");
    });
  });

  it("clicking Light button writes to localStorage and adds .light class to html", async () => {
    localStorage.setItem("theme", "dark");
    render(<Theme />);

    const lightBtn = await screen.findByRole("button", { name: /light theme/i });
    fireEvent.click(lightBtn);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("applyTheme returns safely when document is unavailable", () => {
    const originalDocument = globalThis.document;
    Reflect.deleteProperty(globalThis, "document");

    expect(() => applyTheme("dark")).not.toThrow();

    globalThis.document = originalDocument;
  });

  it("falls back to system when localStorage throws", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("no storage");
    });

    render(<Theme />);

    const systemBtn = await screen.findByRole("button", { name: /system theme/i });
    expect(systemBtn).toBeInTheDocument();

    getItemSpy.mockRestore();
  });

  it("updates theme on system preference changes when stored theme is system", async () => {
    localStorage.setItem("theme", "system");

    let onChange: (() => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_event: string, listener: () => void) => {
          onChange = listener;
        },
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );

    render(<Theme />);

    if (!onChange) {
      throw new Error("Missing media query listener");
    }

    onChange();

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("ignores system preference changes when stored theme is explicit", async () => {
    localStorage.setItem("theme", "light");

    let onChange: (() => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: (_event: string, listener: () => void) => {
          onChange = listener;
        },
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );

    render(<Theme />);

    if (!onChange) {
      throw new Error("Missing media query listener");
    }

    onChange();

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
