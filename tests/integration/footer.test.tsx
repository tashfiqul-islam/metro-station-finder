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

  it("renders legal section heading", async () => {
    await renderFooter();
    expect(screen.getByText("Legal")).toBeDefined();
  });

  it("renders legal links", async () => {
    await renderFooter();
    expect(screen.getByText("Privacy Policy")).toBeDefined();
    expect(screen.getByText("Terms of Use")).toBeDefined();
    expect(screen.getAllByText("Accessibility").length).toBeGreaterThan(0);
    expect(screen.getByText("Data Sources")).toBeDefined();
  });

  it("renders MIT license in bottom bar", async () => {
    await renderFooter();
    expect(screen.getByText("MIT License")).toBeDefined();
  });

  it("renders copyright text", async () => {
    await renderFooter();
    expect(screen.getByText(/2026 Metro Station Finder/i)).toBeDefined();
  });

  it("renders built with love attribution", async () => {
    await renderFooter();
    expect(screen.getByText(/built with/i)).toBeDefined();
    expect(screen.getAllByText(/tashfiqul islam/i).length).toBeGreaterThan(0);
  });
});
