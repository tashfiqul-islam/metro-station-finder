import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { locate, search } from "../icons/icon-data";
import { AppShell, useSheet } from "./AppShell";
import { SectionNav } from "./SectionNav";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  // happy-dom has no layout: give the panel its half-height and implement pointer capture.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 0, 490),
  );
  Reflect.set(HTMLElement.prototype, "setPointerCapture", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

function must<T extends Element>(element: T | null): T {
  if (element === null) throw new Error("element missing");
  return element;
}
const app = (container: HTMLElement): HTMLElement =>
  must(container.querySelector<HTMLElement>(".app"));
const grip = (): HTMLElement => screen.getByRole("button", { name: /^Resize panel\./u });

function pointer(
  type: string,
  init: { clientY: number; pointerType?: string; button?: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: "touch", button: 0, ...init });
  act(() => {
    grip().dispatchEvent(event);
  });
}

test("METRO-105 landmarks: one banner, one main, a notifications region, in header-nav-main order", () => {
  const { container } = render(
    <AppShell
      label="Nearby"
      nav={<SectionNav items={[{ href: "/", label: "Nearby", icon: locate, current: true }]} />}
    >
      <p>content</p>
    </AppShell>,
  );
  expect(screen.getAllByRole("banner")).toHaveLength(1);
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("main", { name: "Nearby" })).toBeTruthy();
  expect(screen.getByRole("region", { name: "Notifications" })).toBeTruthy();
  const order = [...container.querySelectorAll("header, nav, main")].map((node) => node.tagName);
  expect(order).toEqual(["HEADER", "NAV", "MAIN"]);
  expect(screen.getByText("content")).toBeTruthy();
});

test("METRO-105 the header holds the brand and action slots and the theme button; the map slot is optional", () => {
  const { container } = render(
    <AppShell
      brand={<span>logo</span>}
      actions={<button type="button">find</button>}
      map={<i>map</i>}
    >
      x
    </AppShell>,
  );
  const header = screen.getByRole("banner");
  expect(header.textContent).toContain("logo");
  expect(screen.getByRole("button", { name: "find" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Theme: /u })).toBeTruthy();
  expect(container.querySelector(".app__map-frame")?.textContent).toBe("map");
  cleanup();
  const bare = render(<AppShell>x</AppShell>);
  expect(bare.container.querySelector(".app__map-frame")).toBeNull();
  expect(bare.container.querySelector("nav")).toBeNull();
  expect(bare.container.querySelector("main")?.className).toBe("panel panel--plain");
});

test("METRO-105 the section nav is links with aria-current, never tabs", () => {
  render(
    <AppShell
      nav={
        <SectionNav
          items={[
            { href: "/", label: "Nearby", icon: locate, current: true },
            { href: "/line", label: "Line", icon: search },
          ]}
        />
      }
    >
      x
    </AppShell>,
  );
  const nav = screen.getByRole("navigation", { name: "Sections" });
  expect(nav.querySelectorAll("a")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Nearby" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Line" }).hasAttribute("aria-current")).toBe(false);
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
  expect(document.querySelector('[role="tablist"]')).toBeNull();
});

test("METRO-105 the scroll area is not a Tab stop of its own (Firefox would add one)", () => {
  const { container } = render(<AppShell>x</AppShell>);
  expect(container.querySelector(".panel__scroll")?.getAttribute("tabindex")).toBe("-1");
});

test("METRO-105 the sheet starts at half and the handle row has the three controls in order", () => {
  const { container } = render(<AppShell>x</AppShell>);
  expect(app(container).getAttribute("data-snap")).toBe("half");
  const names = [...container.querySelectorAll(".panel__handle button")].map(
    (b) => b.textContent || b.getAttribute("aria-label"),
  );
  expect(names).toEqual([
    "Make panel smaller",
    "Resize panel. Now half height. Drag, or use the arrow keys.",
    "Make panel larger",
  ]);
});

test("METRO-105 a tap on the grip cycles half, full, peek, half", () => {
  const { container } = render(<AppShell>x</AppShell>);
  for (const expected of ["full", "peek", "half"]) {
    fireEvent.click(grip());
    expect(app(container).getAttribute("data-snap")).toBe(expected);
  }
});

