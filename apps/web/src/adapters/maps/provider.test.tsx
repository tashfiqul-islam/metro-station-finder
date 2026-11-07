import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { useMaps, usePlaces } from "./context";
import type { PlacesApi } from "./context";
import { MapsProvider } from "./provider";
import type { RouteApi } from "./routes";

interface Loaded {
  readonly places: PlacesApi;
  readonly routes: { readonly Route: RouteApi };
}

/** Fake libraries: the provider passes `places` along and wraps `routes.Route` in a service. */
const loaded: Loaded = {
  places: { PlaceAutocompleteElement: HTMLElement },
  routes: { Route: { computeRoutes: vi.fn() } },
};

function noop(): void {}

function deferred<T>() {
  const handle: { resolve: (value: T) => void; reject: (reason: unknown) => void } = {
    resolve: noop,
    reject: noop,
  };
  const promise = new Promise<T>((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return { promise, ...handle };
}

function Probe() {
  const { status, routes } = useMaps();
  const places = usePlaces();
  const parts = [
    status,
    routes === null ? "no-routes" : "routes",
    places === null ? "no-places" : "places",
  ];
  return <p>{parts.join("/")}</p>;
}

function mount(props: { apiKey?: string | null; load?: () => Promise<Loaded> }, strict = false) {
  const tree = (
    <MapsProvider {...props}>
      <Probe />
    </MapsProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 without a key nothing is loaded and the status is unavailable", () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ apiKey: null, load });
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-88 the default key comes from the build environment, which has none in tests", () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ load });
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-88 with a key it loads once, shows loading, then publishes the route service and places", async () => {
  const pending = deferred<Loaded>();
  const load = vi.fn(() => pending.promise);
  mount({ apiKey: "fake-key-for-tests", load });
  expect(screen.getByText("loading/no-routes/no-places")).toBeTruthy();
  expect(load).toHaveBeenCalledExactlyOnceWith("fake-key-for-tests");
  await act(async () => {
    pending.resolve(loaded);
    await Promise.resolve();
  });
  expect(screen.getByText("ready/routes/places")).toBeTruthy();
});

test("METRO-88 a failed load is the unavailable state and logs nothing", async () => {
  const load = vi.fn(() => Promise.reject(new Error("script blocked key=abc")));
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  mount({ apiKey: "fake-key-for-tests", load });
  expect(await screen.findByText("unavailable/no-routes/no-places")).toBeTruthy();
  expect(document.body.textContent).not.toContain("key=abc");
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-88 unmounting before the load settles updates nothing", async () => {
  const slow = deferred<Loaded>();
  const failing = deferred<Loaded>();
  mount({ apiKey: "fake-key-for-tests", load: () => slow.promise }).unmount();
  mount({ apiKey: "fake-key-for-tests", load: () => failing.promise }).unmount();
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    slow.resolve(loaded);
    failing.reject(new Error("late"));
    await Promise.resolve();
  });
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-88 StrictMode re-runs the effect and still ends ready", async () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ apiKey: "fake-key-for-tests", load }, true);
  expect(await screen.findByText("ready/routes/places")).toBeTruthy();
});

test("METRO-88 useMaps and usePlaces outside a provider are unavailable and empty", () => {
  render(<Probe />);
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
});
