import { stationId } from "@metro/core";
import type { Coordinate } from "@metro/core";
import * as Core from "@metro/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode, useEffect, useMemo } from "react";
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
import { copy } from "./copy";
import { fakePosition, fakePositionError } from "./geolocation-fakes";
import { NearestStation } from "./NearestStation";

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

/** Publishes the test's chosen Maps state the way the real provider does. */
function FakeProvider({ children }: { readonly children: ReactNode }) {
  const value = useMemo(() => ({ status: world.status, routes: world.service }), []);
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
  // METRO-102: the placeholder experiment hands the visible label text to the widget.
  expect(world.searchProps?.placeholder).toBe(copy.searchLabel);
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

test("METRO-88 a selected place shows the nearest station, both distances and the walking route", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(await screen.findByText("1.23 km, 15 min")).toBeTruthy();
  const heading = screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" });
  expect(heading.getAttribute("tabindex")).toBe("-1");
  expect(document.activeElement).toBe(heading);
  const term = screen.getByText(copy.straightLine);
  expect(term.nextElementSibling?.textContent).toMatch(/^0\.\d\d km$/u);
  expect(walk).toHaveBeenCalledTimes(1);
  const [from, to] = walk.mock.calls[0] ?? [];
  expect(from).toEqual(NEAR_UTTARA_NORTH);
  expect(to).toEqual(Core.baselineDataset.stations[0]?.coordinate);
  expect(screen.queryByRole("alert")).toBeNull();
});

test("METRO-88 the route shows loading while the routes library is not ready", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  expect(screen.getByText("Uttara North")).toBeTruthy();
});

test("METRO-88 with Maps unavailable there is no search control, only the fixed copy", () => {
  world.status = "unavailable";
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByText(copy.searchUnavailable)).toBeTruthy();
  expect(document.querySelector("[data-fake-search]")).toBeNull();
});

test("METRO-88 the device position finds the nearest station without Google, then the route fails visibly", async () => {
  world.status = "unavailable";
  geolocation((success) => success(fakePosition(23.87, 90.367)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByText("Uttara North")).toBeTruthy();
  expect(screen.getByText(copy.routeUnavailable)).toBeTruthy();
  expect(screen.getByRole("combobox", { name: copy.destinationLabel })).toBeTruthy();
});

test("METRO-88 a failed route request shows fixed copy and keeps the station and fare", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  world.service = routeService(() => Promise.reject(new Error("https://x.test?lat=23.8")));
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(await screen.findByText(copy.routeUnavailable)).toBeTruthy();
  expect(document.body.textContent).not.toContain("x.test");
  expect(screen.getByText("Uttara North")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: "motijheel" },
  });
  expect(screen.getByText("Uttara North to Motijheel: BDT 100")).toBeTruthy();
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-88 the destination list excludes the origin and the fare comes from core", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const select = screen.getByRole("combobox", { name: copy.destinationLabel });
  const options = within(select)
    .getAllByRole("option")
    .map((o) => o.textContent);
  expect(options).toHaveLength(16);
  expect(options).toContain("Uttara North");
  expect(options).not.toContain("Motijheel");
  expect(screen.getByText(copy.fareChoose)).toBeTruthy();
  fireEvent.change(select, { target: { value: "uttara-north" } });
  expect(screen.getByText("Motijheel to Uttara North: BDT 100")).toBeTruthy();
  fireEvent.change(select, { target: { value: "" } });
  expect(screen.getByText(copy.fareChoose)).toBeTruthy();
});

test("METRO-88 a chosen destination is dropped when a new place makes it the origin", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const select = screen.getByRole("combobox", { name: copy.destinationLabel });
  fireEvent.change(select, { target: { value: "uttara-north" } });
  pickPlace(NEAR_UTTARA_NORTH);
  expect(screen.getByText("Uttara North")).toBeTruthy();
  expect(
    screen.getByRole<HTMLSelectElement>("combobox", { name: copy.destinationLabel }).value,
  ).toBe("");
  expect(screen.getByText(copy.fareChoose)).toBeTruthy();
});

test("METRO-88 'Fares as of' shows both the DTCA notice date and the last-checked date", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  expect(
    screen.getByText(
      "Fares as of: DTCA notice dated 8 September 2022; last checked 5 November 2026.",
    ),
  ).toBeTruthy();
});

test("METRO-88 an unknown fare shows fixed copy and never zero", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  override.fare = { kind: "unknown-fare", reason: "no-fare-entry" };
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: stationId("uttara-north") },
  });
  expect(screen.getByText(copy.fareUnknown)).toBeTruthy();
  expect(document.body.textContent).not.toContain("BDT 0");
});

