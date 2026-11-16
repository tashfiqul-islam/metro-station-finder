import { baselineDataset } from "@metro/core";
import type { Station } from "@metro/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { MapsContext } from "../../adapters/maps/context";
import type { MapsState, PlaceSearchService, PlaceSuggestion } from "../../adapters/maps/context";
import { copy } from "../nearest-station/copy";
import { DEBOUNCE_MS } from "./model";
import { PlaceSearch, SEARCH_INPUT_ID } from "./PlaceSearch";

const stations = baselineDataset.stations;

function noop(): void {}

/** A promise the test settles when it says so. */
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

const PLACE_A: PlaceSuggestion = {
  id: "g1",
  name: "Sample Place A",
  detail: "Dhaka",
  range: [0, 3],
};
const PLACE_B: PlaceSuggestion = { id: "g2", name: "Sample Place B", detail: "", range: null };

function fakeService(places: readonly PlaceSuggestion[] = [PLACE_A, PLACE_B]) {
  return {
    suggest: vi.fn<PlaceSearchService["suggest"]>(() => Promise.resolve(places)),
    choose: vi.fn<PlaceSearchService["choose"]>(() => Promise.resolve({ lat: 23.8, lng: 90.4 })),
    abandon: vi.fn<PlaceSearchService["abandon"]>(),
  };
}

interface Setup {
  service?: ReturnType<typeof fakeService> | null;
  status?: MapsState["status"];
}

const callbacks = {
  onStation: vi.fn<(station: Station, source: "keyboard" | "pointer") => void>(),
  onPlace: vi.fn(),
  onPlaceFailure: vi.fn(),
  onLocate: vi.fn(),
  onEngage: vi.fn(),
  load: vi.fn(),
};

function tree(state: MapsState): ReactNode {
  return (
    <MapsContext value={state}>
      <PlaceSearch
        stations={stations}
        onStation={callbacks.onStation}
        onPlace={callbacks.onPlace}
        onPlaceFailure={callbacks.onPlaceFailure}
        onLocate={callbacks.onLocate}
        onEngage={callbacks.onEngage}
      />
    </MapsContext>
  );
}

function stateOf({ service = fakeService(), status = "ready" }: Setup): MapsState {
  return { status, routes: null, places: service, load: callbacks.load };
}

function setup(options: Setup = {}) {
  const view = render(tree(stateOf(options)));
  return {
    ...view,
    update: (next: Setup) => view.rerender(tree(stateOf(next))),
  };
}

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  vi.useFakeTimers();
  for (const fn of Object.values(callbacks)) fn.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

function must<T>(node: T | null | undefined): T {
  if (node === null || node === undefined) throw new Error("element missing");
  return node;
}
const box = (): HTMLInputElement =>
  screen.getByRole<HTMLInputElement>("combobox", { name: "Search a place or station" });
const listbox = (): HTMLElement => must(document.querySelector<HTMLElement>("[role=listbox]"));
const options = (): HTMLElement[] => within(listbox()).queryAllByRole("option", { hidden: true });
const names = (): string[] =>
  options().map((option) => option.querySelector(".option__name")?.textContent ?? "");
const feedback = (): HTMLElement =>
  must(document.querySelector<HTMLElement>(".search__feedback output, .empty output"));
const active = (): string | null => box().getAttribute("aria-activedescendant");
const activeName = (): string =>
  document.getElementById(active() ?? "")?.querySelector(".option__name")?.textContent ?? "";
const type = (text: string): void => {
  fireEvent.change(box(), { target: { value: text } });
};
const key = (name: string): void => {
  fireEvent.keyDown(box(), { key: name });
};
function send(target: EventTarget, event: Event): boolean {
  let result = true;
  act(() => {
    result = target.dispatchEvent(event);
  });
  return result;
}
/** Dispatches a keydown at `target` inside act and returns it, so a test can read `defaultPrevented`. */
function keydownOn(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** Lets the debounce pass and the answer arrive. */
async function pause(ms = 180): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
/** Types text the Places rules ask for and waits for the answer. */
async function typeAndWait(text: string): Promise<void> {
  type(text);
  await pause();
}

test("METRO-163 the combobox has its role, hidden label, placeholder and a closed popup at rest", () => {
  setup();
  expect(box().getAttribute("aria-autocomplete")).toBe("list");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().getAttribute("aria-controls")).toBe(listbox().id);
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  expect(box().getAttribute("autocomplete")).toBe("off");
  expect(box().id).toBe(SEARCH_INPUT_ID);
  expect(box().placeholder).toBe("Search a place or station");
  const label = must(document.querySelector<HTMLLabelElement>(`label[for="${SEARCH_INPUT_ID}"]`));
  expect(label.textContent).toBe("Search a place or station");
  expect(label.className).toBe("visually-hidden");
  expect(listbox().hidden).toBe(true);
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Use my location" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
});

