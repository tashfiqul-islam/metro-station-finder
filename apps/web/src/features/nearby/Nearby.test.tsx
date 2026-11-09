import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { mapsAdapter } from "../../adapters/maps";
import { MapsContext, PLACE_INPUT_ID } from "../../adapters/maps/context";
import type { MapsAdapter } from "../../adapters/maps/context";
import { AppShell } from "../../shell/AppShell";
import { fakePosition } from "../nearest-station/geolocation-fakes";
import { Nearby } from "./Nearby";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "geolocation");
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

function noop(): void {}

/** A ready adapter with a plain stand-in for the search, so the page order can be checked (no key in tests). */
const readyMaps: MapsAdapter = {
  Provider: ({ children }) => (
    <MapsContext value={{ status: "ready", routes: null, load: noop }}>{children}</MapsContext>
  ),
  PlaceSearch: () => <input id={PLACE_INPUT_ID} aria-label="stand-in search" />,
};

/** The screen inside the shell the way `AppRoutes` wires it: the map goes up through `setMap`. */
function Harness({
  mounted = true,
  initialSnap,
  maps = mapsAdapter,
}: {
  readonly maps?: MapsAdapter;
  readonly mounted?: boolean;
  readonly initialSnap?: "peek" | "half" | "full";
}) {
  const [map, setMap] = useState<ReactNode>(null);
  return (
    <AppShell map={map} {...(initialSnap === undefined ? {} : { initialSnap })}>
      {mounted ? <Nearby maps={maps} setMap={setMap} /> : null}
    </AppShell>
  );
}

const combo = (): HTMLElement => screen.getByRole("combobox", { name: "Or pick a station" });

test("METRO-112 the screen fills the shell's map slot with the line map, nothing highlighted yet", () => {
  render(<Harness />);
  const map = screen.getByRole("application", { name: "Schematic map of MRT Line 6" });
  expect(map.closest(".app__map")).not.toBeNull();
  expect(screen.getByRole("list", { name: /^Stations on MRT Line 6/u }).textContent).not.toContain(
    "highlighted",
  );
});

test("METRO-112 picking a station highlights it on the map", () => {
  render(<Harness />);
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  const items = screen
    .getAllByRole("listitem")
    .filter((item) => item.textContent.includes("Farmgate"));
  expect(items.some((item) => item.textContent === "Farmgate, highlighted")).toBe(true);
  expect(
    screen.getByRole("application", { name: "Schematic map of MRT Line 6" }).textContent,
  ).toContain("Farmgate");
});

test("METRO-112 the map goes away with the screen", () => {
  const { rerender } = render(<Harness />);
  rerender(<Harness mounted={false} />);
  expect(screen.queryByRole("application")).toBeNull();
});

test("METRO-112 the existing controls keep their order and the picker follows the location controls", () => {
  render(<Harness />);
  const locate = screen.getByRole("button", { name: "Use my location" });
  const picker = combo();
  const order = locate.compareDocumentPosition(picker);
  expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // Header, then panel handle, then the screen; the map region comes after the panel.
  const main = screen.getByRole("main");
  const region = screen.getByRole("region", { name: "Line map" });
  expect(main.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("METRO-112 Show on map moves keyboard focus to the map", () => {
  render(<Harness />);
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  });
  expect(document.activeElement).toBe(
    screen.getByRole("application", { name: "Schematic map of MRT Line 6" }),
  );
});

test("METRO-112 Show on map does not fail when the map has not loaded", () => {
  render(
    <AppShell>
      <Nearby maps={mapsAdapter} setMap={vi.fn()} />
    </AppShell>,
  );
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(screen.getByRole("heading", { level: 2, name: "Farmgate" })).toBeTruthy();
});

// METRO-113: exactly one current result.

function geolocation(accuracy: number, lat = 23.87, lng = 90.367): void {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => success(fakePosition(lat, lng, accuracy)),
    },
  });
}

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}
const locate = (): HTMLElement => screen.getByRole("button", { name: "Use my location" });
const mapDesc = (): string => document.querySelector(".line-map svg desc")?.textContent ?? "";
const resultHeadings = (): string[] =>
  screen
    .queryAllByRole("heading", { level: 2 })
    .filter((h) => h.getAttribute("tabindex") === "-1")
    .map((h) => h.textContent);
