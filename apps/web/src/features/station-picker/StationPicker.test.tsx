import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { AppShell } from "../../shell/AppShell";
import { StationPicker } from "./StationPicker";

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

function setup() {
  const onPick = vi.fn();
  const onShowOnMap = vi.fn();
  const view = render(
    <AppShell>
      <StationPicker onPick={onPick} onShowOnMap={onShowOnMap} />
    </AppShell>,
  );
  return { onPick, onShowOnMap, ...view };
}

const box = (): HTMLInputElement =>
  screen.getByRole<HTMLInputElement>("combobox", { name: "Or pick a station" });
function must(node: HTMLElement | null | undefined): HTMLElement {
  if (node === null || node === undefined) throw new Error("element missing");
  return node;
}
const listbox = (): HTMLElement => must(document.querySelector<HTMLElement>("[role=listbox]"));
const pickStatus = (): HTMLElement =>
  must(document.querySelector<HTMLElement>(".pick__combo output"));
/** Dispatches a raw event inside act and returns whether it was left alone (not default-prevented). */
function send(target: Element, event: Event): boolean {
  let result = true;
  act(() => {
    result = target.dispatchEvent(event);
  });
  return result;
}
/** What a screen reader speaks: the text outside aria-hidden subtrees. */
function spoken(node: Node): string {
  if (node instanceof Element && node.getAttribute("aria-hidden") === "true") return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return [...node.childNodes].map(spoken).join("");
}
const grip = (): HTMLElement => screen.getByRole("button", { name: /^Resize panel\./u });
const type = (text: string): void => {
  fireEvent.change(box(), { target: { value: text } });
};
const key = (name: string): void => {
  fireEvent.keyDown(box(), { key: name });
};
const options = (): HTMLElement[] => within(listbox()).queryAllByRole("option", { hidden: true });
const active = (): string | null => box().getAttribute("aria-activedescendant");
const activeName = (): string =>
  document.getElementById(active() ?? "")?.querySelector(".option__name")?.textContent ?? "";

test("METRO-112 the combobox has its role, name, description and a closed popup at rest", () => {
  setup();
  expect(box().getAttribute("aria-autocomplete")).toBe("list");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().getAttribute("aria-controls")).toBe(listbox().id);
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  expect(box().getAttribute("autocomplete")).toBe("off");
  expect(box().tabIndex).toBe(0);
  expect(box().getAttribute("aria-describedby")).toBeTruthy();
  expect(document.getElementById(box().getAttribute("aria-describedby") ?? "")?.textContent).toBe(
    "Search all 16 stations by name.",
  );
  expect(listbox().hidden).toBe(true);
  expect(listbox().getAttribute("aria-label")).toBe("Stations");
  expect(screen.queryByRole("button", { name: "Clear station search" })).toBeNull();
});

test("METRO-112 typing opens the popup, wraps the match, makes the first option active and opens the sheet to full", () => {
  setup();
  expect(grip().getAttribute("aria-label")).toContain("Now half height");
  type("mir");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(listbox().hidden).toBe(false);
  expect(options().map((option) => option.textContent)).toEqual([
    "05Mirpur 11Stop 5 of 16",
    "06Mirpur 10Stop 6 of 16",
  ]);
  expect(options()[0]?.querySelector(".option__match")?.textContent).toBe("Mir");
  expect(options()[0]?.getAttribute("aria-selected")).toBe("true");
  expect(options()[1]?.getAttribute("aria-selected")).toBe("false");
  expect(active()).toBe(options()[0]?.id);
  expect(grip().getAttribute("aria-label")).toContain("Now full height");
  expect(screen.getByRole("button", { name: "Clear station search" })).toBeTruthy();
});

test("METRO-112 ArrowDown and ArrowUp move the active option and wrap in both directions", () => {
  setup();
  type("mir");
  key("ArrowDown");
  expect(activeName()).toBe("Mirpur 10");
  key("ArrowDown");
  expect(activeName()).toBe("Mirpur 11");
  key("ArrowUp");
  expect(activeName()).toBe("Mirpur 10");
  key("ArrowUp");
  expect(activeName()).toBe("Mirpur 11");
  key("ArrowUp");
  expect(activeName()).toBe("Mirpur 10");
});

