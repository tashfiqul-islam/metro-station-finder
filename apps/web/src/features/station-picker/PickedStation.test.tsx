import { baselineDataset } from "@metro/core";
import type { Station } from "@metro/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { AppShell } from "../../shell/AppShell";
import { PickedStation } from "./PickedStation";

const stations = baselineDataset.stations;
const named = (name: string): Station => {
  const found = stations.find((station) => station.name === name);
  if (found === undefined) throw new Error(`no station ${name}`);
  return found;
};

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  vi.stubGlobal("innerHeight", 844);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

interface Shown {
  readonly station: Station | null;
  readonly picks: number;
  readonly source?: "keyboard" | "pointer";
}

function view(onShowOnMap: () => void, shown: Shown) {
  return (
    <AppShell>
      <PickedStation
        station={shown.station}
        picks={shown.picks}
        source={shown.source ?? "keyboard"}
        onShowOnMap={onShowOnMap}
      />
    </AppShell>
  );
}

function setup(shown: Shown) {
  const onShowOnMap = vi.fn();
  const result = render(view(onShowOnMap, shown));
  return { onShowOnMap, show: (next: Shown) => result.rerender(view(onShowOnMap, next)) };
}

const grip = (): HTMLElement => screen.getByRole("button", { name: /^Resize panel\./u });
/** What a screen reader speaks: the text outside aria-hidden subtrees. */
function spoken(node: Node): string {
  if (node instanceof Element && node.getAttribute("aria-hidden") === "true") return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return [...node.childNodes].map(spoken).join("");
}

test("METRO-112 no station shows nothing", () => {
  setup({ station: null, picks: 0 });
  expect(screen.queryByRole("article")).toBeNull();
});

test("METRO-112 the result shows the station, the fare range, the footnote from the dataset provenance and the Directions link", () => {
  setup({ station: named("Karwan Bazar"), picks: 1 });
  const heading = screen.getByRole("heading", { level: 2, name: "Karwan Bazar" });
  expect(heading.getAttribute("tabindex")).toBe("-1");
  expect(document.activeElement).toBe(heading);
  const result = screen.getByRole("article");
  expect(result.getAttribute("aria-labelledby")).toBe(heading.id);
  expect(within(result).getByText("Stop 12 of 16")).toBeTruthy();
  expect(within(result).getByText("Single fare from here")).toBeTruthy();
  expect(spoken(result).replaceAll(/\s+/gu, " ")).toContain("20 taka to 80 taka");
  expect(result.textContent).toContain("৳20");
  expect(result.textContent).toContain("৳80");
  expect(
    within(result).getByText(
      "Fares as of: DTCA notice dated 8 September 2022; last checked 5 November 2026.",
    ),
  ).toBeTruthy();
  const link = screen.getByRole("link", { name: /^Directions in Google Maps/u });
  expect(link.textContent).toContain("(opens in a new tab)");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.getAttribute("href")).toBe(
    "https://www.google.com/maps/dir/?api=1&destination=23.751353,90.392977",
  );
});

test("METRO-112 a picked station's result says nothing about a distance, a walk or the nearest station, and shows no pass price", () => {
  setup({ station: named("Karwan Bazar"), picks: 1 });
  const text = screen.getByRole("article").parentElement?.textContent ?? "";
  for (const word of [
    /\bkm\b/iu,
    /\bmin\b/iu,
    /\bm\b/u,
    /walk/iu,
    /nearest/iu,
    /distance/iu,
    /also nearby/iu,
    /pass/iu,
    /concession/iu,
    /sample data/iu,
  ]) {
    expect(text).not.toMatch(word);
  }
  expect(document.querySelector(".mock-only, .tag--sample")).toBeNull();
});

test("METRO-112 the terminus stations show their own range", () => {
  setup({ station: named("Motijheel"), picks: 1 });
  expect(spoken(screen.getByRole("article")).replaceAll(/\s+/gu, " ")).toContain(
    "20 taka to 100 taka",
  );
});

test("METRO-112 Show on map drops the sheet to peek and tells the screen", () => {
  const { onShowOnMap } = setup({ station: named("Farmgate"), picks: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(onShowOnMap).toHaveBeenCalledTimes(1);
  expect(grip().getAttribute("aria-label")).toContain("Now peek height");
});

test("METRO-112 picking the same station again moves focus back to the heading", () => {
  const { show } = setup({ station: named("Farmgate"), picks: 1 });
  const heading = screen.getByRole("heading", { level: 2, name: "Farmgate" });
  grip().focus();
  expect(document.activeElement).toBe(grip());
  show({ station: named("Farmgate"), picks: 2 });
  expect(document.activeElement).toBe(heading);
});

test("METRO-112 a new pick replaces the result", () => {
  const { show } = setup({ station: named("Farmgate"), picks: 1 });
  show({ station: named("Shahbag"), picks: 2 });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 2, name: "Shahbag" })).toBeTruthy();
});

test("METRO-112 no pick yet moves no focus, and a result hidden by a location result keeps no focus claim", () => {
  const { show } = setup({ station: null, picks: 0 });
  expect(document.activeElement).toBe(document.body);
  show({ station: null, picks: 1 });
  expect(screen.queryByRole("article")).toBeNull();
});

// METRO-118: a click on an option keeps focus in the field (still `:focus-visible`), so the heading is focused
// with a request for no ring; Enter asks for the ring.
test("METRO-118 focuses the heading with a ring after Enter and without one after a click on an option", () => {
  const focus = vi.spyOn(HTMLElement.prototype, "focus");
  const lastCall = (target: HTMLElement): FocusOptions | undefined => {
    let found: FocusOptions | undefined;
    for (const [index, self] of focus.mock.contexts.entries()) {
      if (self === target) found = focus.mock.calls[index]?.[0];
    }
    return found;
  };
  const { show } = setup({ station: named("Motijheel"), picks: 1, source: "keyboard" });
  expect(lastCall(screen.getByRole("heading", { level: 2, name: "Motijheel" }))).toEqual({
    focusVisible: true,
  });
  show({ station: named("Uttara North"), picks: 2, source: "pointer" });
  expect(lastCall(screen.getByRole("heading", { level: 2, name: "Uttara North" }))).toEqual({
    focusVisible: false,
  });
});
