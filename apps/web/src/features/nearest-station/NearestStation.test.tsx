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

/** The estimate shown in the result: "about" then a figure then "straight-line distance · est.". */
const distanceText = (): string => must(document.querySelector(".metric__value")).textContent;

test("METRO-88 a selected place shows the nearest station, the labelled estimate and the walking route", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(await screen.findByText("1.23 km, 15 min")).toBeTruthy();
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

test("METRO-88 the route shows loading while the routes library is not ready", () => {
  render(<NearestStation maps={fakeMaps} />);
  pickPlace(NEAR_UTTARA_NORTH);
  expect(screen.getByText(copy.routeLoading)).toBeTruthy();
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-88 with Maps unavailable there is no search control, only the fixed copy", () => {
  world.status = "unavailable";
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByText(copy.searchUnavailable)).toBeTruthy();
  expect(document.querySelector("[data-fake-search]")).toBeNull();
});

test("METRO-113 a device fix shows the station and the fare range, and no walking route area at all", async () => {
  world.status = "unavailable";
  geolocation((success) => success(fakePosition(23.87, 90.367)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  // The route area is absent, not an error: not even with Maps unavailable (which fails a requested route).
  expect(screen.queryByText(copy.routeUnavailable)).toBeNull();
  expect(screen.queryByText(copy.routeLoading)).toBeNull();
  expect(document.querySelector(".result__walk")).toBeNull();
  // The only alert is the fixed search notice; no route or location alert.
  expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([copy.searchUnavailable]);
});

test("METRO-113 a device fix never asks the route service for anything", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(route(1234, 900)));
  world.service = routeService(walk);
  geolocation((success) => success(fakePosition(23.87, 90.367, 20)));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(walk).not.toHaveBeenCalled();
  expect(screen.queryByText("1.23 km, 15 min")).toBeNull();
  // Control: the same service is used for a searched place.
  pickPlace(NEAR_MOTIJHEEL);
  expect(await screen.findByText("1.23 km, 15 min")).toBeTruthy();
  expect(walk).toHaveBeenCalledTimes(1);
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

test("METRO-88 while Maps loads the search shows a loading message", () => {
  world.status = "loading";
  render(<NearestStation maps={fakeMaps} />);
  expect(screen.getByText(copy.loadingSearch)).toBeTruthy();
  expect(document.querySelector("[data-fake-search]")).not.toBeNull();
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
  const group = await screen.findByRole("group", { name: copy.denied });
  expect(group.textContent).toContain(copy.denied);
  const action = within(group).getByRole("link", { name: copy.searchLabel });
  expect(action.getAttribute("href")).toBe("#place-label");
  expect(document.activeElement).toBe(action);
  // Denied offers no Try again: the browser will not ask again.
  expect(within(group).queryByRole("button")).toBeNull();
  // Focus moved, so the notice is not also an alert (no double announcement).
  expect(screen.queryByRole("alert")).toBeNull();
  pickPlace(NEAR_MOTIJHEEL);
  expect(screen.queryByText(copy.denied)).toBeNull();
  expect(heading("Motijheel")).toBeTruthy();
});

test("METRO-113 denied with Maps unavailable has no action: focus goes to the notice itself", async () => {
  world.status = "unavailable";
  geolocation((_success, failure) => failure(denied));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.denied });
  expect(within(group).queryByRole("link")).toBeNull();
  expect(document.activeElement).toBe(group);
});

test("METRO-113 a timeout and a missing API show the unavailable copy with Try again first", async () => {
  geolocation((_success, failure) => failure(timeout));
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const group = await screen.findByRole("group", { name: copy.unavailable });
  const retry = within(group).getByRole("button", { name: copy.tryAgain });
  expect(document.activeElement).toBe(retry);
  expect(within(group).getByRole("link", { name: copy.searchLabel })).toBeTruthy();
  // The order inside the notice: Try again, then Search for a place.
  expect(retry.compareDocumentPosition(within(group).getByRole("link"))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
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
  expect(screen.queryByRole("group", { name: copy.unavailable })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.locateButton }));
  expect(successes).toHaveLength(2);
  act(() => successes[1]?.(fakePosition(23.87, 90.367, 20)));
  expect(await screen.findByRole("heading", { level: 2, name: "Uttara North" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: copy.unavailable })).toBeNull();
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
  const status = screen.getByRole("status");
  expect(status.textContent).toContain(copy.locating);
  expect(status.textContent).toContain(copy.locatingSub);
  expect(status.querySelector("svg.mark--searching")?.getAttribute("aria-hidden")).toBe("true");
  expect(onSettle).toHaveBeenCalledTimes(1);
  // A second press while locating asks for nothing more.
  const asks = vi.fn();
  geolocation(asks);
  fireEvent.click(button);
  expect(asks).not.toHaveBeenCalled();
});

test("METRO-113 the locating status is the only status of its concern and holds no control", () => {
  geolocation(() => {});
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  const statuses = screen.getAllByRole("status");
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
  expect(screen.queryByText(copy.denied)).toBeNull();
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
  const group = await screen.findByRole("group", { name: copy.roughKnown("about 25 km") });
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
    expect(await screen.findByRole("group", { name: copy.roughUnknown })).toBeTruthy();
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
  expect(await screen.findByRole("group", { name: copy.roughKnown("about 25 km") })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Motijheel" })).toBeNull();
  pickPlace(NEAR_UTTARA_NORTH);
  expect(document.querySelector(".notice")).toBeNull();
  expect(heading("Uttara North")).toBeTruthy();
});

test("METRO-103 a failed locate after a rough one drops the rough copy", async () => {
  fixWithAccuracy(25_000);
  render(<NearestStation maps={fakeMaps} />);
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  await screen.findByText(copy.roughKnown("about 25 km"));
  geolocation((_success, failure) => failure(denied));
  fireEvent.click(screen.getByRole("button", { name: copy.locateButton }));
  expect(await screen.findByRole("group", { name: copy.denied })).toBeTruthy();
  expect(screen.queryByText(copy.roughKnown("about 25 km"))).toBeNull();
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
  expect(screen.queryByText(copy.roughKnown("about 25 km"))).toBeNull();
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
  expect(alert.textContent).toContain(copy.roughKnown("about 25 km"));
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
  await screen.findByText(copy.roughKnown("about 25 km"));
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
  expect((await screen.findByRole("alert")).textContent).toContain(copy.denied);
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
  await screen.findByRole("group", { name: copy.unavailable });
  // Locating, then the error.
  expect(onSettle).toHaveBeenCalledTimes(2);
  pickPlace(NEAR_MOTIJHEEL);
  expect(onSettle).toHaveBeenCalledTimes(3);
});
