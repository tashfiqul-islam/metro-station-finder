import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FeaturePreviewPage } from "@/components/common/feature-preview-page";

// Base UI Progress uses ResizeObserver internally — stub it for jsdom.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

const defaultProps = {
  description: "A test description for this feature.",
  eta: "Coming Q4 2026",
  features: [
    { icon: <span data-testid="icon-a" />, label: "Alpha" },
    { icon: <span data-testid="icon-b" />, label: "Beta" },
  ],
  progress: 42,
  title: "Test Feature",
};

describe("FeaturePreviewPage", () => {
  it("renders without crashing", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByTestId("feature-preview-page")).toBeDefined();
  });

  it('has data-testid="feature-preview-page"', () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByTestId("feature-preview-page")).toBeInTheDocument();
  });

  it("shows the title", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Feature");
  });

  it("shows the description", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByText("A test description for this feature.")).toBeInTheDocument();
  });

  it("shows the progress percentage", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("shows all feature chip labels", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows the eta badge text", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByText("Coming Q4 2026")).toBeInTheDocument();
  });

  it("uses default eta when eta prop is omitted", () => {
    const { title, description, features, progress } = defaultProps;
    render(
      <FeaturePreviewPage
        title={title}
        description={description}
        features={features}
        progress={progress}
      />,
    );
    expect(screen.getByText("Coming Q3 2026")).toBeInTheDocument();
  });

  it("renders the Development progress label", () => {
    render(<FeaturePreviewPage {...defaultProps} />);
    expect(screen.getByText("Development progress")).toBeInTheDocument();
  });
});
