import type { Coordinate } from "@metro/core";
import * as Core from "@metro/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { MapsContext } from "../../adapters/maps/context";
import type {
  MapsAdapter,
  MapsStatus,
  PlaceSearchProps,
  RouteService,
  WalkingRoute,
} from "../../adapters/maps/context";
import { createRouteService } from "../../adapters/maps/routes";
import { copy } from "./copy";
import { WATCHDOG_MS } from "./geolocate";
import { fakePosition, fakePositionError } from "./geolocation-fakes";
import { NearestStation } from "./NearestStation";
import { ROUTE_WATCHDOG_MS } from "./walking-route";

const override = vi.hoisted(() => ({ fare: null as unknown }));

vi.mock("@metro/core", async (importOriginal) => {
  const actual = await importOriginal<typeof Core>();
  return {
    ...actual,
    findFare: (...args: Parameters<typeof actual.findFare>) =>
      override.fare ?? actual.findFare(...args),
  };
});

/** Synthetic points near the first and the last station of the baseline dataset. */
const NEAR_UTTARA_NORTH: Coordinate = { lat: 23.87, lng: 90.367 };
const NEAR_MOTIJHEEL: Coordinate = { lat: 23.728, lng: 90.419 };

const world = {
  status: "ready" as MapsStatus,
  load: vi.fn(),
  service: null as RouteService | null,
  searchProps: null as PlaceSearchProps | null,
};

function FakePlaceSearch(props: PlaceSearchProps) {
  useEffect(() => {
    world.searchProps = props;
  });
  return (
    <fieldset aria-labelledby={props.labelId} data-fake-search>
      <input aria-label="fake search box" />
    </fieldset>
  );
}

const listeners = new Set<() => void>();
let version = 0;

/** Changes the published Maps state while the screen is mounted (the libraries arriving late, say). */
function publish(next: { status?: MapsStatus; service?: RouteService | null }): void {
  if (next.status !== undefined) world.status = next.status;
  if (next.service !== undefined) world.service = next.service;
  version += 1;
  act(() => {
    for (const listener of listeners) listener();
  });
}

/** Publishes the test's chosen Maps state the way the real provider does. */
function FakeProvider({ children }: { readonly children: ReactNode }) {
  const seen = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  const value = useMemo(
    () => ({ status: world.status, routes: world.service, load: world.load }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `seen` is the signal that the world changed
    [seen],
  );
  return <MapsContext value={value}>{children}</MapsContext>;
}

const fakeMaps: MapsAdapter = { Provider: FakeProvider, PlaceSearch: FakePlaceSearch };

function routeService(walk: RouteService["walk"]): RouteService {
  return { walk };
}

function route(meters: number, durationSeconds: number): WalkingRoute {
  return { distance: Core.walkingDistanceMeters(meters), durationSeconds };
}

function geolocation(run: (success: PositionCallback, failure: PositionErrorCallback) => void) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: run },
  });
}

function pickPlace(location: Coordinate): void {
  act(() => world.searchProps?.onPlace(location));
}

const denied = fakePositionError(1);
const timeout = fakePositionError(3);

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  world.status = "ready";
  world.load = vi.fn();
  world.service = null;
  world.searchProps = null;
  override.fare = null;
  Reflect.deleteProperty(navigator, "geolocation");
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 idle: search, the location button and the consent line, and no result", () => {
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByRole("heading", { level: 1, name: copy.heading })).toBeTruthy();
  expect(screen.getByRole("group", { name: copy.searchLabel })).toBeTruthy();
  // METRO-101: the hint is visible and is the description handed to the widget.
  expect(screen.getByText(copy.searchHint)).toBeTruthy();
  expect(world.searchProps?.description).toBe(copy.searchHint);
  expect(world.searchProps?.labelId).toBe("place-label");
  const button = screen.getByRole("button", { name: copy.locateButton });
  expect(button.getAttribute("aria-describedby")).toBe("consent");
  const consent = document.getElementById("consent")?.textContent ?? "";
  expect(consent).toContain("not sent to our server");
  expect(consent).toContain("goes to Google");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
});

/**
 * The name the real widget was measured to expose: owner probe 2026-11-08 (METRO-101), relayed and not re-run
 * by an agent; not a Google guarantee. e2e/maps-stub.ts holds the e2e copy (vitest does not import from e2e/).
 */
const MEASURED_GOOGLE_NAME = "Search For a Place";

test("METRO-101 copy guard: our visible label stays contained in the name Google was measured to expose", () => {
  // This checks our copy only, not the real widget. WCAG 2.5.3 compares case-insensitively; the Dhaka wording
  // lives in the hint, not the label.
  expect(MEASURED_GOOGLE_NAME.toLowerCase()).toContain(copy.searchLabel.toLowerCase());
  expect(copy.searchLabel).not.toContain("Dhaka");
});

test("METRO-88 the search gets a Dhaka bias derived from the dataset, not a hard-coded point", () => {
  render(<NearestStation maps={fakeMaps} />);
  const { center, radiusMeters } = world.searchProps?.bias ?? { center: null, radiusMeters: 0 };
  expect(radiusMeters).toBe(25_000);
  expect(center?.lat).toBeGreaterThan(23.7);
  expect(center?.lat).toBeLessThan(23.9);
  expect(center?.lng).toBeGreaterThan(90.3);
  expect(center?.lng).toBeLessThan(90.5);
});

const heading = (name: string): HTMLElement => screen.getByRole("heading", { level: 2, name });

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

/** The locating status: the one `output` (the place-search notice is a separate status region). */
const locatingStatus = (): HTMLElement => must(document.querySelector("output"));

/** The estimate shown in the result: "about" then a figure then "straight-line distance · est.". */
const distanceText = (): string => must(document.querySelector(".metric__value")).textContent;

const smallNoticeElement = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".notice[data-size=sm]");
const good = (): void => geolocation((success) => success(fakePosition(23.87, 90.367, 20)));
const pressLocate = (): void => {
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
};
const ROUTE_TEXT = "about 1.2 km, 15 min · est.";