test("METRO-88 an invalid location is the empty state", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace({ lat: 200, lng: 0 });
  expect(screen.getByText(copy.empty)).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("METRO-88 while Maps loads the search shows a loading message", () => {
  world.status = "loading";
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByText(copy.loadingSearch)).toBeTruthy();
  expect(document.querySelector("[data-fake-search]")).not.toBeNull();
});

test("METRO-88 a search failure shows fixed copy, location still works and a later place clears it", async () => {
  render(<NearestStation maps={fakeMaps} />);
  act(() => world.searchProps?.onFailure());
  expect(screen.getByRole("alert").textContent).toBe(copy.searchUnavailable);
  pickPlace(NEAR_MOTIJHEEL);
  expect(screen.queryByText(copy.searchUnavailable)).toBeNull();
  expect(screen.getByText("Motijheel")).toBeTruthy();
});

test("METRO-88 denied permission shows focused fixed copy and search still works", async () => {
  geolocation((_success, failure) => failure(denied));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe(copy.denied);
  expect(document.activeElement).toBe(alert);
  pickPlace(NEAR_MOTIJHEEL);
  expect(screen.queryByText(copy.denied)).toBeNull();
  expect(screen.getByText("Motijheel")).toBeTruthy();
});

test("METRO-88 a timeout and a missing API show the unavailable copy", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect((await screen.findByRole("alert")).textContent).toBe(copy.unavailable);
});

test("METRO-88 while locating the button is disabled and a status says so", () => {
  geolocation(() => {});
  render(<NearestStation maps={fakeMaps} />);
  const button = screen.getByRole<HTMLButtonElement>("button", { name: copy.locateButton });
  fireEvent.click(button);
  expect(button.disabled).toBe(true);
  expect(screen.getByText(copy.locating)).toBeTruthy();
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
  expect(screen.queryByText(/111 m/u)).toBeNull();
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  await act(async () => {
    resolvers[1]?.(route(222, 120));
    await Promise.resolve();
  });
  expect(screen.getByText("222 m, 2 min")).toBeTruthy();
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

test("METRO-88 a new result takes focus on its heading so the station is announced", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const first = screen.getByRole("heading", { level: 2, name: "Nearest station: Motijheel" });
  expect(document.activeElement).toBe(first);
  pickPlace(NEAR_UTTARA_NORTH);
  const second = screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" });
  expect(document.activeElement).toBe(second);
});

test("METRO-88 the fare shows the currency from core's Fare, not a literal", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  override.fare = { kind: "fare", fare: { amount: 55, currency: "XYZ" } };
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: "uttara-north" },
  });
  expect(screen.getByText("Motijheel to Uttara North: XYZ 55")).toBeTruthy();
});

test("METRO-88 the destination is forgotten when the origin station changes, and stays forgotten", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: "farmgate" },
  });
  pickPlace(NEAR_UTTARA_NORTH);
  pickPlace(NEAR_MOTIJHEEL);
  expect(
    screen.getByRole<HTMLSelectElement>("combobox", { name: copy.destinationLabel }).value,
  ).toBe("");
  expect(screen.getByText(copy.fareChoose)).toBeTruthy();
});

test("METRO-88 a new place with the same nearest station keeps the chosen destination", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: "farmgate" },
  });
  pickPlace({ lat: NEAR_MOTIJHEEL.lat + 0.0005, lng: NEAR_MOTIJHEEL.lng });
  expect(screen.getByText("Motijheel to Farmgate: BDT 30")).toBeTruthy();
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
  expect(
    screen.getByRole("heading", { level: 2, name: "Nearest station: Motijheel" }),
  ).toBeTruthy();
  expect(screen.queryByText(copy.locating)).toBeNull();
});

test("METRO-88 a place chosen after a position fix wins, and a denial after a place changes nothing", async () => {
  geolocation((success) => success(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(
    await screen.findByRole("heading", { level: 2, name: "Nearest station: Uttara North" }),
  ).toBeTruthy();
  pickPlace(NEAR_MOTIJHEEL);
  expect(
    screen.getByRole("heading", { level: 2, name: "Nearest station: Motijheel" }),
  ).toBeTruthy();
  geolocation((_success, failure) => failure(denied));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  pickPlace(NEAR_UTTARA_NORTH);
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByText(copy.denied)).toBeNull();
  expect(
    screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" }),
  ).toBeTruthy();
});

test("METRO-88 a late position fix does not pull focus out of the search box the user is typing in", async () => {
  geolocation((success) => {
    pending.success = success;
  });
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const box = screen.getByRole("textbox", { name: "fake search box" });
  box.focus();
  await act(async () => {
    pending.success?.(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng));
    await Promise.resolve();
  });
  expect(
    screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" }),
  ).toBeTruthy();
  expect(document.activeElement).toBe(box);
});

