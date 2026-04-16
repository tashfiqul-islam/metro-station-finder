import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { NavBar } from "@/components/ui/navbar";

const renderNavBar = async (initialPath = "/") => {
  const rootRoute = createRootRoute({ component: NavBar });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    routeTree: rootRoute,
  });
  const result = render(<RouterProvider router={router} />);
  await router.load();
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
  });

  it("logo renders full name and short abbreviation", async () => {
    await renderNavBar();
    await waitFor(() => {
      // Both spans are in the DOM; CSS hides one on each breakpoint
      expect(screen.getByText("Metro Station Finder")).toBeDefined();
      expect(screen.getByText("MSF")).toBeDefined();
    });
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
  });
});