test("METRO-88 a selected place shows the nearest station, the labelled estimate and the walking route", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(await screen.findByText(ROUTE_TEXT)).toBeTruthy();
  const station = heading("Uttara North");
  expect(station.getAttribute("tabindex")).toBe("-1");
  expect(document.activeElement).toBe(station);
  expect(screen.getByText(copy.distanceLabel)).toBeTruthy();
  expect(distanceText()).toMatch(/^\d+ m$/u);
  expect(walk).toHaveBeenCalledTimes(1);
  const [from, to] = walk.mock.calls[0] ?? [];
  expect(from).toEqual(NEAR_UTTARA_NORTH);
  expect(to).toEqual(Core.baselineDataset.stations[0]?.coordinate);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("METRO-88 the route shows loading while the routes library is not ready, and asks for it once", () => {
  world.status = "idle";
  render(<NearestStation maps={fakeMaps} />);
  expect(world.load).not.toHaveBeenCalled();
  pickPlace(NEAR_UTTARA_NORTH);
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  expect(heading("Uttara North")).toBeTruthy();
  expect(world.load).toHaveBeenCalledExactlyOnceWith();
});

test("METRO-114 Maps unavailable: the label, hint and field are gone and only the notice shows", () => {
  world.status = "unavailable";
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByText(copy.searchUnavailable)).toBeTruthy();
  expect(screen.queryByText(copy.searchLabel)).toBeNull();
  expect(screen.queryByText(copy.searchHint)).toBeNull();
  expect(document.querySelector("[data-fake-search]")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  // A status region, mounted from the start, not an alert: it is part of the page, not an interruption.
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText(copy.searchUnavailable).closest("output")).not.toBeNull();
});

function setOnline(value: boolean | null): void {
  if (value === null) Reflect.deleteProperty(navigator, "onLine");
  else Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

test("METRO-114 offline at render shows the offline notice from the start and no field, then restores on online", () => {
  setOnline(false);
  try {
    render(<NearestStation maps={fakeMaps} />);
    expect(screen.getByText(copy.searchNoConnection)).toBeTruthy();
    // The handoff's own sentence; it claims offline use, which the shell worker now backs (METRO-106).
    expect(copy.searchNoConnection).toBe(
      "You’re offline. Stations and fares still work. Place search returns when you reconnect. Pick a station instead.",
    );
    expect(screen.queryByText(copy.searchLabel)).toBeNull();
    expect(document.querySelector("[data-fake-search]")).toBeNull();
    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(copy.searchNoConnection)).toBeNull();
    expect(screen.getByText(copy.searchLabel)).toBeTruthy();
    expect(document.querySelector("[data-fake-search]")).not.toBeNull();
  } finally {
    setOnline(null);
  }
});

test("METRO-114 the label is a real label for the plain input and the hint is visible", () => {
  render(<NearestStation maps={fakeMaps} />);
  const label = screen.getByText(copy.searchLabel);
  expect(label.tagName).toBe("LABEL");
  expect(label.getAttribute("for")).toBe("place-input");
  expect(screen.getByText(copy.searchHint)).toBeTruthy();
  expect(world.searchProps?.hintId).toBe("place-hint");
});

test("METRO-114 the library failing after the user focused the field moves focus to the notice", () => {
  render(<NearestStation maps={fakeMaps} />);
  const box = screen.getByRole("textbox", { name: "fake search box" });
  act(() => box.focus());
  expect(document.activeElement).toBe(box);
  // The field is removed under the focus; jsdom-like DOMs drop focus to the body.
  publish({ status: "unavailable" });
  const notice = must(document.querySelector<HTMLElement>(".notice[data-size=sm]"));
  expect(notice.textContent).toContain(copy.searchUnavailable);
  expect(document.activeElement).toBe(notice);
});

test("METRO-114 the library failing when focus was elsewhere takes no focus", () => {
  render(<NearestStation maps={fakeMaps} />);
  const button = screen.getByRole("button", { name: copy.locateButton });
  act(() => button.focus());
  publish({ status: "unavailable" });
  expect(document.activeElement).toBe(button);
});

test("METRO-114 a good device fix asks for exactly one walking route and shows it as an estimate", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  expect(await screen.findByText(ROUTE_TEXT)).toBeTruthy();
  expect(walk).toHaveBeenCalledTimes(1);
  const [from, to] = walk.mock.calls[0] ?? [];
  expect(from).toEqual({ lat: 23.87, lng: 90.367 });
  expect(to).toEqual(Core.baselineDataset.stations[0]?.coordinate);
  expect(screen.getByText(copy.walking + ":")).toBeTruthy();
});

/** The real route service over a counted fake of Google's `Route.computeRoutes`, wrapped to count `walk` too. */
function countedRealService() {
  const computeRoutes = vi.fn(() =>
    Promise.resolve({ routes: [{ distanceMeters: 1234, durationMillis: 900_000 }] }),
  );
  const real = createRouteService({ computeRoutes });
  const walk = vi.fn<RouteService["walk"]>((origin, destination) => real.walk(origin, destination));
  return { computeRoutes, walk, service: routeService(walk) };
}

test("METRO-114 under StrictMode (as in production) a good fix asks for one route and a place for one more", async () => {
  const { computeRoutes, walk, service } = countedRealService();
  world.service = service;
  good();
  const view = render(
    <StrictMode>
      <NearestStation maps={fakeMaps} />
    </StrictMode>,
  );
  pressLocate();
  await screen.findByText(ROUTE_TEXT);
  // The effect ran twice (StrictMode); the result still made one walk call and Google one request.
  expect(walk).toHaveBeenCalledTimes(1);
  expect(computeRoutes).toHaveBeenCalledTimes(1);
  // A re-render and a theme change add nothing.
  document.documentElement.setAttribute("data-theme", "dark");
  view.rerender(
    <StrictMode>
      <NearestStation maps={fakeMaps} />
    </StrictMode>,
  );
  publish({});
  await act(async () => {});
  document.documentElement.removeAttribute("data-theme");
  expect(walk).toHaveBeenCalledTimes(1);
  expect(computeRoutes).toHaveBeenCalledTimes(1);
  pickPlace(NEAR_MOTIJHEEL);
  await screen.findByText(ROUTE_TEXT);
  expect(walk).toHaveBeenCalledTimes(2);
  expect(computeRoutes).toHaveBeenCalledTimes(2);
});