test("METRO-88 a place chosen in the search box still moves focus to the result, and a later fix elsewhere does too", async () => {
  geolocation((success) => success(fakePosition(NEAR_UTTARA_NORTH.lat, NEAR_UTTARA_NORTH.lng)));
  render(<NearestStation maps={fakeMaps} />);
  screen.getByRole("textbox", { name: "fake search box" }).focus();
  pickPlace(NEAR_MOTIJHEEL);
  const chosen = screen.getByRole("heading", { level: 2, name: "Nearest station: Motijheel" });
  expect(document.activeElement).toBe(chosen);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const fixed = await screen.findByRole("heading", {
    level: 2,
    name: "Nearest station: Uttara North",
  });
  expect(document.activeElement).toBe(fixed);
});

test("METRO-88 re-rendering the result does not take focus back", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  const select = screen.getByRole("combobox", { name: copy.destinationLabel });
  select.focus();
  fireEvent.change(select, { target: { value: "farmgate" } });
  expect(document.activeElement).toBe(select);
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
  const heading = screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" });
  expect(document.activeElement).toBe(heading);
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
  expect(
    screen.getByRole("heading", { level: 2, name: "Nearest station: Uttara North" }),
  ).toBeTruthy();
  expect(document.activeElement).toBe(box);
});

function fixWithAccuracy(accuracy: number): void {
  geolocation((success) => success(fakePosition(23.87, 90.367, accuracy)));
}

test("METRO-103 a coarse fix shows the rough-location copy, no station and no route request", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe(copy.roughKnown("about 25 km"));
  expect(alert.textContent).toContain("with an error of about 25 km");
  expect(document.activeElement).toBe(alert);
  expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(walk).not.toHaveBeenCalled();
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
    expect((await screen.findByRole("alert")).textContent).toBe(copy.roughUnknown);
    expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  }
});

test("METRO-103 a precise fix behaves as before: station, route and no alert", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  fixWithAccuracy(20);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByText("1.23 km, 15 min")).toBeTruthy();
  expect(screen.getByText("Uttara North")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(walk).toHaveBeenCalledTimes(1);
});

test("METRO-103 a rough fix clears an earlier result, and a place chosen afterwards works", async () => {
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_MOTIJHEEL);
  fireEvent.change(screen.getByRole("combobox", { name: copy.destinationLabel }), {
    target: { value: "uttara-north" },
  });
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect((await screen.findByRole("alert")).textContent).toBe(copy.roughKnown("about 25 km"));
  expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  pickPlace(NEAR_UTTARA_NORTH);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Uttara North")).toBeTruthy();
  expect(
    screen.getByRole<HTMLSelectElement>("combobox", { name: copy.destinationLabel }).value,
  ).toBe("");
});

test("METRO-103 a failed locate after a rough one drops the rough copy", async () => {
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByText(copy.roughKnown("about 25 km"));
  geolocation((_success, failure) => failure(denied));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect((await screen.findByRole("alert")).textContent).toBe(copy.denied);
});

test("METRO-103 a GPS-grade fix of 100 m is never called rough, even at a bisector", async () => {
  fixWithAccuracy(100);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByText("Uttara North")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("METRO-103 an invalid position is the empty state, never the rough copy", async () => {
  geolocation((success) => success(fakePosition(200, 0, 25_000)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByText(copy.empty)).toBeTruthy();
  expect(screen.queryByText(copy.roughKnown("about 25 km"))).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("METRO-103 a rough fix that arrives while the user types does not take focus but is still announced", async () => {
  const fixCallbacks: PositionCallback[] = [];
  geolocation((success) => {
    fixCallbacks.push(success);
  });
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const input = screen.getByLabelText("fake search box");
  act(() => input.focus());
  expect(document.activeElement).toBe(input);
  act(() => fixCallbacks[0]?.(fakePosition(23.87, 90.367, 25_000)));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe(copy.roughKnown("about 25 km"));
  expect(document.activeElement).toBe(input);
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
  await screen.findByText(copy.roughKnown("about 25 km"));
  await act(async () => {
    resolvers[0]?.(route(1234, 900));
    await Promise.resolve();
  });
  expect(screen.queryByText("1.23 km, 15 min")).toBeNull();
  expect(screen.queryByText(copy.routeLoading)).toBeNull();
  expect(screen.queryByRole("heading", { name: copy.resultHeading })).toBeNull();
  expect(walk).toHaveBeenCalledTimes(1);
});
