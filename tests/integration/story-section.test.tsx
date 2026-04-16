import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StorySection } from "@/pages/home/sections/story-section";

describe("StorySection", () => {
  it("renders 4 story cards", () => {
    render(<StorySection />);
    const cards = screen
      .getAllByRole("heading", { level: 3 })
      .filter((h) =>
        ["The Daily Struggle", "The Lightbulb Moment", "The Solution", "The Impact"].includes(
          h.textContent ?? "",
        ),
      );
    expect(cards).toHaveLength(4);
  });

  it("renders The Daily Struggle card", () => {
    render(<StorySection />);
    expect(screen.getByText("The Daily Struggle")).toBeDefined();
  });

  it("renders The Lightbulb Moment card", () => {
    render(<StorySection />);
    expect(screen.getByText("The Lightbulb Moment")).toBeDefined();
  });

  it("renders The Solution card", () => {
    render(<StorySection />);
    expect(screen.getByText("The Solution")).toBeDefined();
  });

  it("renders The Impact card", () => {
    render(<StorySection />);
    expect(screen.getByText("The Impact")).toBeDefined();
  });
});
