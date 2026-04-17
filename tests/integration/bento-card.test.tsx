import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BentoCard } from "@/components/common/bento-card";

describe("BentoCard", () => {
  it("renders without crashing", () => {
    render(<BentoCard size="md" title="Test Title" description="Test description" />);
    expect(screen.getByTestId("bento-card")).toBeDefined();
  });

  it("renders the title text", () => {
    render(<BentoCard size="md" title="My Title" description="desc" />);
    expect(screen.getByText("My Title")).toBeDefined();
  });

  it("renders the description text", () => {
    render(<BentoCard size="md" title="title" description="My Description" />);
    expect(screen.getByText("My Description")).toBeDefined();
  });

  it('sets data-size="lg" for large size', () => {
    render(<BentoCard size="lg" title="large" description="desc" />);
    const el = screen.getByTestId("bento-card");
    expect(el.dataset["size"]).toBe("lg");
  });

  it('sets data-size="md" for medium size', () => {
    render(<BentoCard size="md" title="medium" description="desc" />);
    const el = screen.getByTestId("bento-card");
    expect(el.dataset["size"]).toBe("md");
  });

  it('sets data-size="sm" for small size', () => {
    render(<BentoCard size="sm" title="small" description="desc" />);
    const el = screen.getByTestId("bento-card");
    expect(el.dataset["size"]).toBe("sm");
  });

  it("applies the bento-card CSS class", () => {
    const { container } = render(<BentoCard size="md" title="t" description="d" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("bento-card")).toBe(true);
  });

  it("renders an optional icon when provided", () => {
    render(
      <BentoCard
        size="md"
        title="with icon"
        description="desc"
        icon={<span data-testid="icon-slot">icon</span>}
      />,
    );
    expect(screen.getByTestId("icon-slot")).toBeDefined();
  });

  it("does not render an icon container when icon is omitted", () => {
    const { container } = render(<BentoCard size="sm" title="no icon" description="desc" />);
    // No icon wrapper div should be present — query by a sentinel attribute
    const iconWrapper = container.querySelector("[data-icon-wrapper]");
    expect(iconWrapper).toBeNull();
  });

  it("applies a custom className", () => {
    const { container } = render(
      <BentoCard size="sm" title="t" description="d" className="extra" />,
    );
    const el = container.firstElementChild;
    expect(el?.classList.contains("extra")).toBe(true);
  });

  it("applies lg padding class for size lg", () => {
    const { container } = render(<BentoCard size="lg" title="t" description="d" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("p-8")).toBe(true);
  });

  it("applies md padding class for size md", () => {
    const { container } = render(<BentoCard size="md" title="t" description="d" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("p-6")).toBe(true);
  });

  it("applies sm padding class for size sm", () => {
    const { container } = render(<BentoCard size="sm" title="t" description="d" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("p-4")).toBe(true);
  });
});
