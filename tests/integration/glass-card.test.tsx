import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GlassCard } from "@/components/common/glass-card";

describe("GlassCard", () => {
  it("renders children", () => {
    render(<GlassCard>hello world</GlassCard>);
    expect(screen.getByText("hello world")).toBeDefined();
  });

  it("applies glass-card class by default", () => {
    const { container } = render(<GlassCard>content</GlassCard>);
    const el = container.firstElementChild;
    expect(el?.classList.contains("glass-card")).toBe(true);
  });

  it("composes extra className via cn()", () => {
    const { container } = render(<GlassCard className="rounded-2xl p-4">content</GlassCard>);
    const el = container.firstElementChild;
    expect(el?.classList.contains("glass-card")).toBe(true);
    expect(el?.classList.contains("rounded-2xl")).toBe(true);
    expect(el?.classList.contains("p-4")).toBe(true);
  });

  it("forwards additional props to the wrapper div", () => {
    render(<GlassCard data-testid="card">content</GlassCard>);
    expect(screen.getByTestId("card")).toBeDefined();
  });
});