test("METRO-105 the arrow keys and the two text buttons change the snap", () => {
  const { container } = render(<AppShell initialSnap="peek">x</AppShell>);
  fireEvent.keyDown(grip(), { key: "ArrowUp" });
  expect(app(container).getAttribute("data-snap")).toBe("half");
  fireEvent.keyDown(grip(), { key: "ArrowUp" });
  expect(app(container).getAttribute("data-snap")).toBe("full");
  fireEvent.keyDown(grip(), { key: "ArrowDown" });
  expect(app(container).getAttribute("data-snap")).toBe("half");
  const other = fireEvent.keyDown(grip(), { key: "a" });
  expect(other).toBe(true);
  expect(app(container).getAttribute("data-snap")).toBe("half");
  fireEvent.click(screen.getByRole("button", { name: "Make panel larger" }));
  expect(app(container).getAttribute("data-snap")).toBe("full");
  fireEvent.click(screen.getByRole("button", { name: "Make panel smaller" }));
  fireEvent.click(screen.getByRole("button", { name: "Make panel smaller" }));
  expect(app(container).getAttribute("data-snap")).toBe("peek");
});

test("METRO-105 dragging writes --sheet-h through the CSSOM, marks the panel and snaps on release", () => {
  const { container } = render(<AppShell>x</AppShell>);
  const panel = must(container.querySelector("main"));
  pointer("pointerdown", { clientY: 500 });
  pointer("pointermove", { clientY: 498 }); // under the 4px threshold: still a tap
  expect(panel.hasAttribute("data-dragging")).toBe(false);
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
  pointer("pointermove", { clientY: 400 }); // 100px up from 490 = 590
  expect(panel.hasAttribute("data-dragging")).toBe(true);
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("590px");
  pointer("pointermove", { clientY: -900 }); // clamped to full (696)
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("696px");
  pointer("pointerup", { clientY: -900 });
  expect(app(container).getAttribute("data-snap")).toBe("full");
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
  expect(panel.hasAttribute("data-dragging")).toBe(false);
  expect(container.querySelector("[style]")).toBeNull(); // not even an empty attribute is left behind
  // The click that ends a drag must not also cycle the snap.
  fireEvent.click(grip());
  expect(app(container).getAttribute("data-snap")).toBe("full");
});

test("METRO-105 a drag down to the bottom snaps to peek and a tap after a drag works again", () => {
  const { container } = render(<AppShell>x</AppShell>);
  pointer("pointerdown", { clientY: 100 });
  pointer("pointermove", { clientY: 900 }); // 490 - 800 clamps to 120
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("120px");
  pointer("pointerup", { clientY: 900 });
  expect(app(container).getAttribute("data-snap")).toBe("peek");
  fireEvent.click(grip());
  fireEvent.click(grip());
  expect(app(container).getAttribute("data-snap")).toBe("half");
});

test("METRO-105 a cancelled drag restores the sheet and changes no snap; a right mouse button starts none", () => {
  const { container } = render(<AppShell>x</AppShell>);
  pointer("pointerdown", { clientY: 500 });
  pointer("pointermove", { clientY: 300 });
  pointer("pointercancel", { clientY: 300 });
  expect(app(container).getAttribute("data-snap")).toBe("half");
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
  expect(container.querySelector("main")?.hasAttribute("data-dragging")).toBe(false);
  pointer("pointerdown", { clientY: 500, pointerType: "mouse", button: 2 });
  pointer("pointermove", { clientY: 300 });
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
  pointer("pointerup", { clientY: 300 });
  expect(app(container).getAttribute("data-snap")).toBe("half");
  // Move or release with no drag in progress is ignored.
  pointer("pointermove", { clientY: 100 });
  pointer("pointerup", { clientY: 100 });
  expect(app(container).getAttribute("data-snap")).toBe("half");
});

function Typing() {
  const { snap, setSnap } = useSheet();
  return (
    <button type="button" onClick={() => setSnap("full")}>
      now {snap}
    </button>
  );
}

test("METRO-105 a slice can set the snap through useSheet and outside the shell it throws", () => {
  const { container } = render(
    <AppShell>
      <Typing />
    </AppShell>,
  );
  fireEvent.click(screen.getByRole("button", { name: "now half" }));
  expect(app(container).getAttribute("data-snap")).toBe("full");
  cleanup();
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Typing />)).toThrow("useSheet needs AppShell");
  spy.mockRestore();
});

test("METRO-105 the toast region renders toasts and no element has a style attribute at rest", () => {
  const { container } = render(<AppShell toasts={<p>saved</p>}>x</AppShell>);
  expect(screen.getByRole("region", { name: "Notifications" }).textContent).toBe("saved");
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
});
