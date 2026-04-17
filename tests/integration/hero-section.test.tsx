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

  it('renders "Navigate" in the heading', () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Navigate");
  });

  it("renders the main location name in the heading", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Dhaka");
  });

  it('renders "Explore Stations" CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText("Explore Stations")).toBeDefined();
  });

  it('renders "Plan Your Journey" CTA', () => {
    render(<HeroSection />);
    expect(screen.getByText("Plan Your Journey")).toBeDefined();
  });

  it("renders inline stats with correct values", () => {
    render(<HeroSection />);
    expect(screen.getByText("17")).toBeDefined();
    expect(screen.getByText("20.1 km")).toBeDefined();
    expect(screen.getByText("Line 6")).toBeDefined();
  });

  it("renders the route map SVG", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("route-map-svg")).toBeDefined();
  });

  it('renders eyebrow with "MRT Line 6 · Dhaka Metro"', () => {
    render(<HeroSection />);
    expect(screen.getByText("MRT Line 6 · Dhaka Metro")).toBeDefined();
  });

  it("renders terminus labels in floating badges", () => {
    render(<HeroSection />);
    expect(screen.getAllByText("Uttara North").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kamalapur").length).toBeGreaterThan(0);
  });
});
