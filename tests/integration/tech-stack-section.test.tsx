import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { row1Items, row2Items, TechStackSection } from "@/pages/home/sections/tech-stack-section";

vi.mock("@/components/ui/infinite-slider", () => ({
  InfiniteSlider: ({ children, reverse }: { children: React.ReactNode; reverse?: boolean }) => (
    <div data-reverse={reverse ? "true" : "false"} data-testid="infinite-slider">
      {children}
    </div>
  ),
}));

describe("TechStackSection — item arrays", () => {
  it("row1Items contains React", () => {
    expect(row1Items.map((t) => t.name)).toContain("React");
  });

  it("row1Items contains TypeScript", () => {
    expect(row1Items.map((t) => t.name)).toContain("TypeScript");
  });

  it("row1Items contains TanStack", () => {
    expect(row1Items.map((t) => t.name)).toContain("TanStack");
  });

  it("row1Items contains Tailwind CSS", () => {
    expect(row1Items.map((t) => t.name)).toContain("Tailwind CSS");
  });

  it("row1Items contains shadcn/ui", () => {
    expect(row1Items.map((t) => t.name)).toContain("shadcn/ui");
  });

  it("row1Items contains Bun", () => {
    expect(row1Items.map((t) => t.name)).toContain("Bun");
  });

  it("row1Items contains MapLibre", () => {
    expect(row1Items.map((t) => t.name)).toContain("MapLibre");
  });

  it("row2Items contains Motion", () => {
    expect(row2Items.map((t) => t.name)).toContain("Motion");
  });

  it("row2Items contains Valibot", () => {
    expect(row2Items.map((t) => t.name)).toContain("Valibot");
  });

  it("row2Items contains Lefthook", () => {
    expect(row2Items.map((t) => t.name)).toContain("Lefthook");
  });

  it("row2Items contains Cursor", () => {
    expect(row2Items.map((t) => t.name)).toContain("Cursor");
  });

  it("each item has logoDark and logoLight paths", () => {
    for (const item of [...row1Items, ...row2Items]) {
      expect(item.logoDark).toMatch(/^\/tech-stack\/.+\.svg$/);
      expect(item.logoLight).toMatch(/^\/tech-stack\/.+\.svg$/);
    }
  });

  it("row1Items has 7 items", () => {
    expect(row1Items).toHaveLength(7);
  });

  it("row2Items has 6 items", () => {
    expect(row2Items).toHaveLength(6);
  });
});

describe("TechStackSection — rendering", () => {
  it("renders without crashing", () => {
    render(<TechStackSection />);
  });

  it('renders "Powered by" heading', () => {
    render(<TechStackSection />);
    expect(screen.getByText("Powered by")).toBeInTheDocument();
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
    expect(screen.getAllByTestId("infinite-slider")).toHaveLength(2);
  });

  it("second slider has reverse direction", () => {
    render(<TechStackSection />);
    expect(screen.getAllByTestId("infinite-slider")[1]).toHaveAttribute("data-reverse", "true");
  });

  it("first slider has forward direction", () => {
    render(<TechStackSection />);
    expect(screen.getAllByTestId("infinite-slider")[0]).toHaveAttribute("data-reverse", "false");
  });
});
