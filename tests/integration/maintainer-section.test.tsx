import { act, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { CtaSection } from "@/pages/home/sections/cta-section";

const renderCtaSection = async () => {
  const result = await act(async () => {
    const rootRoute = createRootRoute({ component: CtaSection });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/"] }),
      routeTree: rootRoute,
    });
    const renderResult = render(<RouterProvider router={router} />);
    await router.load();
    return renderResult;
  });
  return result;
};

describe("CtaSection", () => {
  it("renders without crashing", async () => {
    const { container } = await renderCtaSection();
    expect(container).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it('renders "Ready to ride smarter?" heading', async () => {
    await renderCtaSection();
    expect(screen.getByText("Ready to ride smarter?")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders all three stats", async () => {
    await renderCtaSection();
    expect(screen.getByText("16")).toBeDefined();
    expect(screen.getByText("120+")).toBeDefined();
    expect(screen.getByText("Free")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders Find a Station link to /station-finder", async () => {
    await renderCtaSection();
    const link = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/station-finder");
    expect(link).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders Check Fares link to /station-fares", async () => {
    await renderCtaSection();
    const link = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/station-fares");
    expect(link).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });
});
