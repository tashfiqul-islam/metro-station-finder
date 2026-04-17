import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JourneySection } from "@/pages/home/sections/journey-section";

// motion/react is not available in jsdom — stub it before any import resolves it.
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useInView: () => true,
  useReducedMotion: () => false,
}));

describe("JourneySection", () => {
  it("renders without crashing", () => {
    render(<JourneySection />);
    expect(document.body.firstChild).toBeDefined();
  });

  it('has "The journey" heading', () => {
    render(<JourneySection />);
    expect(screen.getByText("The journey")).toBeDefined();
  });

  it("renders all 4 version badges", () => {
    render(<JourneySection />);
    expect(screen.getByText("v0.1.0")).toBeDefined();
    expect(screen.getByText("v0.2.0")).toBeDefined();
    expect(screen.getByText("v0.9.0")).toBeDefined();
    expect(screen.getByText("v1.0.0")).toBeDefined();
  });

  it('has "You are here" text for the current stop', () => {
    render(<JourneySection />);
    expect(screen.getByText("You are here")).toBeDefined();
  });

  it("current stop has route-stop--current class", () => {
    const { container } = render(<JourneySection />);
    const currentDot = container.querySelector(".route-stop--current");
    expect(currentDot).not.toBeNull();
  });
});
