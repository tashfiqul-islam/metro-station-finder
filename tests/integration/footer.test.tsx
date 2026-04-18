import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { Footer } from "@/components/ui/footer";

const renderFooter = async () => {
  const rootRoute = createRootRoute({ component: Footer });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
};

describe("Footer", () => {
  it("renders without crashing", async () => {
    await renderFooter();
    expect(document.querySelector("footer")).toBeDefined();
  });

  it("renders the brand name", async () => {
    await renderFooter();
    expect(screen.getByText("Metro Station Finder")).toBeDefined();
  });

  it("renders the GitHub link", async () => {
    await renderFooter();
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("github.com");
  });

  it("renders all navigation links", async () => {
    await renderFooter();
    const nav = screen.getByRole("navigation", { name: /footer navigation/i });
    expect(nav).toBeDefined();
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Station Finder")).toBeDefined();
    expect(screen.getByText("Station Fares")).toBeDefined();
    expect(screen.getByText("Trip Planner")).toBeDefined();
    expect(screen.getByText("About")).toBeDefined();
  });

  it("renders copyright text", async () => {
    await renderFooter();
    expect(screen.getByText(/2026 Tashfiqul Islam/i)).toBeDefined();
  });
});