test("METRO-112 ArrowDown on a closed list opens it on the first option, ArrowUp on the last, and both open the sheet to full", () => {
  setup();
  key("ArrowDown");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(options()).toHaveLength(16);
  expect(activeName()).toBe("Uttara North");
  expect(grip().getAttribute("aria-label")).toContain("Now full height");
  key("Escape");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  key("ArrowUp");
  expect(activeName()).toBe("Motijheel");
});

test("METRO-112 the arrow keys do nothing when nothing matches", () => {
  setup();
  type("zzz");
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  expect(box().getAttribute("aria-expanded")).toBe("false");
});

test("METRO-112 Home and End keep the caret and release the active option", () => {
  setup();
  type("mir");
  expect(active()).not.toBeNull();
  const home = new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true });
  expect(send(box(), home)).toBe(true);
  expect(home.defaultPrevented).toBe(false);
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  expect(box().getAttribute("aria-expanded")).toBe("true");
  key("ArrowDown");
  expect(activeName()).toBe("Mirpur 11");
  const end = new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true });
  expect(send(box(), end)).toBe(true);
  expect(end.defaultPrevented).toBe(false);
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
});

test("METRO-112 Enter chooses the active option: the heading takes focus, the sheet settles at half and the pick is reported", () => {
  const { onPick } = setup();
  type("karwan");
  key("Enter");
  expect(onPick).toHaveBeenCalledWith("karwan-bazar");
  expect(box().value).toBe("Karwan Bazar");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(grip().getAttribute("aria-label")).toContain("Now half height");
  const heading = screen.getByRole("heading", { level: 2, name: "Karwan Bazar" });
  expect(heading.getAttribute("tabindex")).toBe("-1");
  expect(document.activeElement).toBe(heading);
  expect(screen.getByRole("article").getAttribute("aria-labelledby")).toBe(heading.id);
});

test("METRO-112 Enter with no active option does nothing", () => {
  const { onPick } = setup();
  const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  expect(onPick).not.toHaveBeenCalled();
  expect(screen.queryByRole("article")).toBeNull();
});

test("METRO-112 Escape closes the list first, then clears the text, then does nothing", () => {
  setup();
  type("mir");
  const first = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  expect(send(box(), first)).toBe(false);
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
  expect(box().value).toBe("mir");
  key("Escape");
  expect(box().value).toBe("");
  const last = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  expect(send(box(), last)).toBe(true);
  expect(last.defaultPrevented).toBe(false);
});

test("METRO-112 ArrowLeft and ArrowRight return visual focus to the text without closing the list", () => {
  setup();
  type("mir");
  for (const name of ["ArrowLeft", "ArrowRight"]) {
    key("ArrowDown");
    expect(active()).not.toBeNull();
    const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
    expect(send(box(), event)).toBe(true);
    expect(box().hasAttribute("aria-activedescendant")).toBe(false);
    expect(box().getAttribute("aria-expanded")).toBe("true");
  }
});

test("METRO-112 other keys are left alone", () => {
  setup();
  type("mir");
  const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
  expect(send(box(), event)).toBe(true);
  expect(box().getAttribute("aria-expanded")).toBe("true");
});

test("METRO-112 a click on an option chooses it and the press does not take focus from the input", () => {
  const { onPick } = setup();
  type("mir");
  const second = must(options()[1]);
  const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  expect(send(listbox(), press)).toBe(false);
  fireEvent.click(second);
  expect(onPick).toHaveBeenCalledWith("mirpur-10");
  expect(box().value).toBe("Mirpur 10");
});

test("METRO-112 the clear button empties the text, closes the list and returns focus to the input", () => {
  setup();
  type("mir");
  fireEvent.click(screen.getByRole("button", { name: "Clear station search" }));
  expect(box().value).toBe("");
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(box());
  expect(screen.queryByRole("button", { name: "Clear station search" })).toBeNull();
});

