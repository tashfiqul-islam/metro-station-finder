import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import AnimatedBadge from "@/components/ui/animated-badge";

const renderWithRouter = async (ui: React.ReactElement) => {
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    history: createMemoryHistory(),
    routeTree: rootRoute,
  });
  const result = render(<RouterProvider router={router} />);
  await router.load();
  return result;
};

describe("AnimatedBadge", () => {
  it("renders the badge text", async () => {
    await renderWithRouter(<AnimatedBadge text="MRT-6 Live" />);
    await waitFor(() => {
      expect(screen.getByText("MRT-6 Live")).toBeDefined();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders an anchor element when href is provided", async () => {
    const { container } = await renderWithRouter(
      <AnimatedBadge href="/station-finder" text="Find Station" />,
    );
    await waitFor(() => {
      const anchor = container.querySelector("a");
      expect(anchor).not.toBeNull();
      expect(anchor?.getAttribute("href")).toBe("/station-finder");
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("does not render an anchor when href is omitted", async () => {
    const { container } = await renderWithRouter(<AnimatedBadge text="No link" />);
    await waitFor(() => {
      const anchor = container.querySelector("a");
      expect(anchor).toBeNull();
    });
    await waitFor(() => {}, { timeout: 500 });
  });

  it("applies shimmer-spin animation via inline style on the conic gradient div", async () => {
    const { container } = await renderWithRouter(<AnimatedBadge text="Shimmer" color="#22d3ee" />);
    await waitFor(() => {
      const shimmerEl = container.querySelector<HTMLElement>('[style*="shimmer-spin"]');
      expect(shimmerEl).not.toBeNull();
    });
    await waitFor(() => {}, { timeout: 500 });
  });
});
