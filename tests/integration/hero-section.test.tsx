import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeroSection } from "@/pages/home/sections/hero-section";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
  ),
}));

describe("HeroSection", () => {
  it("renders without crashing", () => {
    render(<HeroSection />);
    expect(screen.getByRole("region")).toBeDefined();
  });

  it('renders heading text "Navigate"', () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Navigate");
  });

  it('renders "Dhaka\'s" in the heading', () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Dhaka's");
  });

  it('renders "Explore Stations" CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText("Explore Stations")).toBeDefined();
  });

  it('renders "Plan Your Journey" CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText("Plan Your Journey")).toBeDefined();
  });

  it("renders 3 stat cards", () => {
    render(<HeroSection />);
    const statCards = screen.getAllByTestId("stat-card");
    expect(statCards).toHaveLength(3);
  });

  it("renders the route map SVG", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("route-map-svg")).toBeDefined();
  });

  it('renders badge with "MRT Line 6"', () => {
    render(<HeroSection />);
    expect(screen.getByText("MRT Line 6 · Dhaka Metro")).toBeDefined();
  });
});
