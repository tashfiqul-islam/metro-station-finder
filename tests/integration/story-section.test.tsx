import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StorySection } from "@/pages/home/sections/story-section";

describe("StorySection", () => {
  it("renders without crashing", () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it('has "How it started" heading', () => {
    render(<StorySection />);
    expect(screen.getByText("How it started")).toBeDefined();
  });

  it("renders 4 story columns with correct titles", () => {
    render(<StorySection />);
    const titles = ["Frustration", "Inspiration", "Solution", "Impact"];
    for (const title of titles) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });

  it('has "Frustration" story column', () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 3, name: "Frustration" })).toBeDefined();
  });

  it('has "Inspiration" story column', () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 3, name: "Inspiration" })).toBeDefined();
  });

  it('has "Solution" story column', () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 3, name: "Solution" })).toBeDefined();
  });

  it('has "Impact" story column', () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 3, name: "Impact" })).toBeDefined();
  });

  it("renders ordinal numbers 01–04 in the DOM", () => {
    render(<StorySection />);
    expect(screen.getByText("01")).toBeDefined();
    expect(screen.getByText("02")).toBeDefined();
    expect(screen.getByText("03")).toBeDefined();
    expect(screen.getByText("04")).toBeDefined();
  });
});
