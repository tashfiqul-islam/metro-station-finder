import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { HeroSection } from "@/pages/home/sections/hero-section";

const renderHeroSection = async () => {
  const rootRoute = createRootRoute({ component: HeroSection });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  const result = render(<RouterProvider router={router} />);
  await router.load();
  return result;
};

describe("HeroSection", () => {
  it("renders the headline with Precision highlight", async () => {
    await renderHeroSection();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Precision");
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders primary CTA linking to /station-finder", async () => {
    await renderHeroSection();
    const links = screen.getAllByRole("link");
    const primary = links.find((l) => l.textContent?.includes("Find Station"));
    expect(primary).toBeDefined();
    expect(primary?.getAttribute("href")).toBe("/station-finder");
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders secondary CTA linking to /station-fares", async () => {
    await renderHeroSection();
    const links = screen.getAllByRole("link");
    const secondary = links.find((l) => l.textContent?.includes("Calculate Fare"));
    expect(secondary).toBeDefined();
    expect(secondary?.getAttribute("href")).toBe("/station-fares");
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders the animated badge", async () => {
    await renderHeroSection();
    expect(screen.getByText("Introducing v1.0.0")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });
});
