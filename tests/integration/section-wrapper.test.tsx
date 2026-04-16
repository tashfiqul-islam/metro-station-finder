import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SectionWrapper } from "@/components/common/section-wrapper";

describe("SectionWrapper", () => {
  it("renders children", () => {
    render(<SectionWrapper>child content</SectionWrapper>);
    expect(screen.getByText("child content")).toBeDefined();
  });

  it("sets data-section-id when id is provided", () => {
    render(<SectionWrapper id="hero">child</SectionWrapper>);
    const section = document.querySelector("[data-section-id='hero']");
    expect(section).not.toBeNull();
  });

  it("respects prefers-reduced-motion: reduce — section still renders", () => {
    // Override matchMedia to report reduced-motion
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );

    const { container } = render(<SectionWrapper id="test">reduced content</SectionWrapper>);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    // Component renders children even in reduced-motion mode
    expect(screen.getByText("reduced content")).toBeDefined();
  });

  it("renders as a section element", () => {
    const { container } = render(<SectionWrapper>content</SectionWrapper>);
    expect(container.querySelector("section")).not.toBeNull();
  });
});
