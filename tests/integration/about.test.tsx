import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("renders without crashing", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });

  it("displays the About heading and subtitle", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("The story behind metro-station-finder.")).toBeInTheDocument();
  });

  it("renders sidebar nav buttons for all four sections", async () => {
    await renderWithRouter(<About />);
    // Both desktop sidebar and mobile pill buttons are in DOM (hidden via CSS only)
    const sectionButtons = screen.getAllByRole("button");
    const labels = sectionButtons.map((b) => b.textContent?.trim().toLowerCase());
    expect(labels).toContain("overview");
    expect(labels).toContain("mission");
    expect(labels).toContain("tech stack");
    expect(labels).toContain("contact");
  });

  it("shows overview content by default", async () => {
    await renderWithRouter(<About />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText(/Bangladesh.s first metro rail system/)).toBeInTheDocument();
  });

  it("shows mission content when mission button is clicked", async () => {
    await renderWithRouter(<About />);

    // Use data-section attribute to find the desktop sidebar button specifically
    const [missionButton] = screen.getAllByRole("button", { name: /mission/i }) as HTMLElement[];
    expect(missionButton).toBeDefined();
    fireEvent.click(missionButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Mission")).toBeInTheDocument();
      expect(screen.getByText(/Every commuter deserves to know their fare/)).toBeInTheDocument();
    });
  });

  it("shows tech stack content when tech-stack button is clicked", async () => {
    await renderWithRouter(<About />);

    const [techButton] = screen.getAllByRole("button", { name: /tech stack/i }) as HTMLElement[];
    expect(techButton).toBeDefined();
    fireEvent.click(techButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("React 19")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("shows contact content when contact button is clicked", async () => {
    await renderWithRouter(<About />);

    const [contactButton] = screen.getAllByRole("button", { name: /contact/i }) as HTMLElement[];
    expect(contactButton).toBeDefined();
    fireEvent.click(contactButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("Open an Issue")).toBeInTheDocument();
    });
  });

  it("renders content immediately without mounted guard delay", async () => {
    // Component must render content on first render — no null/empty shell
    await renderWithRouter(<About />);
    // If a mounted guard existed, the h1 heading would not appear synchronously
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });
});
