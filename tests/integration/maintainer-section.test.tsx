import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { MaintainerSection } from "@/pages/home/sections/maintainer-section";

const renderMaintainerSection = async () => {
  const rootRoute = createRootRoute({ component: MaintainerSection });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });
  const result = render(<RouterProvider router={router} />);
  await router.load();
  return result;
};

describe("MaintainerSection", () => {
  it("renders the maintainer name", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("Tashfiqul Islam")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders the section heading", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("Meet the")).toBeDefined();
    expect(screen.getByText("Maintainer")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders LinkedIn social link", async () => {
    await renderMaintainerSection();
    const linkedinLink = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href")?.includes("linkedin"));
    expect(linkedinLink).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders GitHub link", async () => {
    await renderMaintainerSection();
    const githubLink = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href")?.includes("github"));
    expect(githubLink).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders Try the App CTA", async () => {
    await renderMaintainerSection();
    expect(screen.getByText("Try the App")).toBeDefined();
    await waitFor(() => {}, { timeout: 500 });
  });
});