const sheet = (): string =>
  screen.getByRole("button", { name: /^Resize panel\./u }).getAttribute("aria-label") ?? "";
/** The locating status (the shell has its own, for the panel size). */
const locatingStatus = (): HTMLElement =>
  must(
    screen
      .getAllByRole("status")
      .find((node) => node.tagName === "OUTPUT" && !node.textContent.startsWith("Panel")),
  );
/** Lets the map's passive effect run: `findBy*` can resolve before it. */
async function flush(): Promise<void> {
  await act(async () => {});
}
const follows = (a: Node, b: Node): boolean =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
function pick(text: string): void {
  fireEvent.change(combo(), { target: { value: text } });
  fireEvent.keyDown(combo(), { key: "Enter" });
}

test("METRO-113 a location fix shows one result, the highlight and the user pin, and the sheet goes to half", async () => {
  geolocation(20);
  render(<Harness initialSnap="peek" />);
  expect(sheet()).toContain("peek");
  fireEvent.click(locate());
  const heading = await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(document.activeElement).toBe(heading);
  await flush();
  expect(resultHeadings()).toEqual(["Uttara North"]);
  expect(mapDesc()).toContain("Highlighted: Uttara North.");
  expect(mapDesc()).toContain("Your position is shown.");
  expect(sheet()).toContain("half");
});

test("METRO-113 order A: a station picked after a location result replaces it (one heading, highlight, no pin, focus)", async () => {
  geolocation(20);
  render(<Harness />);
  fireEvent.click(locate());
  await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  pick("farm");
  expect(resultHeadings()).toEqual(["Farmgate"]);
  expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Farmgate" }));
  expect(mapDesc()).toContain("Highlighted: Farmgate.");
  expect(mapDesc()).not.toContain("Highlighted: Uttara North");
  expect(mapDesc()).not.toContain("Your position is shown.");
  // One ticket and no location result.
  expect(document.querySelectorAll(".ticket")).toHaveLength(1);
  expect(document.querySelectorAll(".result")).toHaveLength(0);
  expect(sheet()).toContain("half");
});

test("METRO-113 order B: a location fix after a pick replaces it (one heading, highlight and pin, focus)", async () => {
  geolocation(20);
  render(<Harness />);
  pick("farm");
  expect(resultHeadings()).toEqual(["Farmgate"]);
  fireEvent.click(locate());
  const heading = await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(resultHeadings()).toEqual(["Uttara North"]);
  expect(document.activeElement).toBe(heading);
  await flush();
  expect(mapDesc()).toContain("Highlighted: Uttara North.");
  expect(mapDesc()).not.toContain("Farmgate");
  expect(mapDesc()).toContain("Your position is shown.");
  expect(document.querySelectorAll(".ticket")).toHaveLength(0);
  expect(document.querySelectorAll(".result")).toHaveLength(1);
});

test("METRO-113 picking the same station again after a fix brings its result back and moves focus", async () => {
  geolocation(20);
  render(<Harness />);
  pick("uttara");
  fireEvent.click(locate());
  await screen.findByText("straight-line distance · est.");
  pick("uttara");
  expect(document.querySelectorAll(".result")).toHaveLength(0);
  expect(document.activeElement).toBe(
    screen.getByRole("heading", { level: 2, name: "Uttara North" }),
  );
});

test("METRO-113 a rough fix shows no station, no pin and no highlight, and clears a location result", async () => {
  geolocation(20);
  render(<Harness />);
  fireEvent.click(locate());
  await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  geolocation(25_000);
  fireEvent.click(locate());
  await screen.findByRole("group", { name: /found your position only roughly/u });
  await flush();
  expect(resultHeadings()).toEqual([]);
  expect(mapDesc()).not.toContain("Highlighted");
  expect(mapDesc()).not.toContain("Your position is shown.");
  expect(sheet()).toContain("half");
});

