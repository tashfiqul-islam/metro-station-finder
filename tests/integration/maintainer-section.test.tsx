import { act, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { MaintainerSection } from "@/pages/home/sections/maintainer-section";

const renderMaintainerSection = async () => {
  const result = await act(async () => {
    const rootRoute = createRootRoute({ component: MaintainerSection });
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

describe("MaintainerSection", () => {
  it("renders without crashing", async () => {
    const { container } = await renderMaintainerSection();
    expect(container).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("has data-testid maintainer-card", async () => {
    await renderMaintainerSection();
    expect(screen.getByTestId("maintainer-card")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders the maintainer name", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("Tashfiqul Islam")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders Creator & Maintainer label", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("Creator & Maintainer")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders GitHub button link", async () => {
    await renderMaintainerSection();
    const githubLink = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "https://github.com/tashfiqul-islam");
    expect(githubLink).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders avatar fallback with TI initials", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("TI")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });
});
