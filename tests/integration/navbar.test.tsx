import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { NavBar } from "@/components/ui/navbar";

const renderNavBar = async (initialPath = "/") => {
  const result = await act(async () => {
    const rootRoute = createRootRoute({ component: NavBar });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: [initialPath] }),
      routeTree: rootRoute,
    });
    const renderResult = render(<RouterProvider router={router} />);
    await router.load();
    return renderResult;
  });
  return result;
};

describe("NavBar", () => {
  it("renders all 5 nav items", async () => {
    await renderNavBar();
    await waitFor(() => {
      expect(screen.getByText("Home")).toBeDefined();
      expect(screen.getByText("Station Finder")).toBeDefined();
      expect(screen.getByText("Station Fares")).toBeDefined();
      expect(screen.getByText("Trip Planner")).toBeDefined();
      expect(screen.getByText("About")).toBeDefined();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("home link has aria-current=page when at /", async () => {
    await renderNavBar("/");
    await waitFor(() => {
      // Mobile menu shows aria-current; desktop uses Highlight pill
      // Both desktop and mobile links exist; check at least one
      const homeLinks = screen
        .getAllByRole("link")
        .filter((el) => el.textContent?.includes("Home"));
      const activeLink = homeLinks.find((el) => el.getAttribute("aria-current") === "page");
      expect(activeLink).toBeDefined();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("logo renders brand text and desktop/mobile brand assets", async () => {
    await renderNavBar();
    await waitFor(() => {
      expect(screen.getByText("Metro Station Finder")).toBeDefined();
      expect(
        document.querySelector('img[src="/brand/logo/logo-primary-light.svg"]'),
      ).not.toBeNull();
      expect(document.querySelector('img[src="/brand/icon/icon-light.svg"]')).not.toBeNull();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("mobile hamburger opens the menu", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("mobile menu closes on Escape key", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("mobile menu closes on outside click", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("mobile menu closes after clicking a nav link", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    const aboutLink = screen
      .getAllByRole("link", { name: "About" })
      .find((link) => mobileNav.contains(link));

    if (!aboutLink) {
      throw new Error("Missing mobile About link");
    }

    fireEvent.click(aboutLink);

    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();
    });
  });

  it("clicking inside the mobile menu does not trigger outside-close logic", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);

    const mobileNav = await screen.findByRole("navigation", { name: /mobile navigation/i });
    fireEvent.mouseDown(mobileNav);

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });
  });

  it("non-Escape keys do not close the mobile menu", async () => {
    await renderNavBar();
    const hamburger = await screen.findByRole("button", {
      name: /toggle mobile menu/i,
    });
    fireEvent.click(hamburger);

    await screen.findByRole("navigation", { name: /mobile navigation/i });
    fireEvent.keyDown(document, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeDefined();
    });
  });

  it("adds the scrolled shadow class after window scroll", async () => {
    await renderNavBar();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 40,
    });

    fireEvent.scroll(window);

    await waitFor(() => {
      expect(document.querySelector("header")?.className).toContain(
        "drop-shadow-[0_14px_34px_oklch(0_0_0/0.10)]",
      );
    });
  });
});
