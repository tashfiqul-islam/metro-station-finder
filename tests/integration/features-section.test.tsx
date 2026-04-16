import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeaturesSection } from "@/pages/home/sections/features-section";

describe("FeaturesSection", () => {
  it("renders the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Features")).toBeDefined();
    expect(screen.getByText("That Matter")).toBeDefined();
  });

  it("renders Real-time Search feature", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Real-time Search")).toBeDefined();
  });

  it("renders Interactive Maps feature", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Interactive Maps")).toBeDefined();
  });

  it("does not contain 'Google Maps integration' in any feature description", () => {
    const { container } = render(<FeaturesSection />);
    expect(container.textContent).not.toContain("Google Maps integration");
  });

  it("contains MapLibre copy in interactive maps description", () => {
    const { container } = render(<FeaturesSection />);
    expect(container.textContent).toContain("MapLibre");
  });
});
