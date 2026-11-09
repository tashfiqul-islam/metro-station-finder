import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { useMaps, usePlaces } from "./context";
import type { PlacesApi } from "./context";
import { LOAD_WATCHDOG_MS, MapsProvider } from "./provider";
import type { RouteApi } from "./routes";

interface Loaded {
  readonly places: PlacesApi;
  readonly routes: { readonly Route: RouteApi };
}

class FakePlaceElement extends HTMLElement {
  value: string | null = null;
}
customElements.define("fake-provider-place", FakePlaceElement);

/** Fake libraries: the provider passes `places` along and wraps `routes.Route` in a service. */
const loaded: Loaded = {
  places: { PlaceAutocompleteElement: FakePlaceElement },
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
  const { status, routes, load } = useMaps();
  const places = usePlaces();
  const parts = [
    status,
    routes === null ? "no-routes" : "routes",
    places === null ? "no-places" : "places",
  ];
  return (
    <>
      <p>{parts.join("/")}</p>
      <button type="button" onClick={load}>
        ask
      </button>
    </>
  );
}

function mount(
  props: { apiKey?: string | null; load?: () => Promise<Loaded>; reset?: () => void },
  strict = false,
) {
  const tree = (
    <MapsProvider {...props}>
      <Probe />
    </MapsProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

const ask = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "ask" }));
};

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 without a key nothing is loaded, even when asked, and the status is unavailable", () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ apiKey: null, load });
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
  ask();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-88 the default key comes from the build environment, which has none in tests", () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ load });
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-114 mounting loads nothing: the status is idle until something asks", async () => {
  const load = vi.fn(() => Promise.resolve(loaded));
  mount({ apiKey: "fake-key-for-tests", load });
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByText("idle/no-routes/no-places")).toBeTruthy();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-114 asking loads once (however often it is asked), shows loading, then publishes routes and places", async () => {
  const pending = deferred<Loaded>();
  const load = vi.fn(() => pending.promise);
  mount({ apiKey: "fake-key-for-tests", load });
  ask();
  ask();
  expect(screen.getByText("loading/no-routes/no-places")).toBeTruthy();
  expect(load).toHaveBeenCalledExactlyOnceWith("fake-key-for-tests");
  await act(async () => {
    pending.resolve(loaded);
    await Promise.resolve();
  });
  expect(screen.getByText("ready/routes/places")).toBeTruthy();
  ask();
  expect(load).toHaveBeenCalledTimes(1);
});

test("METRO-88 a failed load is the unavailable state and logs nothing", async () => {
  const load = vi.fn(() => Promise.reject(new Error("script blocked key=abc")));
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  mount({ apiKey: "fake-key-for-tests", load });
  ask();
  expect(await screen.findByText("unavailable/no-routes/no-places")).toBeTruthy();
  expect(document.body.textContent).not.toContain("key=abc");
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-114 a load that never answers is given up on after the watchdog, and a late answer is ignored", async () => {
  vi.useFakeTimers();
  try {
    const never = deferred<Loaded>();
    mount({ apiKey: "fake-key-for-tests", load: () => never.promise });
    ask();
    expect(screen.getByText("loading/no-routes/no-places")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOAD_WATCHDOG_MS + 1);
    });
    expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
    await act(async () => {
      never.resolve(loaded);
      await Promise.resolve();
    });
    expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

test("METRO-114 an answer before the watchdog cancels it", async () => {
  vi.useFakeTimers();
  try {
    mount({ apiKey: "fake-key-for-tests", load: () => Promise.resolve(loaded) });
    ask();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOAD_WATCHDOG_MS * 2);
    });
    expect(screen.getByText("ready/routes/places")).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

test("METRO-114 a load that failed offline is tried again when the connection returns", async () => {
  setOnline(false);
  try {
    const load = vi
      .fn<() => Promise<Loaded>>()
      .mockRejectedValueOnce(new Error("offline key=abc"))
      .mockResolvedValue(loaded);
    const reset = vi.fn();
    mount({ apiKey: "fake-key-for-tests", load, reset });
    ask();
    expect(await screen.findByText("unavailable/no-routes/no-places")).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();
    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("ready/routes/places")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  } finally {
    Reflect.deleteProperty(navigator, "onLine");
  }
});

test("METRO-114 a load that failed while online is not retried by an online event", async () => {
  const load = vi.fn(() => Promise.reject(new Error("blocked")));
  const reset = vi.fn();
  mount({ apiKey: "fake-key-for-tests", load, reset });
  ask();
  expect(await screen.findByText("unavailable/no-routes/no-places")).toBeTruthy();
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
  });
  expect(reset).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalledTimes(1);
});

test("METRO-88 unmounting before the load settles updates nothing", async () => {
  const slow = deferred<Loaded>();
  const failing = deferred<Loaded>();
  const first = mount({ apiKey: "fake-key-for-tests", load: () => slow.promise });
  ask();
  first.unmount();
  const second = mount({ apiKey: "fake-key-for-tests", load: () => failing.promise });
  ask();
  second.unmount();
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
  ask();
  expect(await screen.findByText("ready/routes/places")).toBeTruthy();
});

test("METRO-88 useMaps and usePlaces outside a provider are unavailable and empty", () => {
  render(<Probe />);
  expect(screen.getByText("unavailable/no-routes/no-places")).toBeTruthy();
});
