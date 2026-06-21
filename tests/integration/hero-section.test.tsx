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

  it("renders Dhaka in the heading", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Dhaka");
  });

  it("renders station-level clarity in the heading", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("station-level clarity");
  });

  it('renders "Explore Stations" CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText("Explore Stations")).toBeDefined();
  });

  it("renders the route map SVG", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("route-map-svg")).toBeDefined();
  });

  it("renders terminus labels inside the route map", () => {
    render(<HeroSection />);
    expect(screen.getAllByText("Uttara North").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kamalapur").length).toBeGreaterThan(0);
  });

  it("renders stats inside the hero", () => {
    render(<HeroSection />);
    expect(screen.getByText("Stations tracked")).toBeDefined();
    expect(screen.getByText("20.1 km")).toBeDefined();
    expect(screen.getByText("MRT-6")).toBeDefined();
  });

  it("renders a secondary CTA", () => {
    render(<HeroSection />);
    expect(screen.getByText("Plan Your Journey")).toBeDefined();
  });
});