test("METRO-163 typing opens the list, marks the match, makes the first station active and opens the sheet", () => {
  setup();
  type("mir");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(listbox().hidden).toBe(false);
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10"]);
  const first = must(options()[0]);
  expect(first.querySelector(".option__match")?.textContent).toBe("Mir");
  expect(first.getAttribute("aria-selected")).toBe("true");
  expect(options()[1]?.getAttribute("aria-selected")).toBe("false");
  expect(active()).toBe(first.id);
  expect(first.textContent).toContain("Stop 5 of 16");
  expect(callbacks.onEngage).toHaveBeenCalledWith();
});

test("METRO-163 an alias match lists the station without marking a part of its name", () => {
  setup();
  type("agaragaon");
  expect(names()).toEqual(["Agargaon"]);
  expect(document.querySelector(".option__match")).toBeNull();
});

test("METRO-163 stations are listed up to five, keyed by station id", () => {
  setup();
  type("a");
  expect(options()).toHaveLength(5);
  expect(options().every((option) => option.id.includes("station-"))).toBe(true);
});

test("METRO-163 Stations come first, then Places, and the Places group ends with the attribution row", async () => {
  setup();
  await typeAndWait("mirp");
  expect(callbacks.load).toHaveBeenCalledWith();
  const groups = within(listbox()).getAllByRole("group");
  expect(groups.map((group) => group.getAttribute("aria-labelledby"))).toHaveLength(2);
  expect(within(must(groups[0])).getByText("Stations")).toBeTruthy();
  expect(within(must(groups[1])).getByText("Places")).toBeTruthy();
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10", "Sample Place A", "Sample Place B"]);
  const place = must(options()[2]);
  expect(place.textContent).toContain("Dhaka");
  expect(place.querySelector(".option__match")?.textContent).toBe("Sam");
  expect(options()[3]?.querySelector(".option__sub")).toBeNull();
  const attribution = must(screen.getByText("Google Maps"));
  expect(attribution.className).toBe("search__attr");
  expect(attribution.getAttribute("translate")).toBe("no");
  expect(attribution.getAttribute("role")).toBeNull();
  expect(attribution.hasAttribute("tabindex")).toBe(false);
  expect(attribution.closest("[role=option]")).toBeNull();
  expect(groups[1]?.lastElementChild).toBe(attribution);
});

test("METRO-163 the arrows move across both groups, skip the attribution row and wrap", async () => {
  setup();
  await typeAndWait("mirp");
  expect(activeName()).toBe("Mirpur 11");
  const seen: string[] = [];
  for (let step = 0; step < 4; step += 1) {
    key("ArrowDown");
    seen.push(activeName());
  }
  expect(seen).toEqual(["Mirpur 10", "Sample Place A", "Sample Place B", "Mirpur 11"]);
  key("ArrowUp");
  expect(activeName()).toBe("Sample Place B");
  key("ArrowUp");
  expect(activeName()).toBe("Sample Place A");
});

test("METRO-163 a place is never active until the rider moves to it: Enter with only places does nothing", async () => {
  setup();
  await typeAndWait("sample");
  expect(names()).toEqual(["Sample Place A", "Sample Place B"]);
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(callbacks.onStation).not.toHaveBeenCalled();
  expect(callbacks.onPlace).not.toHaveBeenCalled();
});