test("METRO-112 leaving the input closes the list", () => {
  setup();
  type("mir");
  fireEvent.blur(box());
  expect(box().getAttribute("aria-expanded")).toBe("false");
  expect(box().hasAttribute("aria-activedescendant")).toBe(false);
});

test("METRO-112 no match: the text is announced by the one status, Browse all stays after blur outside it, and lists the 16 stations", () => {
  setup();
  type("Sadarghat");
  const status = pickStatus();
  expect(status.textContent).toBe("No station matches that name.");
  expect(status.querySelector("button")).toBeNull();
  expect(box().getAttribute("aria-expanded")).toBe("false");
  fireEvent.blur(box());
  const browse = screen.getByRole("button", { name: "Browse all 16 stations" });
  // A control never lives in a live region, and the popup does not hold it either.
  expect(status.contains(browse)).toBe(false);
  expect(listbox().contains(browse)).toBe(false);
  fireEvent.click(browse);
  expect(box().value).toBe("");
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(options()).toHaveLength(16);
  expect(document.activeElement).toBe(box());
  expect(pickStatus().textContent).toBe("");
  expect(screen.queryByRole("button", { name: "Browse all 16 stations" })).toBeNull();
  expect(grip().getAttribute("aria-label")).toContain("Now full height");
});

test("METRO-112 the one polite status announces the count after each input, and nothing stale", () => {
  setup();
  // The same element throughout: a live region must exist before its text changes.
  const status = pickStatus();
  expect(status.textContent).toBe("");
  type("m");
  expect(pickStatus()).toBe(status);
  expect(status.textContent).toBe("4 stations");
  type("mir");
  expect(status.textContent).toBe("2 stations");
  type("mirpur 1");
  expect(status.textContent).toBe("2 stations");
  type("mirpur 11");
  expect(status.textContent).toBe("1 station");
  type("mirpur 111");
  expect(status.textContent).toBe("No station matches that name.");
  type("");
  expect(status.textContent).toBe("");
  type("   ");
  expect(status.textContent).toBe("");
  type("farm");
  key("Enter");
  expect(status.textContent).toBe("");
  expect(
    document.querySelectorAll("[role=status], [role=alert], [aria-live], output"),
  ).toHaveLength(2);
});

test("METRO-112 Escape and the clear button leave no stale count behind", () => {
  setup();
  type("mir");
  key("Escape");
  expect(pickStatus().textContent).toBe("2 stations");
  key("Escape");
  expect(box().value).toBe("");
  expect(pickStatus().textContent).toBe("");
  type("mir");
  fireEvent.click(screen.getByRole("button", { name: "Clear station search" }));
  expect(pickStatus().textContent).toBe("");
});

test("METRO-112 a blank text is not a no-match", () => {
  setup();
  type("   ");
  expect(pickStatus().textContent).toBe("");
});

test("METRO-112 keys pressed while an input method is composing are not ours: Enter does not pick, arrows do not move", () => {
  const { onPick } = setup();
  type("mir");
  const before = active();
  for (const init of [
    { key: "Enter", isComposing: true },
    { key: "ArrowDown", isComposing: true },
    { key: "ArrowUp", isComposing: true },
    { key: "Escape", isComposing: true },
    { key: "Process" },
    { key: "Enter", keyCode: 229 },
  ]) {
    const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
    expect(send(box(), event)).toBe(true);
  }
  expect(onPick).not.toHaveBeenCalled();
  expect(active()).toBe(before);
  expect(box().getAttribute("aria-expanded")).toBe("true");
  expect(box().value).toBe("mir");
  // The control: the same keys outside composition do act.
  key("Enter");
  expect(onPick).toHaveBeenCalledWith("mirpur-11");
});

