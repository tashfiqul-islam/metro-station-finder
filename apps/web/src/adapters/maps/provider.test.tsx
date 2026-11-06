import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { MAPS_VERSION } from "./config";
import { useMaps } from "./context";
import { MapsProvider } from "./provider";

const library = vi.hoisted(() => ({
  status: "LOADING",
  routes: null as unknown,
  props: [] as {
    apiKey?: string;
    version?: string;
    onError?: (error: unknown) => void;
    children: ReactNode;
  }[],
}));

vi.mock("@vis.gl/react-google-maps", () => ({
  APILoadingStatus: {
    NOT_LOADED: "NOT_LOADED",
    LOADING: "LOADING",
    LOADED: "LOADED",
    FAILED: "FAILED",
    AUTH_FAILURE: "AUTH_FAILURE",
  },
  APIProvider: (props: (typeof library.props)[number]) => {
    library.props.push(props);
    return props.children;
  },
  useApiLoadingStatus: () => library.status,
  useMapsLibrary: () => library.routes,
}));

function Probe() {
  const { status, routes } = useMaps();
  return <p>{`${status}/${routes === null ? "no-routes" : "routes"}`}</p>;
}

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  library.props.length = 0;
  library.status = "LOADING";
  library.routes = null;
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 without a key nothing is loaded and the status is unavailable", () => {
  render(
    <MapsProvider apiKey={null}>
      <Probe />
    </MapsProvider>,
  );
  expect(screen.getByText("unavailable/no-routes")).toBeTruthy();
  expect(library.props).toHaveLength(0);
});

test("METRO-88 the default key comes from the build environment, which has none in tests", () => {
  render(
    <MapsProvider>
      <Probe />
    </MapsProvider>,
  );
  expect(screen.getByText("unavailable/no-routes")).toBeTruthy();
  expect(library.props).toHaveLength(0);
});

test("METRO-88 with a key it mounts one APIProvider with the pinned version and a quiet error handler", () => {
  render(
    <MapsProvider apiKey="fake-key-for-tests">
      <Probe />
    </MapsProvider>,
  );
  expect(library.props).toHaveLength(1);
  expect(library.props[0]).toMatchObject({ apiKey: "fake-key-for-tests", version: MAPS_VERSION });
  const onError = library.props[0]?.onError;
  expect(typeof onError).toBe("function");
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  onError?.(new Error("secret https://example.test?key=abc"));
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-88 the library status maps to loading, ready and unavailable", () => {
  const expected: Record<string, string> = {
    NOT_LOADED: "loading",
    LOADING: "loading",
    LOADED: "ready",
    FAILED: "unavailable",
    AUTH_FAILURE: "unavailable",
  };
  for (const [status, mapped] of Object.entries(expected)) {
    library.status = status;
    const view = render(
      <MapsProvider apiKey="fake-key-for-tests">
        <Probe />
      </MapsProvider>,
    );
    expect(screen.getByText(`${mapped}/no-routes`)).toBeTruthy();
    view.unmount();
  }
});

test("METRO-88 once the routes library is ready a route service is published", () => {
  library.status = "LOADED";
  library.routes = { Route: { computeRoutes: vi.fn() } };
  render(
    <MapsProvider apiKey="fake-key-for-tests">
      <Probe />
    </MapsProvider>,
  );
  expect(screen.getByText("ready/routes")).toBeTruthy();
});

test("METRO-88 useMaps outside a provider is unavailable", () => {
  render(<Probe />);
  expect(screen.getByText("unavailable/no-routes")).toBeTruthy();
});
