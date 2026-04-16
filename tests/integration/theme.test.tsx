import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { Theme } from "@/components/navbar/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  delete document.documentElement.dataset["theme"];
});

describe("Theme", () => {
  it("renders the theme trigger button", async () => {
    render(<Theme />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change theme/i })).toBeDefined();
    });
  });

  it("clicking Dark option writes to localStorage and adds .dark class to html", async () => {
    render(<Theme />);
    const trigger = await screen.findByRole("button", { name: /change theme/i });
    fireEvent.click(trigger);

    const darkItem = await screen.findByRole("menuitemradio", { name: /dark/i });
    fireEvent.click(darkItem);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("clicking System option writes to localStorage", async () => {
    render(<Theme />);
    const trigger = await screen.findByRole("button", { name: /change theme/i });
    fireEvent.click(trigger);

    const systemItem = await screen.findByRole("menuitemradio", { name: /system/i });
    fireEvent.click(systemItem);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("system");
    });
  });

  it("clicking Light option writes to localStorage and adds .light class to html", async () => {
    // Start in dark mode
    localStorage.setItem("theme", "dark");
    render(<Theme />);

    const trigger = await screen.findByRole("button", { name: /change theme/i });
    fireEvent.click(trigger);

    const lightItem = await screen.findByRole("menuitemradio", { name: /light/i });
    fireEvent.click(lightItem);

    await waitFor(() => {
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });
});
