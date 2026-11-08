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
  init: { clientY: number; pointerType?: string; button?: number; pointerId?: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: "touch", button: 0, ...init });
  act(() => {
    grip().dispatchEvent(event);
  });
}

test("METRO-105 the header holds the brand as the one Home link, by default and replaceable", () => {
  render(<AppShell>x</AppShell>);
  expect(screen.getAllByRole("link", { name: "Metro Station Finder, home" })).toHaveLength(1);
  expect(screen.getByRole("banner").contains(screen.getByRole("link", { name: /home$/u }))).toBe(
    true,
  );
  cleanup();
  render(<AppShell brand={<span>own logo</span>}>x</AppShell>);
  expect(screen.queryByRole("link", { name: /home$/u })).toBeNull();
  expect(screen.getByText("own logo")).toBeTruthy();
});

test("METRO-105 the sheet leaves room for the tab bar only when a section nav is drawn", () => {
  const { container } = render(<AppShell>x</AppShell>);
  expect(app(container).classList.contains("app--plain")).toBe(true);
  expect(must(container.querySelector("main")).className).toBe("panel panel--plain");
  cleanup();
  const withNav = render(
    <AppShell
      nav={<SectionNav items={[{ href: "/", label: "Nearby", icon: locate, current: true }]} />}
    >
      x
    </AppShell>,
  );
  expect(app(withNav.container).className).toBe("app");
  expect(must(withNav.container.querySelector("main")).className).toBe("panel");
});

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
  pointer("pointermove", { clientY: -900 }); // clamped to full: 844 - 64 - 8 with no nav drawn
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("772px");
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

test("METRO-105 keyboard focus entering the content of a peeking sheet opens it to half", () => {
  const { container } = render(
    <AppShell initialSnap="peek">
      <button type="button">first control</button>
    </AppShell>,
  );
  expect(app(container).getAttribute("data-snap")).toBe("peek");
  // The handle's own controls do not open it, so a keyboard user can still resize from the grip.
  act(() => grip().focus());
  act(() => screen.getByRole("button", { name: "Make panel larger" }).focus());
  expect(app(container).getAttribute("data-snap")).toBe("peek");
  act(() => screen.getByRole("button", { name: "first control" }).focus());
  expect(app(container).getAttribute("data-snap")).toBe("half");
});

test("METRO-105 focus in the content leaves a half or full sheet where it is", () => {
  for (const initial of ["half", "full"] as const) {
    const { container } = render(
      <AppShell initialSnap={initial}>
        <button type="button">control</button>
      </AppShell>,
    );
    act(() => screen.getByRole("button", { name: "control" }).focus());
    expect(app(container).getAttribute("data-snap")).toBe(initial);
    cleanup();
  }
});

test("METRO-105 each snap change is announced politely as panel text", () => {
  render(<AppShell>x</AppShell>);
  const status = screen.getByRole("status");
  expect(status.textContent).toBe("Panel half height");
  expect(status.className).toBe("visually-hidden");
  fireEvent.click(grip());
  expect(status.textContent).toBe("Panel full height");
});

test("METRO-105 a lost pointer capture restores the sheet and changes no snap", () => {
  const { container } = render(<AppShell>x</AppShell>);
  pointer("pointerdown", { clientY: 500 });
  pointer("pointermove", { clientY: 300 });
  expect(app(container).style.getPropertyValue("--sheet-h")).not.toBe("");
  pointer("lostpointercapture", { clientY: 300 });
  expect(app(container).getAttribute("data-snap")).toBe("half");
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
  expect(container.querySelector("[style]")).toBeNull();
  expect(must(container.querySelector("main")).hasAttribute("data-dragging")).toBe(false);
});

test("METRO-105 unmounting during a drag leaves no dragging marker or sheet height behind", () => {
  const { container, unmount } = render(<AppShell>x</AppShell>);
  const shell = app(container);
  const panel = must(container.querySelector("main"));
  pointer("pointerdown", { clientY: 500 });
  pointer("pointermove", { clientY: 300 });
  expect(panel.hasAttribute("data-dragging")).toBe(true);
  unmount();
  expect(panel.hasAttribute("data-dragging")).toBe(false);
  expect(shell.style.getPropertyValue("--sheet-h")).toBe("");
  expect(shell.hasAttribute("style")).toBe(false);
});

test("METRO-105 a second pointer during a drag is ignored and the first still finishes it", () => {
  const { container } = render(<AppShell>x</AppShell>);
  pointer("pointerdown", { clientY: 500, pointerId: 1 });
  pointer("pointermove", { clientY: 400, pointerId: 1 });
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("590px");
  pointer("pointerdown", { clientY: 100, pointerId: 2 }); // must not restart the drag
  pointer("pointermove", { clientY: -900, pointerId: 2 }); // must not move the sheet
  pointer("pointerup", { clientY: -900, pointerId: 2 }); // must not end the drag
  pointer("pointercancel", { clientY: 0, pointerId: 2 }); // nor cancel it
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("590px");
  expect(app(container).getAttribute("data-snap")).toBe("half");
  pointer("pointermove", { clientY: 300, pointerId: 1 }); // 490 + 200 = 690, nearest to full
  pointer("pointerup", { clientY: 300, pointerId: 1 });
  expect(app(container).getAttribute("data-snap")).toBe("full");
  expect(app(container).style.getPropertyValue("--sheet-h")).toBe("");
});

test("METRO-105 a key press after a drag that ended off the grip is not swallowed", () => {
  const { container } = render(<AppShell>x</AppShell>);
  pointer("pointerdown", { clientY: 500 });
  pointer("pointermove", { clientY: 300 });
  pointer("lostpointercapture", { clientY: 300 }); // the pointer left; no click follows
  fireEvent.keyDown(grip(), { key: "Enter" });
  fireEvent.click(grip()); // the click a keyboard Enter or Space produces
  expect(app(container).getAttribute("data-snap")).toBe("full");
});

test("METRO-111 the map slot comes after the panel in the DOM, so the header and panel are reached first", () => {
  const { container } = render(
    <AppShell map={<button type="button">map control</button>} toasts={<p>note</p>}>
      <button type="button">panel control</button>
    </AppShell>,
  );
  const order = [...container.querySelectorAll("header, main, .app__map, .toast-region")].map(
    (node) => node.tagName.toLowerCase() + (node.className === "" ? "" : `.${node.className}`),
  );
  expect(order).toEqual([
    "header.app-header",
    "main.panel panel--plain",
    "div.app__map",
    "section.toast-region",
  ]);
  const buttons = [...container.querySelectorAll("button")].map((button) => button.textContent);
  expect(buttons.indexOf("panel control")).toBeLessThan(buttons.indexOf("map control"));
});
