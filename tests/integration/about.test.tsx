import { act, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { About } from "@/routes/about";

const renderWithRouter = async (ui: React.ReactElement) => {
  const result = await act(async () => {
    const rootRoute = createRootRoute({ component: () => ui });
    const router = createRouter({
      history: createMemoryHistory(),
      routeTree: rootRoute,
    });
    const renderResult = render(<RouterProvider router={router} />);
    await router.load();
    return renderResult;
  });
  return result;
};

describe("About Page", () => {
  it("renders privacy policy tab", async () => {
    await renderWithRouter(<About />);
    await waitFor(
      () => {
        expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders accordion items in how it works section", async () => {
    await renderWithRouter(<About />);
    await waitFor(
      () => {
        expect(screen.getByText("How do I find a station?")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {}, { timeout: 500 });
  });

  it("displays feature cards", async () => {
    await renderWithRouter(<About />);
    await waitFor(
      () => {
        expect(screen.getByText("Coverage")).toBeInTheDocument();
        expect(screen.getByText("Data Source")).toBeInTheDocument();
        expect(screen.getByText("Open Source")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders badges section", async () => {
    await renderWithRouter(<About />);
    await waitFor(
      () => {
        expect(screen.getByText("MIT Licensed")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {}, { timeout: 500 });
  });

  it("renders CTA section", async () => {
    await renderWithRouter(<About />);
    await waitFor(
      () => {
        expect(screen.getByText("Contribute & Support")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    await waitFor(() => {}, { timeout: 500 });
  });
});