test("METRO-114 the same fix twice is two results, two walk calls, and one request to Google", async () => {
  const { computeRoutes, walk, service } = countedRealService();
  world.service = service;
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  await screen.findByText(ROUTE_TEXT);
  pressLocate();
  await act(async () => {});
  await screen.findByText(ROUTE_TEXT);
  // One request per result at the screen; the service shares the request for an identical pair.
  expect(walk).toHaveBeenCalledTimes(2);
  expect(computeRoutes).toHaveBeenCalledTimes(1);
});

test("METRO-114 a stored failure followed by a new service object does not ask again for the same result", async () => {
  vi.useFakeTimers();
  try {
    const first = vi.fn<RouteService["walk"]>(() => new Promise<WalkingRoute>(() => {}));
    const second = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
    world.service = routeService(first);
    render(<NearestStation maps={fakeMaps} />);
    pickPlace(NEAR_UTTARA_NORTH);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ROUTE_WATCHDOG_MS + 1);
    });
    expect(screen.getByText(copy.routeUnavailable)).toBeTruthy();
    // The provider publishes a different service object (the libraries were reloaded, say).
    publish({ service: routeService(second) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    // The stored failure stands; nothing was asked a second time.
    expect(screen.getByText(copy.routeUnavailable)).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

test("METRO-114 a library failure later does not pull focus from a user who clicked away from the field", () => {
  render(<NearestStation maps={fakeMaps} />);
  const box = screen.getByRole("textbox", { name: "fake search box" });
  act(() => box.focus());
  // Focus leaves for nothing (a click on blank page): the field no longer holds focus.
  act(() => box.blur());
  expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
  publish({ status: "unavailable" });
  expect(smallNoticeElement()).not.toBeNull();
  expect(document.activeElement).not.toBe(smallNoticeElement());
});

test("METRO-114 exactly one request: the settled count is one without StrictMode", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  await screen.findByText(ROUTE_TEXT);
  publish({});
  await act(async () => {});
  expect(walk).toHaveBeenCalledTimes(1);
});

test("METRO-114 a rough fix asks for no route, and neither does a rough fix with unknown accuracy", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  geolocation((success) => success(fakePosition(23.8, 90.4, 25_000)));
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  await screen.findByRole("group", { name: /found your position only roughly/u });
  expect(walk).not.toHaveBeenCalled();
  expect(world.load).not.toHaveBeenCalled();
  geolocation((success) => success(fakePosition(23.8, 90.4, Number.NaN)));
  fireEvent.click(screen.getByRole("button", { name: copy.tryAgain }));
  await screen.findByText(copy.roughUnknown.search);
  expect(walk).not.toHaveBeenCalled();
  expect(world.load).not.toHaveBeenCalled();
});

test("METRO-114 a failed route for a device fix keeps the station and the fare with the fixed copy", async () => {
  world.service = routeService(() => Promise.reject(new Error("key=abc lat=23.87")));
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  expect(await screen.findByText(copy.routeUnavailable)).toBeTruthy();
  expect(heading("Uttara North")).toBeTruthy();
  expect(document.querySelector(".result__fare")).not.toBeNull();
  expect(document.body.textContent).not.toContain("key=abc");
});

test("METRO-114 Maps unavailable fails the requested route visibly and keeps the result", async () => {
  world.status = "unavailable";
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  expect(await screen.findByText(copy.routeUnavailable)).toBeTruthy();
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-114 a result replaced before the libraries arrive never makes its route request", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.status = "loading";
  good();
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  // The user chooses a place instead (the one current result): the device result unmounts.
  pickPlace(NEAR_MOTIJHEEL);
  publish({ status: "ready", service: routeService(walk) });
  await screen.findByText(ROUTE_TEXT);
  // Only the place's route was requested.
  expect(walk).toHaveBeenCalledTimes(1);
  expect(walk.mock.calls[0]?.[0]).toEqual(NEAR_MOTIJHEEL);
});

test("METRO-114 a route that never answers ends as the fixed failure after the watchdog, and a late answer is ignored", async () => {
  vi.useFakeTimers();
  try {
    let answer: ((value: WalkingRoute) => void) | null = null;
    world.service = routeService(
      () =>
        new Promise<WalkingRoute>((resolve) => {
          answer = resolve;
        }),
    );
    render(<NearestStation maps={fakeMaps} />);
    pickPlace(NEAR_UTTARA_NORTH);
    expect(screen.getByText(copy.routeLoading)).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ROUTE_WATCHDOG_MS + 1);
    });
    expect(screen.getByText(copy.routeUnavailable)).toBeTruthy();
    await act(async () => {
      answer?.(route(1234, 900));
      await Promise.resolve();
    });
    expect(screen.queryByText(ROUTE_TEXT)).toBeNull();
    expect(heading("Uttara North")).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

test("METRO-88 a failed route request shows fixed copy and keeps the station and fare", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  world.service = routeService(() => Promise.reject(new Error("https://x.test?lat=23.8")));
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(await screen.findByText(copy.routeUnavailable)).toBeTruthy();
  expect(document.body.textContent).not.toContain("x.test");
  expect(heading("Uttara North")).toBeTruthy();
  expect(document.querySelector(".result__fare")).not.toBeNull();
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-113 the result shows the fare range from core, the footnote from the provenance and the Directions link", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const fare = must(document.querySelector<HTMLElement>(".result__fare"));
  expect(fare.textContent).toContain("Single fare from here");
  // Motijheel is the end of the line: the cheapest is the next stop, the dearest the far end.
  expect(fare.textContent).toContain("20 taka");
  expect(fare.textContent).toContain("100 taka");
  expect(
    screen.getByText(
      "Fares as of: DTCA notice dated 8 September 2022; last checked 5 November 2026.",
    ),
  ).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/sample data/iu);
  const link = screen.getByRole("link", { name: /Directions in Google Maps/u });
  const url = new URL(link.getAttribute("href") ?? "");
  expect(Array.from(url.searchParams)).toHaveLength(2);
  expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("destination")).toBe(
    `${Core.baselineDataset.stations[15]?.coordinate.lat.toFixed(6)},${Core.baselineDataset.stations[15]?.coordinate.lng.toFixed(6)}`,
  );
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
});

