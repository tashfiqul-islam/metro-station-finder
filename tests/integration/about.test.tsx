import { act, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { About } from "@/routes/about";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

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
  it("renders without crashing", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });

  it("displays the About heading and subtitle", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
    expect(screen.getByText("The story behind metro-station-finder.")).toBeInTheDocument();
  });

  it("renders all four section eyebrows without interaction", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Mission")).toBeInTheDocument();
    expect(screen.getByText("Tech Stack")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders overview content", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText(/Bangladesh.s first metro rail system/)).toBeInTheDocument();
  });

  it("renders mission pull-quote", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText(/Every commuter deserves to know their fare/)).toBeInTheDocument();
  });

  it("renders all three feature cards", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("Station Finder")).toBeInTheDocument();
    expect(screen.getByText("Fare Calculator")).toBeInTheDocument();
    expect(screen.getByText("Trip Planner")).toBeInTheDocument();
  });

  it("renders tech stack items", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("React 19")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders GitHub contact button", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("Open an Issue")).toBeInTheDocument();
  });

  it("renders content immediately without mounted guard delay", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });
});
