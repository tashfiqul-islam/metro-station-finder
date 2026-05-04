import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeaturesSection } from "@/pages/home/sections/features-section";

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
    const cards = screen.getAllByTestId("feature-card");
    expect(cards).toHaveLength(5);
  });

  it('first feature card has data-feature-size="lg"', () => {
    render(<FeaturesSection />);
    const cards = screen.getAllByTestId("feature-card");
    expect(cards[0]?.dataset["featureSize"]).toBe("lg");
  });

  it('has "Find the right station" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Find the right station")).toBeDefined();
  });

  it('has "Check the price first" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Check the price first")).toBeDefined();
  });

  it('has "Plan the journey" text', () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Plan the journey")).toBeDefined();
  });
});
