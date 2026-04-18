import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeaturesSection } from "@/pages/home/sections/features-section";

// motion/react is not available in jsdom — stub it before any import resolves it.
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
  useInView: () => true,
  useReducedMotion: () => false,
}));

describe("FeaturesSection", () => {
  it("renders without crashing", () => {
    render(<FeaturesSection />);
    expect(screen.getByRole("region")).toBeDefined();
  });

  it('has heading "Everything you need"', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Everything you need")).toBeDefined();
  });

  it("renders 5 BentoCard elements", () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByTestId("bento-card");
    expect(cards).toHaveLength(5);
  });

  it('first BentoCard has data-size="lg"', () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByTestId("bento-card");
    expect(cards[0]?.dataset["size"]).toBe("lg");
  });

  it('has "Station Search" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Station Search")).toBeDefined();
  });

  it('has "Fare Calculator" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Fare Calculator")).toBeDefined();
  });

  it('has "Trip Planning" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Trip Planning")).toBeDefined();
  });
});
