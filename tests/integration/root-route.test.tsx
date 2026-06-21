import { render, screen } from "@testing-library/react";
import type * as TanStackRouter from "@tanstack/react-router";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Route } from "@/routes/__root";

interface HeadResult {
  links?: Record<string, unknown>[];
  meta?: Record<string, unknown>[];
}

interface RootRouteTestOptions {
  head?: (ctx: unknown) => Promise<HeadResult> | HeadResult;
  notFoundComponent?: React.ComponentType<{ isNotFound: boolean; routeId: string }>;
  shellComponent?: React.ComponentType<{ children: React.ReactNode }>;
}

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof TanStackRouter;

  return {
    ...actual,
    HeadContent: () => null,
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    Scripts: () => <div data-testid="scripts" />,
  };
});

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => <div data-testid="tanstack-devtools" />,
}));

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => <div data-testid="react-query-devtools" />,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => <div data-testid="router-devtools-panel" />,
}));

vi.mock("@/components/common/unified-background", () => ({
  UnifiedBackground: () => <div data-testid="unified-background" />,
}));

vi.mock("@/components/ui/navbar", () => ({
  NavBar: () => <nav aria-label="Main navigation">Nav</nav>,
}));

const reportWebVitals = vi.fn();

vi.mock("@/lib/web-vitals", () => ({
  reportWebVitals: () => reportWebVitals(),
}));

describe("Root route", () => {
  let originalError: typeof console.error;

  beforeAll(() => {
    originalError = console.error;
    console.error = (...args: unknown[]) => {
      const [msg] = args;
      if (
        typeof msg === "string" &&
        (msg.includes("cannot be a child of") || msg.includes("hydration error"))
      ) {
        return;
      }
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("exposes expected head metadata and links", async () => {
    const routeOptions = Route.options as unknown as RootRouteTestOptions;
    const head = await routeOptions.head?.({});

    expect(head?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rel: "stylesheet" }),
        expect.objectContaining({ href: "/manifest.json", rel: "manifest" }),
        expect.objectContaining({
          href: "/brand/icon/icon-light.svg",
          rel: "icon",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          href: "/brand/icon/icon-dark.svg",
          rel: "icon",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          href: "/brand/favicon/favicon-32.png",
          rel: "icon",
          sizes: "32x32",
        }),
        expect.objectContaining({
          href: "/brand/favicon/favicon-16.png",
          rel: "icon",
          sizes: "16x16",
        }),
        expect.objectContaining({
          href: "/brand/favicon/apple-touch-icon.png",
          rel: "apple-touch-icon",
          sizes: "180x180",
        }),
      ]),
    );

    expect(head?.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ charSet: "utf-8" }),
        expect.objectContaining({ name: "viewport" }),
        expect.objectContaining({ name: "description" }),
        expect.objectContaining({ title: "Metro Station Finder - Dhaka MRT-6" }),
      ]),
    );
  });

  it("renders the shell component with shared app chrome", () => {
    const routeOptions = Route.options as unknown as RootRouteTestOptions;
    const Shell = routeOptions.shellComponent;
    if (!Shell) {
      throw new Error("Root shell component missing");
    }

    render(<Shell>child content</Shell>);

    expect(screen.getByTestId("unified-background")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
    expect(screen.getByTestId("scripts")).toBeInTheDocument();
  });

  it("fires web vitals reporting on mount", () => {
    const routeOptions = Route.options as unknown as RootRouteTestOptions;
    const Shell = routeOptions.shellComponent;
    if (!Shell) {
      throw new Error("Root shell component missing");
    }

    render(<Shell>child</Shell>);

    expect(reportWebVitals).toHaveBeenCalled();
  });

  it("renders the not found component", () => {
    const routeOptions = Route.options as unknown as RootRouteTestOptions;
    const NotFound = routeOptions.notFoundComponent;
    if (!NotFound) {
      throw new Error("Not found component missing");
    }

    render(<NotFound isNotFound routeId="__root__" />);

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });
});