test("METRO-113 a station without any known fare shows no fare and no footnote, never zero", () => {
  override.fare = { kind: "unknown-fare", reason: "no-fare-entry" };
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  expect(heading("Motijheel")).toBeTruthy();
  expect(document.querySelector(".result__fare")).toBeNull();
  expect(screen.queryByText(/Fares as of/u)).toBeNull();
  expect(document.body.textContent).not.toContain("0 taka");
});

test("METRO-113 Also nearby lists the two next-nearest stations with labelled estimates", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const section = must(document.querySelector<HTMLElement>(".also"));
  expect(within(section).getByRole("heading", { level: 3, name: copy.alsoNearby })).toBeTruthy();
  const cards = within(section).getAllByRole("listitem");
  expect(cards.map((card) => card.querySelector(".also__name")?.textContent)).toEqual([
    "Bangladesh Secretariat",
    "Dhaka University",
  ]);
  for (const card of cards) {
    expect(card.querySelector(".also__meta")?.textContent).toMatch(
      /^about [\d.]+ (m|km) · est\.$/u,
    );
  }
  // Cards report only: no link, no button.
  expect(within(section).queryAllByRole("link")).toEqual([]);
  expect(within(section).queryAllByRole("button")).toEqual([]);
});

test("METRO-88 an invalid location is the empty state", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace({ lat: 200, lng: 0 });
  const empty = heading(copy.resultHeading);
  expect(document.activeElement).toBe(empty);
  expect(screen.getByText(copy.empty)).toBeTruthy();
  expect(document.querySelector(".result__fare")).toBeNull();
  expect(screen.queryByRole("link", { name: /Directions/u })).toBeNull();
});

test("METRO-114 while Maps loads the plain field stays: there is no loading message", () => {
  world.status = "loading";
  render(<NearestStation maps={fakeMaps} />);
  expect(document.querySelector("[data-fake-search]")).not.toBeNull();
  expect(screen.getByText(copy.searchLabel)).toBeTruthy();
});

test("METRO-88 a search failure shows fixed copy, location still works and a later place clears it", () => {
  render(<NearestStation maps={fakeMaps} />);
  act(() => world.searchProps?.onFailure());
  expect(screen.getByRole("alert").textContent).toBe(copy.searchUnavailable);
  pickPlace(NEAR_MOTIJHEEL);
  expect(screen.queryByText(copy.searchUnavailable)).toBeNull();
  expect(heading("Motijheel")).toBeTruthy();
});

test("METRO-113 denied: a labelled group with the search action, focus on that first action, no alert role", async () => {
  geolocation((_success, failure) => failure(denied));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.denied.search });
  expect(group.textContent).toContain(copy.denied.search);
  const action = within(group).getByRole("button", { name: copy.searchLabel });
  expect(document.activeElement).toBe(action);
  // Denied offers no Try again: the browser will not ask again.
  expect(within(group).queryAllByRole("button")).toEqual([action]);
  // The action is a button that moves focus into the search field (a hash link to a paragraph cannot).
  fireEvent.click(action);
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "fake search box" }));
  // Focus moved, so the notice is not also an alert (no double announcement).
  expect(screen.queryByRole("alert")).toBeNull();
  pickPlace(NEAR_MOTIJHEEL);
  expect(screen.queryByText(copy.denied.search)).toBeNull();
  expect(heading("Motijheel")).toBeTruthy();
});

test("METRO-113 denied with Maps unavailable has no action: focus goes to the notice itself", async () => {
  world.status = "unavailable";
  geolocation((_success, failure) => failure(denied));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.denied.pick });
  expect(within(group).queryByRole("button")).toBeNull();
  expect(document.activeElement).toBe(group);
});

test("METRO-113 a timeout and a missing API show the unavailable copy with Try again first", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.unavailable.search });
  const retry = within(group).getByRole("button", { name: copy.tryAgain });
  expect(document.activeElement).toBe(retry);
  const search = within(group).getByRole("button", { name: copy.searchLabel });
  // The order inside the notice: Try again, then Search for a place.
  expect(retry.compareDocumentPosition(search)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test("METRO-113 Try again asks again, keeps focus on a control and the second answer replaces the notice", async () => {
  const answers: PositionErrorCallback[] = [];
  const successes: PositionCallback[] = [];
  geolocation((success, failure) => {
    successes.push(success);
    answers.push(failure);
  });
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  act(() => answers[0]?.(timeout));
  const retry = await screen.findByRole("button", { name: copy.tryAgain });
  retry.focus();
  fireEvent.click(retry);
  // The notice that held focus is gone; focus stays on the stable button, not on <body>.
  expect(screen.queryByRole("group", { name: copy.unavailable.search })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.locateButton }));
  expect(successes).toHaveLength(2);
  act(() => successes[1]?.(fakePosition(23.87, 90.367, 20)));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: copy.unavailable.search })).toBeNull();
});

test("METRO-113 locating: an output status with the looping mark and the handoff text, the button stays focusable", () => {
  geolocation(() => {});
  const onSettle = vi.fn();
  render(<NearestStation maps={fakeMaps} onSettle={onSettle} />);
  const button = screen.getByRole<HTMLButtonElement>("button", { name: copy.locateButton });
  fireEvent.click(button);
  // aria-disabled, not disabled: the button keeps focus and its place in the order while it works.
  expect(button.disabled).toBe(false);
  expect(button.getAttribute("aria-disabled")).toBe("true");
  const status = locatingStatus();
  expect(status.textContent).toContain(copy.locating);
  expect(status.textContent).toContain(copy.locatingSub);
  expect(status.querySelector("svg.mark--searching")?.getAttribute("aria-hidden")).toBe("true");
  expect(onSettle).toHaveBeenCalledTimes(1);
});

