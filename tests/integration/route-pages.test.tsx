import { render, screen } from "@testing-library/react";
import type * as TanStackRouter from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { Route as AccessibilityRoute } from "@/routes/accessibility";
import { Route as DataSourcesRoute } from "@/routes/data-sources";
import { Route as LoginRoute } from "@/routes/login";
import { Route as PrivacyRoute } from "@/routes/privacy";
import { Route as SignupRoute } from "@/routes/signup";
import { Route as StationFaresRoute } from "@/routes/station-fares";
import { Route as StationFinderRoute } from "@/routes/station-finder";
import { Route as TermsRoute } from "@/routes/terms";
import { Route as TripPlannerRoute } from "@/routes/trip-planner";

interface HeadResult {
  meta?: Record<string, unknown>[];
}

interface RouteWithHead {
  options: {
    component?: React.ComponentType;
    head?: (ctx: unknown) => Promise<HeadResult> | HeadResult;
  };
}

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

const renderRouteComponent = (route: RouteWithHead) => {
  const Component = route.options.component;
  if (!Component) {
    throw new Error("Route component missing");
  }

  return render(<Component />);
};

describe("Static route pages", () => {
  it("renders station finder preview and head config", async () => {
    const route = StationFinderRoute as unknown as RouteWithHead;
    renderRouteComponent(route);
    expect(screen.getByRole("heading", { level: 1, name: "Station Finder" })).toBeInTheDocument();
    const head = await route.options.head?.({} as never);
    if (!head) {
      throw new Error("Missing station finder head config");
    }
    expect(head.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "og:title" })]),
    );
  });

  it("renders station fares preview and head config", async () => {
    const route = StationFaresRoute as unknown as RouteWithHead;
    renderRouteComponent(route);
    expect(screen.getByRole("heading", { level: 1, name: "Station Fares" })).toBeInTheDocument();
    const head = await route.options.head?.({} as never);
    if (!head) {
      throw new Error("Missing station fares head config");
    }
    expect(head.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "twitter:card" })]),
    );
  });

  it("renders trip planner preview and head config", async () => {
    const route = TripPlannerRoute as unknown as RouteWithHead;
    renderRouteComponent(route);
    expect(screen.getByRole("heading", { level: 1, name: "Trip Planner" })).toBeInTheDocument();
    const head = await route.options.head?.({} as never);
    if (!head) {
      throw new Error("Missing trip planner head config");
    }
    expect(head.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "description" })]),
    );
  });

  it("renders login placeholder and head config", async () => {
    const route = LoginRoute as unknown as RouteWithHead;
    renderRouteComponent(route);
    expect(screen.getByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
    const head = await route.options.head?.({} as never);
    if (!head) {
      throw new Error("Missing login head config");
    }
    expect(head.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "og:title" })]),
    );
  });

  it("renders signup placeholder and head config", async () => {
    const route = SignupRoute as unknown as RouteWithHead;
    renderRouteComponent(route);
    expect(screen.getByRole("heading", { level: 1, name: "Sign up" })).toBeInTheDocument();
    const head = await route.options.head?.({} as never);
    if (!head) {
      throw new Error("Missing signup head config");
    }
    expect(head.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "twitter:card" })]),
    );
  });

  it("renders privacy route content", () => {
    renderRouteComponent(PrivacyRoute as unknown as RouteWithHead);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getAllByText(/do not collect/iu).length).toBeGreaterThan(0);
  });

  it("renders terms route content", () => {
    renderRouteComponent(TermsRoute as unknown as RouteWithHead);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Use" })).toBeInTheDocument();
    expect(screen.getAllByText(/free to use/iu).length).toBeGreaterThan(0);
  });

  it("renders accessibility route content", () => {
    renderRouteComponent(AccessibilityRoute as unknown as RouteWithHead);
    expect(screen.getByRole("heading", { level: 1, name: "Accessibility" })).toBeInTheDocument();
    expect(screen.getAllByText(/WCAG 2.1 Level AA/iu).length).toBeGreaterThan(0);
  });

  it("renders data sources route content", () => {
    renderRouteComponent(DataSourcesRoute as unknown as RouteWithHead);
    expect(screen.getByRole("heading", { level: 1, name: "Data Sources" })).toBeInTheDocument();
    expect(screen.getByText(/Dhaka Mass Transit Company Limited/iu)).toBeInTheDocument();
  });
});