test("METRO-112 the result shows the station, the fare range, the footnote from the dataset provenance and the Directions link", () => {
  setup();
  type("karwan");
  key("Enter");
  const result = screen.getByRole("article");
  expect(within(result).getByText("Stop 12 of 16")).toBeTruthy();
  expect(within(result).getByText("Single fare from here")).toBeTruthy();
  // Price helper: the sign is hidden from assistive technology, "taka" is spoken.
  expect(spoken(result).replaceAll(/\s+/gu, " ")).toContain("20 taka to 80 taka");
  expect(result.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
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
  setup();
  type("karwan");
  key("Enter");
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
  setup();
  type("motijheel");
  key("Enter");
  expect(spoken(screen.getByRole("article")).replaceAll(/\s+/gu, " ")).toContain(
    "20 taka to 100 taka",
  );
});

test("METRO-112 Show on map drops the sheet to peek and tells the screen", () => {
  const { onShowOnMap } = setup();
  type("farmgate");
  key("Enter");
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(onShowOnMap).toHaveBeenCalledTimes(1);
  expect(grip().getAttribute("aria-label")).toContain("Now peek height");
});

test("METRO-112 picking the same station again moves focus back to the heading", () => {
  setup();
  type("farmgate");
  key("Enter");
  const heading = screen.getByRole("heading", { level: 2, name: "Farmgate" });
  box().focus();
  expect(document.activeElement).toBe(box());
  type("farmgate");
  key("Enter");
  expect(document.activeElement).toBe(heading);
});

test("METRO-112 a new pick replaces the result and the map highlight", () => {
  const { onPick } = setup();
  type("farmgate");
  key("Enter");
  type("shahbagh");
  key("Enter");
  expect(onPick).toHaveBeenLastCalledWith("shahbagh");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 2, name: "Shahbag" })).toBeTruthy();
});

test("METRO-112 the picker uses no network, no inline style and no style attribute", () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const beacon = vi.fn();
  Reflect.set(navigator, "sendBeacon", beacon);
  const { container } = setup();
  type("mir");
  key("ArrowDown");
  key("Enter");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(beacon).not.toHaveBeenCalled();
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
  Reflect.deleteProperty(navigator, "sendBeacon");
});

test("METRO-112 a browser without scrollIntoView still moves the active option and opens the list", () => {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  try {
    setup();
    type("mir");
    key("ArrowDown");
    expect(activeName()).toBe("Mirpur 10");
  } finally {
    if (original === undefined) Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    else Object.defineProperty(Element.prototype, "scrollIntoView", original);
  }
});

test("METRO-112 opening the list scrolls the field with its list into view (nearest), and the active option into the list", () => {
  const scroll = vi.fn();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: scroll,
    configurable: true,
    writable: true,
  });
  try {
    setup();
    type("mir");
    // The field with its list and the active option both ask for "nearest": nothing moves when already in view.
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll).toHaveBeenNthCalledWith(1, { block: "nearest" });
    expect(scroll).toHaveBeenNthCalledWith(2, { block: "nearest" });
  } finally {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  }
});

// METRO-118: a click on an option keeps focus in the field (still `:focus-visible`), so the heading is focused
// with a request for no ring; Enter asks for the ring.
test("METRO-118 focuses the heading with a ring after Enter and without one after a click on an option", () => {
  const focus = vi.spyOn(HTMLElement.prototype, "focus");
  setup();
  fireEvent.change(box(), { target: { value: "motijheel" } });
  fireEvent.keyDown(box(), { key: "Enter" });
  const motijheel = screen.getByRole("heading", { level: 2, name: "Motijheel" });
  const lastCall = (target: HTMLElement): FocusOptions | undefined => {
    let found: FocusOptions | undefined;
    for (const [index, self] of focus.mock.contexts.entries()) {
      if (self === target) found = focus.mock.calls[index]?.[0];
    }
    return found;
  };
  expect(lastCall(motijheel)).toEqual({ focusVisible: true });

  fireEvent.change(box(), { target: { value: "uttara north" } });
  fireEvent.click(must(listbox().querySelector<HTMLElement>("[role=option]")));
  const uttara = screen.getByRole("heading", { level: 2, name: "Uttara North" });
  expect(lastCall(uttara)).toEqual({ focusVisible: false });
});