test("METRO-113 the status region is mounted and empty before locating, and the same node fills", () => {
  geolocation(() => {});
  render(<NearestStation maps={fakeMaps} />);
  const status = locatingStatus();
  expect(status.textContent).toBe("");
  expect(status.className).toBe("visually-hidden");
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(locatingStatus()).toBe(status);
  expect(status.textContent).toContain(copy.locating);
  expect(status.className).toBe("status");
});

test("METRO-113 pressing the button again while locating asks again, and only the later answer counts", async () => {
  const successes: PositionCallback[] = [];
  geolocation((success) => {
    successes.push(success);
  });
  const onLocation = vi.fn();
  render(<NearestStation maps={fakeMaps} onLocation={onLocation} />);
  const button = screen.getByRole("button", { name: copy.locateButton });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(successes).toHaveLength(2);
  await act(async () => {
    successes[0]?.(fakePosition(NEAR_MOTIJHEEL.lat, NEAR_MOTIJHEEL.lng));
    await Promise.resolve();
  });
  expect(onLocation).not.toHaveBeenCalled();
  await act(async () => {
    successes[1]?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(onLocation).toHaveBeenCalledTimes(1);
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-113 a locating that never answers ends as unavailable after the watchdog, with Try again", async () => {
  vi.useFakeTimers();
  try {
    geolocation(() => {});
    render(<NearestStation maps={fakeMaps} />);
    fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
    expect(locatingStatus().textContent).toContain(copy.locating);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCHDOG_MS);
    });
    expect(locatingStatus().textContent).toBe("");
    const group = screen.getByRole("group", { name: copy.unavailable.search });
    expect(document.activeElement).toBe(within(group).getByRole("button", { name: copy.tryAgain }));
  } finally {
    vi.useRealTimers();
  }
});

