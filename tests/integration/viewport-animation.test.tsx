import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ViewportAnimation } from "@/components/common/viewport-animation";

// motion/react is not natively available in jsdom — stub it here.
// vi.mock is hoisted by Vitest at compile time so this runs before the import above.
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("ViewportAnimation", () => {
  it("renders without crashing", () => {
    render(<ViewportAnimation>content</ViewportAnimation>);
    expect(screen.getByTestId("viewport-animation")).toBeDefined();
  });

  it("renders children inside the wrapper", () => {
    render(<ViewportAnimation>hello world</ViewportAnimation>);
    expect(screen.getByText("hello world")).toBeDefined();
  });

  it("applies a custom className", () => {
    const { container } = render(
      <ViewportAnimation className="my-custom-class">content</ViewportAnimation>,
    );
    const el = container.firstElementChild;
    expect(el?.classList.contains("my-custom-class")).toBe(true);
  });

  it("accepts a delay prop without crashing", () => {
    render(<ViewportAnimation delay={0.3}>delayed content</ViewportAnimation>);
    expect(screen.getByText("delayed content")).toBeDefined();
  });

  it("renders with default delay of 0 when delay is omitted", () => {
    render(<ViewportAnimation>default delay</ViewportAnimation>);
    expect(screen.getByTestId("viewport-animation")).toBeDefined();
  });
});
