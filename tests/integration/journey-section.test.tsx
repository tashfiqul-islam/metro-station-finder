import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JourneySection } from "@/pages/home/sections/journey-section";

// ResizeObserver is not available in jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

// motion/react is not available in jsdom — stub it before any import resolves it.
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useInView: () => true,
  useMotionValue: () => ({ get: () => 0, onChange: () => () => {}, set: () => {} }),
  useMotionValueEvent: () => {},
  useReducedMotion: () => false,
  useScroll: () => ({ scrollYProgress: { get: () => 0, onChange: () => () => {} } }),
  useTransform: (_v: unknown, _i: unknown, output: unknown[]) => output[0],
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
    expect(screen.getByText("prerelease")).toBeDefined();
    expect(screen.getByText("v1.0.0")).toBeDefined();
  });

  it('has "You are here" text for the current stop', () => {
    render(<JourneySection />);
    expect(screen.getByText("You are here")).toBeDefined();
  });

  it("current stop renders the Live badge", () => {
    render(<JourneySection />);
    expect(screen.getByText("Live")).toBeDefined();
  });
});
