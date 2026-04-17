import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { row1Items, row2Items, TechStackSection } from "@/pages/home/sections/tech-stack-section";

// InfiniteSlider uses react-use-measure which requires ResizeObserver.
// Mock it so rendering tests work in jsdom without a polyfill.
vi.mock("@/components/ui/infinite-slider", () => ({
  InfiniteSlider: ({ children, reverse }: { children: React.ReactNode; reverse?: boolean }) => (
    <div data-reverse={reverse ? "true" : "false"} data-testid="infinite-slider">
      {children}
    </div>
  ),
}));

describe("TechStackSection — item arrays", () => {
  it("row1Items contains React", () => {
    const names = row1Items.map((t) => t.name);
    expect(names).toContain("React");
  });

  it("row1Items contains TypeScript", () => {
    const names = row1Items.map((t) => t.name);
    expect(names).toContain("TypeScript");
  });

  it("row1Items contains TanStack", () => {
    const names = row1Items.map((t) => t.name);
    expect(names).toContain("TanStack");
  });

  it("row1Items contains Tailwind CSS", () => {
    const names = row1Items.map((t) => t.name);
    expect(names).toContain("Tailwind CSS");
  });

  it("row1Items contains Vite", () => {
    const names = row1Items.map((t) => t.name);
    expect(names).toContain("Vite");
  });

  it("row2Items contains shadcn/ui", () => {
    const names = row2Items.map((t) => t.name);
    expect(names).toContain("shadcn/ui");
  });

  it("row2Items contains Bun", () => {
    const names = row2Items.map((t) => t.name);
    expect(names).toContain("Bun");
  });

  it("row2Items contains Vitest", () => {
    const names = row2Items.map((t) => t.name);
    expect(names).toContain("Vitest");
  });

  it("row2Items contains MapLibre", () => {
    const names = row2Items.map((t) => t.name);
    expect(names).toContain("MapLibre");
  });

  it("row2Items contains Phosphor", () => {
    const names = row2Items.map((t) => t.name);
    expect(names).toContain("Phosphor");
  });

  it("row1Items has exactly 5 items", () => {
    expect(row1Items).toHaveLength(5);
  });

  it("row2Items has exactly 5 items", () => {
    expect(row2Items).toHaveLength(5);
  });
});

describe("TechStackSection — rendering", () => {
  it("renders without crashing", () => {
    render(<TechStackSection />);
  });

  it('renders "Built with" heading', () => {
    render(<TechStackSection />);
    expect(screen.getByText("Built with")).toBeInTheDocument();
  });

  it('renders "React" item text', () => {
    render(<TechStackSection />);
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
  });

  it('renders "TypeScript" item text', () => {
    render(<TechStackSection />);
    expect(screen.getAllByText("TypeScript").length).toBeGreaterThan(0);
  });

  it("renders two InfiniteSlider instances", () => {
    render(<TechStackSection />);
    const sliders = screen.getAllByTestId("infinite-slider");
    expect(sliders).toHaveLength(2);
  });

  it("second slider has reverse direction", () => {
    render(<TechStackSection />);
    const sliders = screen.getAllByTestId("infinite-slider");
    expect(sliders[1]).toHaveAttribute("data-reverse", "true");
  });

  it("first slider has forward direction", () => {
    render(<TechStackSection />);
    const sliders = screen.getAllByTestId("infinite-slider");
    expect(sliders[0]).toHaveAttribute("data-reverse", "false");
  });
});