test("METRO-113 a rough fix leaves a picked station as the current result", async () => {
  geolocation(25_000);
  render(<Harness />);
  pick("farm");
  fireEvent.click(locate());
  await screen.findByRole("group", { name: /found your position only roughly/u });
  await flush();
  expect(resultHeadings()).toEqual(["Farmgate"]);
  expect(mapDesc()).toContain("Highlighted: Farmgate.");
  expect(mapDesc()).not.toContain("Your position is shown.");
});

test("METRO-113 the page order is Use my location, then the place search, then Or pick a station, then the result", async () => {
  geolocation(20);
  render(<Harness maps={readyMaps} />);
  fireEvent.click(locate());
  const result = await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  const label = must(document.getElementById("place-label"));
  expect(follows(locate(), label)).toBe(true);
  expect(follows(label, combo())).toBe(true);
  expect(follows(combo(), result)).toBe(true);
});

test("METRO-113 a fix sends no request of any kind and logs nothing", async () => {
  geolocation(20);
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const logs = (["error", "warn", "log", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
  render(<Harness />);
  fireEvent.click(locate());
  await screen.findByRole("heading", { level: 2, name: "Uttara North" });
  expect(fetchSpy).not.toHaveBeenCalled();
  for (const spy of logs) expect(spy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("METRO-113 a station picked while locating cancels it: the late fix neither replaces the pick, nor takes focus, nor moves the sheet", async () => {
  const successes: PositionCallback[] = [];
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => {
        successes.push(success);
      },
    },
  });
  render(<Harness initialSnap="peek" />);
  fireEvent.click(locate());
  expect(sheet()).toContain("half");
  expect(locatingStatus().textContent).toContain("Finding your position");
  pick("farm");
  await flush();
  expect(locatingStatus().textContent).toBe("");
  const farmgate = screen.getByRole("heading", { level: 2, name: "Farmgate" });
  expect(document.activeElement).toBe(farmgate);
  // The user drops the sheet to peek, then the old fix arrives.
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(sheet()).toContain("peek");
  await act(async () => {
    successes[0]?.(fakePosition(23.87, 90.367, 20));
    await Promise.resolve();
  });
  await flush();
  expect(resultHeadings()).toEqual(["Farmgate"]);
  expect(mapDesc()).toContain("Highlighted: Farmgate.");
  expect(mapDesc()).not.toContain("Your position is shown.");
  expect(document.querySelectorAll(".result")).toHaveLength(0);
  expect(sheet()).toContain("peek");
  expect(document.activeElement).not.toBe(
    screen.queryByRole("heading", { level: 2, name: "Uttara North" }),
  );
});

test("METRO-113 a station pick clears a stale notice on the screen", async () => {
  geolocation(25_000);
  render(<Harness />);
  fireEvent.click(locate());
  await screen.findByRole("group", { name: /found your position only roughly/u });
  pick("farm");
  await flush();
  // The location notice is gone (the small place-search notice is a different one: no key in tests).
  expect(document.querySelector(".notice:not([data-size])")).toBeNull();
  expect(resultHeadings()).toEqual(["Farmgate"]);
});

test("METRO-113 unmounting the screen during a locating leaves the shell alone when the fix arrives", async () => {
  const successes: PositionCallback[] = [];
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => {
        successes.push(success);
      },
    },
  });
  const view = render(<Harness initialSnap="peek" />);
  fireEvent.click(locate());
  view.rerender(<Harness initialSnap="peek" mounted={false} />);
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    successes[0]?.(fakePosition(23.87, 90.367, 20));
    await Promise.resolve();
  });
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
  expect(sheet()).toContain("half");
  expect(screen.queryByRole("heading", { level: 2, name: "Uttara North" })).toBeNull();
});

test("METRO-114 focusing the place search opens the sheet to full, so the suggestion list has room", () => {
  render(<Harness maps={readyMaps} initialSnap="half" />);
  expect(sheet()).toContain("half height");
  act(() => screen.getByRole("textbox", { name: "stand-in search" }).focus());
  expect(sheet()).toContain("full height");
});
