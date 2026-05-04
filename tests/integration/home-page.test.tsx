import { render, screen } from "@testing-library/react";
import type * as TanStackRouter from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { HomePage } from "@/pages/home/home-page";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof TanStackRouter;

  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/components/ui/infinite-slider", () => ({
  InfiniteSlider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

describe("HomePage", () => {
  it("renders all major home sections in one page", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "How it started" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Powered by" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Everything you need" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "The journey" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Pick the task that matches the commute/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo", { name: "Site footer" })).toBeInTheDocument();
  });
});