test("METRO-113 a station pick cancels a locating in flight: a late fix is ignored (no result, focus, sheet or callback)", async () => {
  const successes: PositionCallback[] = [];
  geolocation((success) => {
    successes.push(success);
  });
  const onLocation = vi.fn();
  const onSettle = vi.fn();
  const view = render(
    <NearestStation maps={fakeMaps} onLocation={onLocation} onSettle={onSettle} />,
  );
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(locatingStatus().textContent).toContain(copy.locating);
  expect(onSettle).toHaveBeenCalledTimes(1);
  const other = document.body.appendChild(document.createElement("button"));
  other.focus();
  view.rerender(
    <NearestStation maps={fakeMaps} onLocation={onLocation} onSettle={onSettle} pickSeq={1} />,
  );
  // The status is gone at once; the answer arrives later and changes nothing.
  expect(locatingStatus().textContent).toBe("");
  await act(async () => {
    successes[0]?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(onLocation).not.toHaveBeenCalled();
  expect(onSettle).toHaveBeenCalledTimes(1);
  expect(document.querySelector(".result")).toBeNull();
  expect(document.activeElement).toBe(other);
  other.remove();
});

test("METRO-113 a station pick clears a stale notice", async () => {
  geolocation((_success, failure) => failure(denied));
  const view = render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByRole("group", { name: copy.denied.search });
  view.rerender(<NearestStation maps={fakeMaps} pickSeq={1} />);
  expect(document.querySelector(".notice")).toBeNull();
});

test("METRO-113 unmounting during a locating means no callback and no sheet move when the answer arrives", async () => {
  const successes: PositionCallback[] = [];
  geolocation((success) => {
    successes.push(success);
  });
  const onLocation = vi.fn();
  const onSettle = vi.fn();
  const view = render(
    <NearestStation maps={fakeMaps} onLocation={onLocation} onSettle={onSettle} />,
  );
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  view.unmount();
  await act(async () => {
    successes[0]?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(onLocation).not.toHaveBeenCalled();
  expect(onSettle).toHaveBeenCalledTimes(1);
});

/** Midpoint of the first two stations: the worst place for "nearest" (a bisector), from the real dataset. */
const BISECTOR: Coordinate = (() => {
  const [a, b] = Core.baselineDataset.stations;
  if (a === undefined || b === undefined) throw new Error("dataset too small");
  return {
    lat: (a.coordinate.lat + b.coordinate.lat) / 2,
    lng: (a.coordinate.lng + b.coordinate.lng) / 2,
  };
})();

function pressAtBisector(accuracy: number): void {
  geolocation((success) => success(fakePosition(BISECTOR.lat, BISECTOR.lng, accuracy)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
}

// The handoff's "up to 2,000 m is a result" is superseded by METRO-103: with real core, accuracy above 100 m
// is rough when the runner-up could be nearer (the 2r rule), so a 1,500 m fix at a bisector is rough.
test("METRO-103 at a bisector, core's rule gives a 100 m fix a station", async () => {
  pressAtBisector(100);
  await screen.findByText(copy.distanceLabel);
  expect(document.querySelector(".notice")).toBeNull();
});

test("METRO-103 at a bisector, core's rule makes 1,500 m and 2,000 m fixes rough", async () => {
  pressAtBisector(1500);
  expect(await screen.findByText(/with an error of about 1\.5 km/u)).toBeTruthy();
  expect(document.querySelector(".result")).toBeNull();
  cleanup();
  pressAtBisector(2000);
  expect(await screen.findByText(/with an error of about 2 km/u)).toBeTruthy();
  expect(document.querySelector(".result")).toBeNull();
});

test("METRO-113 the locating status is the only status of its concern and holds no control", () => {
  geolocation(() => {});
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  // The place-search notice has its own (empty) status region; only the locating one has text.
  const statuses = screen.getAllByRole("status").filter((node) => node.textContent !== "");
  expect(statuses).toHaveLength(1);
  expect(within(must(statuses[0])).queryByRole("button")).toBeNull();
});

test("METRO-88 never renders or logs a provider error or a coordinate from a failure", async () => {
  const spies = (["error", "warn", "log", "info", "debug"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
  world.service = routeService(() => Promise.reject(new Error("key=abc lat=23.8 lng=90.4")));
  render(
    <StrictMode>
      <NearestStation maps={fakeMaps} />
    </StrictMode>,
  );
  pickPlace(NEAR_UTTARA_NORTH);
  await screen.findByText(copy.routeUnavailable);
  for (const fragment of ["key=abc", "lat=", "lng="]) {
    expect(document.body.textContent).not.toContain(fragment);
  }
  for (const spy of spies) {
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
});

test("METRO-88 a stale route answer for an earlier place is never shown for a later one", async () => {
  const resolvers: ((value: WalkingRoute) => void)[] = [];
  world.service = routeService(
    () =>
      new Promise<WalkingRoute>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  pickPlace(NEAR_MOTIJHEEL);
  await act(async () => {
    resolvers[0]?.(route(111, 600));
    await Promise.resolve();
  });
  expect(screen.queryByText(/about 110 m/u)).toBeNull();
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  await act(async () => {
    resolvers[1]?.(route(222, 120));
    await Promise.resolve();
  });
  expect(screen.getByText("about 220 m, 2 min · est.")).toBeTruthy();
});

test("METRO-88 a late route failure for an earlier place is ignored", async () => {
  const rejecters: ((reason: unknown) => void)[] = [];
  world.service = routeService(
    () =>
      new Promise<WalkingRoute>((_resolve, reject) => {
        rejecters.push(reject);
      }),
  );
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  pickPlace(NEAR_MOTIJHEEL);
  await act(async () => {
    rejecters[0]?.(new Error("late"));
    await Promise.resolve();
  });
  expect(screen.queryByText(copy.routeUnavailable)).toBeNull();
});

test("METRO-88 a new result takes focus on its heading, even at the same point", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  expect(document.activeElement).toBe(heading("Motijheel"));
  pickPlace(NEAR_UTTARA_NORTH);
  expect(document.activeElement).toBe(heading("Uttara North"));
  must(document.querySelector<HTMLElement>(":focus")).blur();
  pickPlace(NEAR_UTTARA_NORTH);
  expect(document.activeElement).toBe(heading("Uttara North"));
});

/** A geolocation whose answer the test gives later. */
const pending: { success: PositionCallback | null } = { success: null };

test("METRO-88 a position fix that arrives after a place was chosen does not overwrite it", async () => {
  geolocation((success) => {
    pending.success = success;
  });
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  pickPlace(NEAR_MOTIJHEEL);
  await act(async () => {
    pending.success?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(heading("Motijheel")).toBeTruthy();
  expect(screen.queryByText(copy.locating)).toBeNull();
});

test("METRO-88 a place chosen after a position fix wins, and a denial after a place changes nothing", async () => {
  geolocation((success) => success(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  pickPlace(NEAR_MOTIJHEEL);
  expect(heading("Motijheel")).toBeTruthy();
  geolocation((_success, failure) => failure(denied));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  pickPlace(NEAR_UTTARA_NORTH);
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByText(copy.denied.search)).toBeNull();
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-88 a late position fix does not pull focus out of the search box the user is typing in", async () => {
  geolocation((success) => {
    pending.success = success;
  });
  const onSettle = vi.fn();
  render(<NearestStation maps={fakeMaps} onSettle={onSettle} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const box = screen.getByRole("textbox", { name: "fake search box" });
  box.focus();
  expect(onSettle).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.success?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(heading("Uttara North")).toBeTruthy();
  expect(document.activeElement).toBe(box);
  // The sheet is not moved under the user's hands either: only the locating snap happened.
  expect(onSettle).toHaveBeenCalledTimes(1);
});

test("METRO-88 a place chosen in the search box still moves focus to the result, and a later fix elsewhere does too", async () => {
  geolocation((success) => success(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng)));
  render(<NearestStation maps={fakeMaps} />);
  screen.getByRole("textbox", { name: "fake search box" }).focus();
  pickPlace(NEAR_MOTIJHEEL);
  expect(document.activeElement).toBe(heading("Motijheel"));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const fixed = await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(document.activeElement).toBe(fixed);
});

test("METRO-88 where a button click leaves focus in the search box, the fix still takes focus", async () => {
  geolocation((success) => {
    pending.success = success;
  });
  render(<NearestStation maps={fakeMaps} />);
  const box = screen.getByRole("textbox", { name: "fake search box" });
  box.focus();
  // Safari and macOS Firefox do not move focus to a clicked button; fireEvent.click does not either.
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(document.activeElement).toBe(box);
  await act(async () => {
    pending.success?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(document.activeElement).toBe(heading("Uttara North"));
});

test("METRO-88 typing in the search box after the click still wins over a late fix", async () => {
  geolocation((success) => {
    pending.success = success;
  });
  render(<NearestStation maps={fakeMaps} />);
  const box = screen.getByRole("textbox", { name: "fake search box" });
  box.focus();
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  fireEvent.keyDown(box, { key: "m" });
  await act(async () => {
    pending.success?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(heading("Uttara North")).toBeTruthy();
  expect(document.activeElement).toBe(box);
});

function fixWithAccuracy(accuracy: number): void {
  geolocation((success) => success(fakePosition(23.87, 90.367, accuracy)));
}

test("METRO-103 a coarse fix shows the rough-location notice, no station, no pin and no route request", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  fixWithAccuracy(25_000);
  const onLocation = vi.fn();
  render(<NearestStation maps={fakeMaps} onLocation={onLocation} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.roughKnown("about 25 km").search });
  expect(group.textContent).toContain("with an error of about 25 km");
  expect(document.activeElement).toBe(within(group).getByRole("button", { name: copy.tryAgain }));
  expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  expect(document.querySelector(".result")).toBeNull();
  expect(walk).not.toHaveBeenCalled();
  // No highlight and no pin: the only report is the clearing one.
  expect(onLocation).toHaveBeenCalledTimes(1);
  expect(onLocation).toHaveBeenCalledWith(null);
  // The consent line and the place search stay.
  expect(screen.getByText(copy.consent)).toBeTruthy();
  expect(world.searchProps).not.toBeNull();
});

test("METRO-103 a fix with unknown accuracy is treated as rough, with copy that states no size", async () => {
  for (const unknown of [Number.NaN, Infinity, -5]) {
    cleanup();
    fixWithAccuracy(unknown);
    render(<NearestStation maps={fakeMaps} />);
    fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
    expect(await screen.findByRole("group", { name: copy.roughUnknown.search })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  }
});

test("METRO-103 a precise fix gives the station and the pin, with no notice", async () => {
  fixWithAccuracy(20);
  const onLocation = vi.fn();
  render(<NearestStation maps={fakeMaps} onLocation={onLocation} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelector(".notice")).toBeNull();
  expect(onLocation).toHaveBeenCalledWith({
    stationId: Core.stationId("uttara-north"),
    position: { lat: 23.87, lng: 90.367 },
  });
});

test("METRO-113 a searched place highlights its station but draws no user pin", () => {
  const onLocation = vi.fn();
  render(<NearestStation maps={fakeMaps} onLocation={onLocation} />);
  pickPlace(NEAR_MOTIJHEEL);
  expect(onLocation).toHaveBeenCalledWith({
    stationId: Core.stationId("motijheel"),
    position: null,
  });
});

test("METRO-113 an invalid location reports no station and no pin", () => {
  const onLocation = vi.fn();
  render(<NearestStation maps={fakeMaps} onLocation={onLocation} />);
  pickPlace({ lat: 200, lng: 0 });
  expect(onLocation).toHaveBeenCalledWith({ stationId: null, position: null });
});

test("METRO-103 a rough fix clears an earlier result, and a place chosen afterwards works", async () => {
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(
    await screen.findByRole("group", { name: copy.roughKnown("about 25 km").search }),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Motijheel" })).toBeNull();
  pickPlace(NEAR_UTTARA_NORTH);
  expect(document.querySelector(".notice")).toBeNull();
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-103 a failed locate after a rough one drops the rough copy", async () => {
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByText(copy.roughKnown("about 25 km").search);
  geolocation((_success, failure) => failure(denied));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("group", { name: copy.denied.search })).toBeTruthy();
  expect(screen.queryByText(copy.roughKnown("about 25 km").search)).toBeNull();
});

test("METRO-103 a GPS-grade fix of 100 m is never called rough, even at a bisector", async () => {
  fixWithAccuracy(100);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  expect(document.querySelector(".notice")).toBeNull();
});

test("METRO-103 an invalid position is the empty state, never the rough copy", async () => {
  geolocation((success) => success(fakePosition(200, 0, 25_000)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByText(copy.empty)).toBeTruthy();
  expect(screen.queryByText(copy.roughKnown("about 25 km").search)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("METRO-113 a rough fix that arrives while the user types does not take focus or the sheet, and is an alert", async () => {
  const fixCallbacks: PositionCallback[] = [];
  geolocation((success) => {
    fixCallbacks.push(success);
  });
  const onSettle = vi.fn();
  render(<NearestStation maps={fakeMaps} onSettle={onSettle} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const input = screen.getByLabelText("fake search box");
  act(() => input.focus());
  expect(document.activeElement).toBe(input);
  act(() => fixCallbacks[0]?.(fakePosition(23.87, 90.367, 25_000)));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain(copy.roughKnown("about 25 km").search);
  expect(document.activeElement).toBe(input);
  expect(onSettle).toHaveBeenCalledTimes(1);
});

test("METRO-103 an earlier in-flight route can never appear after a rough fix clears the origin", async () => {
  const resolvers: ((value: WalkingRoute) => void)[] = [];
  const walk = vi.fn<RouteService["walk"]>(
    () =>
      new Promise<WalkingRoute>((resolve) => {
        resolvers.push(resolve);
      }),
  );
  world.service = routeService(walk);
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(walk).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByText(copy.roughKnown("about 25 km").search);
  await act(async () => {
    resolvers[0]?.(route(1234, 900));
    await Promise.resolve();
  });
  expect(screen.queryByText("1.23 km, 15 min")).toBeNull();
  expect(screen.queryByText(copy.routeLoading)).toBeNull();
  expect(document.querySelector(".result")).toBeNull();
  expect(walk).toHaveBeenCalledTimes(1);
});

test("METRO-113 a late denial while the user types does not take focus but is an alert", async () => {
  const fixCallbacks: PositionErrorCallback[] = [];
  geolocation((_success, failure) => {
    fixCallbacks.push(failure);
  });
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const input = screen.getByLabelText("fake search box");
  act(() => input.focus());
  act(() => fixCallbacks[0]?.(denied));
  expect((await screen.findByRole("alert")).textContent).toContain(copy.denied.search);
  expect(document.activeElement).toBe(input);
});

test("METRO-113 a suppressed location result is hidden and comes back only with a new result", () => {
  const view = render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  expect(heading("Motijheel")).toBeTruthy();
  view.rerender(<NearestStation maps={fakeMaps} suppressed />);
  expect(screen.queryByRole("heading", { name: "Motijheel" })).toBeNull();
  expect(document.querySelector(".result")).toBeNull();
  view.rerender(<NearestStation maps={fakeMaps} suppressed={false} />);
  expect(heading("Motijheel")).toBeTruthy();
});

test("METRO-113 locating and every notice or result ask the sheet to settle at half", async () => {
  const onSettle = vi.fn();
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} onSettle={onSettle} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByRole("group", { name: copy.unavailable.search });
  // Locating, then the error.
  expect(onSettle).toHaveBeenCalledTimes(2);
  pickPlace(NEAR_MOTIJHEEL);
  expect(onSettle).toHaveBeenCalledTimes(3);
});

test("METRO-114 typing in the place search tells the screen, focus alone does not", () => {
  const engage = vi.fn();
  render(<NearestStation maps={fakeMaps} onSearchEngage={engage} />);
  const box = screen.getByRole("textbox", { name: "fake search box" });
  act(() => box.focus());
  act(() => screen.getByRole("button", { name: copy.locateButton }).focus());
  expect(engage).not.toHaveBeenCalled();
  fireEvent.input(box, { target: { value: "mot" } });
  expect(engage).toHaveBeenCalledTimes(1);
});

// METRO-120: a notice's suggested next step names only what is available right now.
const NOTICE_CASES = [
  {
    name: "denied",
    arrange: (): void => geolocation((_success, failure) => failure(denied)),
    variants: copy.denied,
    retry: false,
  },
  {
    name: "unavailable",
    arrange: (): void => geolocation((_success, failure) => failure(timeout)),
    variants: copy.unavailable,
    retry: true,
  },
  {
    name: "rough",
    arrange: (): void => fixWithAccuracy(25_000),
    variants: copy.roughKnown("about 25 km"),
    retry: true,
  },
  {
    name: "rough-unknown",
    arrange: (): void => fixWithAccuracy(Number.NaN),
    variants: copy.roughUnknown,
    retry: true,
  },
] as const;

for (const item of NOTICE_CASES) {
  test(`METRO-120 ${item.name} with place search available: search step, search action, focus on the first action`, async () => {
    item.arrange();
    render(<NearestStation maps={fakeMaps} />);
    pressLocate();
    const group = await screen.findByRole("group", { name: item.variants.search });
    expect(group.textContent).toBe(
      item.variants.search + (item.retry ? copy.tryAgain : "") + copy.searchLabel,
    );
    const first = within(group).getAllByRole("button")[0];
    expect(document.activeElement).toBe(first);
    expect(first?.textContent).toBe(item.retry ? copy.tryAgain : copy.searchLabel);
    expect(within(group).getByRole("button", { name: copy.searchLabel })).toBeTruthy();
  });

  test(`METRO-120 ${item.name} with place search unavailable: pick step, no search action, focus follows`, async () => {
    world.status = "unavailable";
    item.arrange();
    render(<NearestStation maps={fakeMaps} />);
    pressLocate();
    const group = await screen.findByRole("group", { name: item.variants.pick });
    expect(group.textContent).toBe(item.variants.pick + (item.retry ? copy.tryAgain : ""));
    expect(group.textContent).not.toMatch(/search/iu);
    expect(within(group).queryByRole("button", { name: copy.searchLabel })).toBeNull();
    // Try again first when there is one; denied has no action, so the notice itself takes focus.
    expect(document.activeElement).toBe(
      item.retry ? within(group).getByRole("button", { name: copy.tryAgain }) : group,
    );
  });
}

test("METRO-120 no connection: the notice names picking a station until the connection returns", async () => {
  setOnline(false);
  try {
    geolocation((_success, failure) => failure(denied));
    render(<NearestStation maps={fakeMaps} />);
    pressLocate();
    const group = await screen.findByRole("group", { name: copy.denied.pick });
    expect(within(group).queryByRole("button")).toBeNull();
    // The online event while the notice shows: the text and the action follow, and stay true.
    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    const back = screen.getByRole("group", { name: copy.denied.search });
    expect(back.textContent).toBe(copy.denied.search + copy.searchLabel);
    expect(screen.queryByText(copy.denied.pick)).toBeNull();
    expect(screen.getByText(copy.searchLabel, { selector: "label" })).toBeTruthy();
  } finally {
    setOnline(null);
  }
});

test("METRO-120 place search failing while a notice shows swaps its step, drops the action and keeps focus in the notice", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  const group = await screen.findByRole("group", { name: copy.unavailable.search });
  const action = within(group).getByRole("button", { name: copy.searchLabel });
  act(() => action.focus());
  publish({ status: "unavailable" });
  const now = screen.getByRole("group", { name: copy.unavailable.pick });
  expect(within(now).queryByRole("button", { name: copy.searchLabel })).toBeNull();
  expect(screen.queryByText(copy.unavailable.search)).toBeNull();
  expect(document.activeElement).toBe(now);
});

test("METRO-120 place search failing while focus is on the page takes no focus, even with a notice showing", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} />);
  pressLocate();
  const group = await screen.findByRole("group", { name: copy.unavailable.search });
  const action = within(group).getByRole("button", { name: copy.searchLabel });
  // The action had focus, then the user clicked the blank page: focus is on the body.
  act(() => action.focus());
  act(() => action.blur());
  expect(document.activeElement).toBe(document.body);
  publish({ status: "unavailable" });
  const now = screen.getByRole("group", { name: copy.unavailable.pick });
  expect(document.activeElement).toBe(document.body);
  expect(document.activeElement).not.toBe(now);
});

/** A search field that, as it leaves, hands focus to the page's first button (focus already has a new home). */
function FocusHandingSearch(props: PlaceSearchProps) {
  useEffect(
    () => () => {
      document.querySelector("button")?.focus();
    },
    [],
  );
  return (
    <fieldset aria-labelledby={props.labelId}>
      <input aria-label="fake search box" />
    </fieldset>
  );
}

const handingMaps: MapsAdapter = { Provider: FakeProvider, PlaceSearch: FocusHandingSearch };

test("METRO-114 the library failing leaves focus alone when it already moved to another control as the field left", () => {
  render(<NearestStation maps={handingMaps} />);
  act(() => screen.getByRole("textbox", { name: "fake search box" }).focus());
  publish({ status: "unavailable" });
  const button = screen.getByRole("button", { name: copy.locateButton });
  expect(document.activeElement).toBe(button);
  const notice = must(document.querySelector<HTMLElement>(".notice[data-size=sm]"));
  expect(notice.textContent).toContain(copy.searchUnavailable);
  expect(document.activeElement).not.toBe(notice);
});

test("METRO-120 place search failing leaves focus alone when it already moved to another control as the action left", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={handingMaps} />);
  pressLocate();
  const group = await screen.findByRole("group", { name: copy.unavailable.search });
  act(() => within(group).getByRole("button", { name: copy.searchLabel }).focus());
  publish({ status: "unavailable" });
  const now = screen.getByRole("group", { name: copy.unavailable.pick });
  expect(document.activeElement).not.toBe(now);
  // The field handed focus to the page's first button as it left; the notice did not take it back.
  const first = must(document.querySelector<HTMLElement>("button"));
  expect(document.activeElement).toBe(first);
  expect(first.textContent).toBe(copy.tryAgain);
});
