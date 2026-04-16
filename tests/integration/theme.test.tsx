import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Theme } from "@/components/navbar/theme";

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
});
