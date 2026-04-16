import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JourneySection } from "@/pages/home/sections/journey-section";

vi.mock("@/components/ui/timeline", () => ({
  Timeline: ({ data }: { data: { title: string; content: React.ReactNode }[] }) => (
    <div data-testid="timeline">
      {data.map((entry) => (
        <div key={entry.title}>
          <h3>{entry.title}</h3>
          <div>{entry.content}</div>
        </div>
      ))}
    </div>
  ),
}));

describe("JourneySection", () => {
  it("renders the section heading", () => {
    render(<JourneySection />);
    expect(screen.getByText("And the")).toBeDefined();
    expect(screen.getByText("Journey Began")).toBeDefined();
  });

  it("renders the v0.0.1 beginning entry", () => {
    render(<JourneySection />);
    expect(screen.getAllByText("The Beginning").length).toBeGreaterThanOrEqual(1);
  });

  it("includes a v1.0.0 2026 Rebuild entry", () => {
    render(<JourneySection />);
    expect(screen.getAllByText("v1.0.0 — 2026 Rebuild").length).toBeGreaterThanOrEqual(1);
  });

  it("mentions TanStack Start in the 2026 rebuild description", () => {
    const { container } = render(<JourneySection />);
    expect(container.textContent).toContain("TanStack Start");
  });
});