test("METRO-163 ArrowDown on a closed list opens it on the first row, ArrowUp on the last; no rows, no change", () => {
  setup();
  type("mir");
  key("Escape");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  callbacks.onEngage.mockClear();
  key("ArrowDown");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(activeName()).toBe("Mirpur 11");
  expect(callbacks.onEngage).toHaveBeenCalledTimes(1);
  key("Escape");
  key("ArrowUp");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(activeName()).toBe("Mirpur 10");
  type("zzz");
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-163 ArrowUp from the first row goes to the last", () => {
  setup();
  type("mir");
  key("ArrowUp");
  expect(activeName()).toBe("Mirpur 10");
  key("ArrowUp");
  expect(activeName()).toBe("Mirpur 11");
});

test("METRO-163 empty text lists nothing: the arrows do nothing", () => {
  setup();
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-163 Home, End and the side arrows keep the caret and release the active option", () => {
  setup();
  type("mir");
  for (const name of ["Home", "End", "ArrowLeft", "ArrowRight"]) {
    key("ArrowDown");
    expect(active()).not.toBeNull();
    const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
    expect(send(box(), event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(box().hasAttribute("aria-activedescendant")).toBe(false);
    expect(box().getAttribute("aria-expanded")).toBe("true");
  }
});

test("METRO-163 Enter on a station picks it: the text is its name, the list closes, the session ends", () => {
  const service = fakeService();
  setup({ service });
  type("karwan");
  service.abandon.mockClear();
  key("Enter");
  expect(callbacks.onStation).toHaveBeenCalledTimes(1);
  expect(callbacks.onStation.mock.calls[0]?.[0].id).toBe("karwan-bazar");
  expect(callbacks.onStation.mock.calls[0]?.[1]).toBe("keyboard");
  expect(box().value).toBe("Karwan Bazar");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(service.abandon).toHaveBeenCalledWith();
});

test("METRO-163 Enter on a place fetches its location once and reports it; the text is the place name", async () => {
  const service = fakeService();
  setup({ service });
  await typeAndWait("sample");
  key("ArrowDown");
  expect(activeName()).toBe("Sample Place A");
  key("Enter");
  expect(service.choose).toHaveBeenCalledExactlyOnceWith(PLACE_A);
  expect(box().value).toBe("Sample Place A");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  await pause(0);
  expect(callbacks.onPlace).toHaveBeenCalledExactlyOnceWith({ lat: 23.8, lng: 90.4 });
  // The text came from the pick, not from typing: it asks Places for nothing.
  await pause(1000);
  expect(service.suggest).toHaveBeenCalledTimes(1);
});

test("METRO-163 a place whose location cannot be fetched is reported without a cause", async () => {
  const service = fakeService();
  service.choose.mockRejectedValueOnce(new Error("secret lat=23.8"));
  setup({ service });
  await typeAndWait("sample");
  key("ArrowDown");
  key("Enter");
  await pause(0);
  expect(callbacks.onPlaceFailure).toHaveBeenCalledTimes(1);
  expect(callbacks.onPlace).not.toHaveBeenCalled();
});

test("METRO-163 a place answering after a later choice is dropped", async () => {
  const service = fakeService();
  const answer = deferred<{ lat: number; lng: number }>();
  service.choose.mockReturnValueOnce(answer.promise);
  setup({ service });
  await typeAndWait("sample");
  key("ArrowDown");
  key("Enter");
  type("farm");
  key("Enter");
  await act(async () => {
    answer.resolve({ lat: 1, lng: 2 });
    await Promise.resolve();
  });
  expect(callbacks.onPlace).not.toHaveBeenCalled();
  expect(callbacks.onStation).toHaveBeenCalledTimes(1);
});

test("METRO-163 a late failure after a later choice is dropped too", async () => {
  const service = fakeService();
  const answer = deferred<{ lat: number; lng: number }>();
  service.choose.mockReturnValueOnce(answer.promise);
  setup({ service });
  await typeAndWait("sample");
  key("ArrowDown");
  key("Enter");
  type("farm");
  await act(async () => {
    answer.reject(new Error("late"));
    await Promise.resolve();
  });
  expect(callbacks.onPlaceFailure).not.toHaveBeenCalled();
});

test("METRO-163 a suggestion with no service to choose it fails visibly, not silently", async () => {
  const service = fakeService();
  const view = setup({ service });
  await typeAndWait("sample");
  key("ArrowDown");
  view.update({ service: null });
  key("Enter");
  expect(callbacks.onPlaceFailure).toHaveBeenCalledTimes(1);
});

test("METRO-163 Enter with no active option does nothing", () => {
  setup();
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  expect(callbacks.onStation).not.toHaveBeenCalled();
});

test("METRO-163 Escape closes the list first, then clears the text, then does nothing", () => {
  const service = fakeService();
  setup({ service });
  type("mir");
  const first = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  expect(send(box(), first)).toBe(false);
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  expect(box().value).toBe("mir");
  service.abandon.mockClear();
  key("Escape");
  expect(box().value).toBe("");
  expect(service.abandon).toHaveBeenCalledTimes(1);
  const last = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  expect(send(box(), last)).toBe(true);
  expect(last.defaultPrevented).toBe(false);
});

test("METRO-163 other keys are left alone", () => {
  setup();
  type("mir");
  const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(box().getAttribute("aria-expanded")).toBe("true");
});

test("METRO-163 a click on an option chooses it as a pointer pick; a virtual click counts as the keyboard", () => {
  setup();
  type("mir");
  const second = must(options()[1]);
  const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  expect(send(listbox(), press)).toBe(false);
  fireEvent.click(second, { detail: 1 });
  expect(callbacks.onStation.mock.calls[0]?.[0].id).toBe("mirpur-10");
  expect(callbacks.onStation.mock.calls[0]?.[1]).toBe("pointer");
  expect(box().value).toBe("Mirpur 10");
  type("mir");
  fireEvent.click(must(options()[0]), { detail: 0 });
  expect(callbacks.onStation.mock.calls[1]?.[1]).toBe("keyboard");
});

test("METRO-163 the clear button empties the text, ends the session, closes the list and returns focus", () => {
  const service = fakeService();
  setup({ service });
  type("mir");
  service.abandon.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(box().value).toBe("");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(box());
  expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  expect(service.abandon).toHaveBeenCalledTimes(1);
});

test("METRO-163 emptying the text by hand ends the session", () => {
  const service = fakeService();
  setup({ service });
  type("mir");
  service.abandon.mockClear();
  type("");
  expect(service.abandon).toHaveBeenCalledTimes(1);
  // Already not asking: blank text ends nothing more.
  type("   ");
  expect(service.abandon).toHaveBeenCalledTimes(1);
});

test("METRO-163 the locate button in the field does what Use my location does, and ends the session", () => {
  const service = fakeService();
  setup({ service });
  type("mir");
  service.abandon.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(callbacks.onLocate).toHaveBeenCalledTimes(1);
  expect(service.abandon).toHaveBeenCalledTimes(1);
});

test("METRO-163 the filled mark follows the text", () => {
  setup();
  const field = must(document.querySelector(".search"));
  expect(field.hasAttribute("data-filled")).toBe(false);
  type("m");
  expect(field.hasAttribute("data-filled")).toBe(true);
});

test("METRO-163 leaving the input closes the list", () => {
  setup();
  type("mir");
  fireEvent.blur(box());
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
});

/** A blur that arrives with a pointer press in progress (the press that blurs the input at its mousedown). */
function pressOutsideThenBlur(): void {
  fireEvent.pointerDown(document.body);
  fireEvent.blur(box());
}

test("METRO-124 a press that blurs the input keeps the list until the press ends, so the control under it does not move", () => {
  setup();
  type("mir");
  pressOutsideThenBlur();
  expect(box().getAttribute("aria-expanded")).toBe("true");
  fireEvent.mouseUp(document.body);
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  type("mir");
  fireEvent.blur(box());
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-124 a cancelled press or a key ends the wait and closes the list", () => {
  setup();
  type("mir");
  pressOutsideThenBlur();
  fireEvent.pointerCancel(document.body);
  expect(box().getAttribute("aria-expanded")).toBe("false");
  type("mir");
  pressOutsideThenBlur();
  fireEvent.keyDown(document.body, { key: "Tab" });
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-124 a modifier key held during the press does not end it; Tab does", () => {
  setup();
  type("mir");
  pressOutsideThenBlur();
  for (const modifier of ["Shift", "Control", "Alt", "Meta", "CapsLock"]) {
    fireEvent.keyDown(document.body, { key: modifier });
    expect(box().getAttribute("aria-expanded")).toBe("true");
  }
  fireEvent.keyDown(document.body, { key: "Tab" });
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-124 known and bounded: a press that never reports mouseup leaves the list open after another blur, until the next mouseup, key or cancel", () => {
  setup();
  type("mir");
  fireEvent.pointerDown(document.body);
  fireEvent.blur(box());
  fireEvent.blur(box());
  expect(box().getAttribute("aria-expanded")).toBe("true");
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-124 a press that ends without a blur, or after focus came back, leaves the list as it is", () => {
  setup();
  type("mir");
  fireEvent.pointerDown(box());
  fireEvent.mouseUp(box());
  expect(box().getAttribute("aria-expanded")).toBe("true");
  pressOutsideThenBlur();
  fireEvent.focus(box());
  fireEvent.mouseUp(document.body);
  expect(box().getAttribute("aria-expanded")).toBe("true");
});

test("METRO-163 no match: the empty state names it, Browse all stays after blur, and lists all 16 stations", async () => {
  setup({ service: fakeService([]) });
  await typeAndWait("Nowhere Town");
  const status = feedback();
  expect(status.textContent).toBe("No station matches that name.");
  expect(status.querySelector("button")).toBeNull();
  expect(box().getAttribute("aria-expanded")).toBe("false");
  fireEvent.blur(box());
  const browse = screen.getByRole("button", { name: "Browse all 16 stations" });
  expect(status.contains(browse)).toBe(false);
  expect(listbox().contains(browse)).toBe(false);
  callbacks.onEngage.mockClear();
  fireEvent.click(browse);
  expect(box().value).toBe("");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(options()).toHaveLength(16);
  expect(document.activeElement).toBe(box());
  expect(feedback().textContent).toBe("");
  expect(screen.queryByRole("button", { name: "Browse all 16 stations" })).toBeNull();
  expect(callbacks.onEngage).toHaveBeenCalledTimes(1);
  // Browsing lists stations only: no Places group and no attribution row.
  expect(screen.queryByText("Google Maps")).toBeNull();
});

test("METRO-163 browsing is left by typing, by a pick and by a clear", async () => {
  setup({ service: fakeService([]) });
  await typeAndWait("Nowhere Town");
  fireEvent.click(screen.getByRole("button", { name: "Browse all 16 stations" }));
  expect(options()).toHaveLength(16);
  type("mir");
  expect(options()).toHaveLength(2);
  await typeAndWait("Nowhere Town");
  fireEvent.click(screen.getByRole("button", { name: "Browse all 16 stations" }));
  key("Enter");
  expect(callbacks.onStation).toHaveBeenCalledTimes(1);
  expect(box().getAttribute("aria-expanded")).toBe("false");
  await typeAndWait("Nowhere Town");
  fireEvent.click(screen.getByRole("button", { name: "Browse all 16 stations" }));
  key("Escape");
  key("Escape");
  expect(options()).toHaveLength(0);
});

test("METRO-163 with no match the empty state waits for a Places answer that is on its way", async () => {
  setup();
  type("Nowhere Town");
  expect(screen.queryByRole("button", { name: "Browse all 16 stations" })).toBeNull();
  expect(feedback().textContent).toBe("0 stations");
  await pause();
  expect(names()).toEqual(["Sample Place A", "Sample Place B"]);
  expect(feedback().textContent).toBe("0 stations, 2 places");
});

test("METRO-163 with no match and no places the empty state shows once the answer is empty", async () => {
  setup({ service: fakeService([]) });
  type("Nowhere Town");
  await pause();
  expect(feedback().textContent).toBe("No station matches that name.");
  expect(screen.getByRole("button", { name: "Browse all 16 stations" })).toBeTruthy();
});

test("METRO-163 the one polite status announces the counts after each input, and nothing stale", async () => {
  setup({ service: fakeService([PLACE_A]) });
  const status = feedback();
  expect(status.textContent).toBe("");
  type("m");
  expect(feedback()).toBe(status);
  expect(status.textContent).toBe("4 stations");
  type("mir");
  expect(status.textContent).toBe("2 stations");
  await pause();
  expect(status.textContent).toBe("2 stations, 1 place");
  type("mirpur 11");
  expect(status.textContent).toBe("1 station");
  type("");
  expect(status.textContent).toBe("");
  type("   ");
  expect(status.textContent).toBe("");
  type("farm");
  key("Enter");
  expect(status.textContent).toBe("");
  expect(document.querySelectorAll("[role=alert], [aria-live]")).toHaveLength(0);
});

test("METRO-163 keys pressed while an input method is composing are not ours", () => {
  setup();
  type("mir");
  const before = active();
  for (const init of [
    { key: "Enter", isComposing: true },
    { key: "ArrowDown", isComposing: true },
    { key: "Escape", isComposing: true },
    { key: "Process" },
    { key: "Enter", keyCode: 229 },
  ]) {
    const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
    expect(send(box(), event)).toBe(true);
  }
  expect(callbacks.onStation).not.toHaveBeenCalled();
  expect(active()).toBe(before);
  expect(box().value).toBe("mir");
  key("Enter");
  expect(callbacks.onStation).toHaveBeenCalledTimes(1);
});

test("METRO-163 no request under three characters, and none for a whole station name", async () => {
  const service = fakeService();
  setup({ service });
  for (const text of ["m", "mi", "  mi  ", "Motijheel", "karwan bazar", "mirpur-11", "Farmagate"]) {
    type(text);
    await pause(1000);
  }
  expect(service.suggest).not.toHaveBeenCalled();
  expect(callbacks.load).not.toHaveBeenCalled();
});

test("METRO-163 three characters ask once, after 180 ms of no typing, with the latest text", async () => {
  const service = fakeService();
  setup({ service });
  type("sam");
  await pause(179);
  expect(service.suggest).not.toHaveBeenCalled();
  type("samp");
  await pause(179);
  type("sampl");
  await pause(179);
  expect(service.suggest).not.toHaveBeenCalled();
  await pause(1);
  expect(service.suggest).toHaveBeenCalledExactlyOnceWith("sampl");
  expect(callbacks.load).toHaveBeenCalledWith();
  // Nothing more happens by itself.
  await pause(5000);
  expect(service.suggest).toHaveBeenCalledTimes(1);
});

test("METRO-163 a request is asked for again when the text changes, in the same session", async () => {
  const service = fakeService();
  setup({ service });
  await typeAndWait("sam");
  await typeAndWait("sampl");
  expect(service.suggest.mock.calls.map((call) => call[0])).toEqual(["sam", "sampl"]);
  expect(service.abandon).not.toHaveBeenCalled();
});

test("METRO-163 suggestions for older text are never shown when a newer text is waiting", async () => {
  const service = fakeService();
  const answer = deferred<readonly PlaceSuggestion[]>();
  service.suggest.mockReturnValueOnce(answer.promise);
  setup({ service });
  await typeAndWait("sam");
  type("mirp");
  await act(async () => {
    answer.resolve([PLACE_A]);
    await Promise.resolve();
  });
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10"]);
  expect(screen.queryByText("Google Maps")).toBeNull();
});

test("METRO-163 an answer that arrives after the text changed again is ignored, a failure too", async () => {
  const service = fakeService();
  const answer = deferred<readonly PlaceSuggestion[]>();
  service.suggest.mockReturnValueOnce(answer.promise);
  setup({ service });
  await typeAndWait("sam");
  type("m");
  await act(async () => {
    answer.reject(new Error("late"));
    await Promise.resolve();
  });
  expect(screen.queryByText(copy.searchUnavailable)).toBeNull();
});

test("METRO-163 while the libraries load the rider waits with the stations; the request follows the service", async () => {
  const view = setup({ service: null, status: "loading" });
  type("mirp");
  await pause(1000);
  expect(callbacks.load).toHaveBeenCalledWith();
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10"]);
  const service = fakeService();
  view.update({ service });
  await pause();
  expect(service.suggest).toHaveBeenCalledExactlyOnceWith("mirp");
  expect(names()).toContain("Sample Place A");
});

test("METRO-163 a failed request replaces the Places group with the notice, with no attribution row", async () => {
  const service = fakeService();
  service.suggest.mockRejectedValueOnce(new Error("secret key=abc"));
  setup({ service });
  await typeAndWait("mirp");
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10"]);
  const group = must(
    within(listbox())
      .getAllByRole("group")
      .find((item) => item.textContent?.includes("Places")),
  );
  expect(group.textContent).toContain(copy.searchUnavailable);
  expect(screen.queryByText("Google Maps")).toBeNull();
  // The words are in the list only; the status region keeps them for screen readers, visually hidden.
  const region = must(document.querySelector<HTMLElement>("output.visually-hidden"));
  expect(region.textContent).not.toContain("secret");
  // Typing again asks again.
  await typeAndWait("mirpu");
  expect(service.suggest).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Google Maps")).toBeTruthy();
});

test("METRO-163 Maps unavailable: station search works, nothing is asked, the notice is shown under the field", async () => {
  const service = fakeService();
  setup({ service, status: "unavailable" });
  const notice = must(document.querySelector<HTMLElement>("output .notice"));
  expect(notice.textContent).toBe(copy.searchUnavailable);
  expect(notice.closest("output")?.className).toBe("");
  type("mirp");
  await pause(1000);
  expect(service.suggest).not.toHaveBeenCalled();
  expect(callbacks.load).not.toHaveBeenCalled();
  // The notice takes the Places group's place in the open list; the status region keeps it for screen readers.
  expect(names()).toEqual(["Mirpur 11", "Mirpur 10"]);
  expect(within(listbox()).getByText(copy.searchUnavailable)).toBeTruthy();
  expect(notice.closest("output")?.className).toBe("visually-hidden");
  expect(screen.queryByText("Google Maps")).toBeNull();
  // Station choosing still works.
  key("Enter");
  expect(callbacks.onStation).toHaveBeenCalledTimes(1);
});

test("METRO-163 under three characters nothing says places are unavailable inside the list", () => {
  setup({ status: "unavailable" });
  type("mi");
  expect(within(listbox()).queryByText(copy.searchUnavailable)).toBeNull();
});

test("METRO-163 offline: the offline notice stands, and it is the connection's words", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const service = fakeService();
  setup({ service });
  expect(screen.getByText(copy.searchNoConnection)).toBeTruthy();
  type("mirp");
  expect(service.suggest).not.toHaveBeenCalled();
  expect(within(listbox()).getByText(copy.searchUnavailable)).toBeTruthy();
});

test("METRO-163 online and available: the status region is empty and takes no room", () => {
  setup();
  const region = must(document.querySelector<HTMLElement>("output.visually-hidden"));
  expect(region.textContent).toBe("");
});

test('METRO-163 "/" focuses the field from outside a text field, and leaves a text field alone', () => {
  render(
    <>
      <button type="button">elsewhere</button>
      <input aria-label="other field" />
      <textarea aria-label="notes" />
      <select aria-label="pick">
        <option>a</option>
      </select>
    </>,
  );
  setup();
  const slash = { key: "/" };
  const button = screen.getByRole("button", { name: "elsewhere" });
  const prevented = keydownOn(button, slash);
  expect(prevented.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(box());
  for (const label of ["other field", "notes", "pick"]) {
    const field = screen.getByLabelText(label);
    act(() => field.focus());
    const event = keydownOn(field, slash);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(field);
  }
  // From the page itself, and from the document (not an element at all).
  act(() => document.body.focus());
  expect(keydownOn(document.body, slash).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(box());
  act(() => box().blur());
  expect(keydownOn(document, slash).defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(box());
});

test('METRO-163 "/" with a modifier, another key or an editable target does not steal focus', () => {
  setup();
  const outside = document.createElement("div");
  document.body.append(outside);
  const editable = document.createElement("div");
  Object.defineProperty(editable, "isContentEditable", { value: true });
  document.body.append(editable);
  expect(keydownOn(outside, { key: "/", ctrlKey: true }).defaultPrevented).toBe(false);
  expect(keydownOn(outside, { key: "/", metaKey: true }).defaultPrevented).toBe(false);
  expect(keydownOn(outside, { key: "/", altKey: true }).defaultPrevented).toBe(false);
  expect(keydownOn(outside, { key: "a" }).defaultPrevented).toBe(false);
  expect(keydownOn(editable, { key: "/" }).defaultPrevented).toBe(false);
  // A handler that already took the key keeps it.
  outside.addEventListener("keydown", (event) => event.preventDefault());
  expect(keydownOn(outside, { key: "/" }).defaultPrevented).toBe(true);
  expect(document.activeElement).not.toBe(box());
  outside.remove();
  editable.remove();
});

test("METRO-163 the shortcut listener goes with the field", () => {
  const view = setup();
  view.unmount();
  const event = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
  act(() => {
    document.body.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(false);
});

test("METRO-163 a browser without scrollIntoView still moves the active option and opens the list", () => {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  try {
    setup();
    type("mir");
    key("ArrowDown");
    expect(activeName()).toBe("Mirpur 10");
    expect(box().getAttribute("aria-expanded")).toBe("true");
  } finally {
    if (original !== undefined)
      Object.defineProperty(Element.prototype, "scrollIntoView", original);
  }
});

test("METRO-163 opening the list scrolls the field with its list into view, and the active option into the list", () => {
  const scrolled: string[] = [];
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function scroll(
    this: Element,
    arg?: boolean | ScrollIntoViewOptions,
  ) {
    scrolled.push(`${this.className}|${this.id}:${JSON.stringify(arg)}`);
  });
  setup();
  type("mir");
  expect(scrolled.some((entry) => entry.startsWith("search-block|"))).toBe(true);
  expect(scrolled.some((entry) => entry.includes("station-mirpur-11"))).toBe(true);
  expect(scrolled.every((entry) => entry.endsWith('{"block":"nearest"}'))).toBe(true);
});

test("METRO-163 StrictMode runs the effects twice and still asks once per text", async () => {
  const service = fakeService();
  render(<StrictMode>{tree(stateOf({ service }))}</StrictMode>);
  await typeAndWait("sampl");
  expect(service.suggest).toHaveBeenCalledTimes(1);
});

test("METRO-163 the field uses no network, no inline style and no style attribute", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  setup();
  await typeAndWait("mirp");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(document.querySelector("style, [style]")).toBeNull();
  vi.unstubAllGlobals();
});

test("METRO-163 the debounce is 180 ms (the constant the rule is written with)", () => {
  expect(DEBOUNCE_MS).toBe(180);
});

test("METRO-163 a query that drops under three characters, or becomes a whole station name, ends the session", async () => {
  const service = fakeService();
  setup({ service });
  await typeAndWait("karwan");
  service.abandon.mockClear();
  type("ka");
  expect(service.abandon).toHaveBeenCalledTimes(1);
  await typeAndWait("karwan");
  service.abandon.mockClear();
  type("Karwan Bazar");
  expect(service.abandon).toHaveBeenCalledTimes(1);
  await typeAndWait("karwan");
  service.abandon.mockClear();
  type("---");
  expect(service.abandon).toHaveBeenCalledTimes(1);
});

test("METRO-163 a blur does not end the session: the click that chooses an option comes after it", async () => {
  const service = fakeService();
  setup({ service });
  await typeAndWait("sample");
  service.abandon.mockClear();
  fireEvent.blur(box());
  expect(service.abandon).not.toHaveBeenCalled();
});

test("METRO-163 the session ends when the field goes", async () => {
  const service = fakeService();
  const view = setup({ service });
  await typeAndWait("sample");
  service.abandon.mockClear();
  view.unmount();
  expect(service.abandon).toHaveBeenCalledWith();
});

test("METRO-163 a failed request with no station to list still shows the warning, under the field", async () => {
  const service = fakeService();
  service.suggest.mockRejectedValueOnce(new Error("secret key=abc"));
  setup({ service });
  await typeAndWait("Nowhere Town");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  const region = must(document.querySelector<HTMLElement>("output .notice"));
  expect(region.textContent).toBe(copy.searchUnavailable);
  expect(region.closest("output")?.className).toBe("");
  expect(document.querySelector(".empty")?.textContent).toContain("No station matches that name.");
  expect(document.body.textContent).not.toContain("secret");
  // The next text asks again and the warning goes.
  await typeAndWait("Nowhere Tow");
  expect(service.suggest).toHaveBeenCalledTimes(2);
  expect(document.querySelector("output .notice")).toBeNull();
});
