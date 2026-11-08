import { cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { LineMap } from "./LineMap";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

/** A 470 x 880 px map: one screen pixel per map unit at the fit view. */
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 470, 880));
});

const map = (): SVGSVGElement => {
  const found = screen.getByRole("application");
  if (!(found instanceof SVGSVGElement)) throw new Error("no map");
  return found;
};
const box = (): string => map().getAttribute("viewBox") ?? "";
/** happy-dom drops the pointer position from a WheelEvent init, so it is set on the event itself. */
function wheel(init: {
  deltaY: number;
  deltaMode?: number;
  clientX: number;
  clientY: number;
}): boolean {
  const event = createEvent.wheel(map(), { deltaY: init.deltaY, deltaMode: init.deltaMode ?? 0 });
  Object.defineProperty(event, "clientX", { value: init.clientX });
  Object.defineProperty(event, "clientY", { value: init.clientY });
  return fireEvent(map(), event);
}
const press = (key: string, init: KeyboardEventInit = {}): boolean =>
  fireEvent.keyDown(map(), { key, ...init });

test("METRO-111 three 44 px controls with names are in a group after the map, in the tab order", () => {
  const { container } = render(<LineMap />);
  const group = screen.getByRole("group", { name: "Map controls" });
  const names = within(group)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label"));
  expect(names).toEqual(["Zoom in", "Zoom out", "Show whole line"]);
  const stops = [...container.querySelectorAll("[tabindex], button")];
  expect(stops).toHaveLength(4);
  expect(stops[0]).toBe(map());
  expect(map().getAttribute("aria-keyshortcuts")).toBe(
    "ArrowUp ArrowDown ArrowLeft ArrowRight Plus Minus 0",
  );
});

test("METRO-111 Zoom in, Zoom out and Show whole line change the view box at once", () => {
  render(<LineMap />);
  expect(box()).toBe("100 70 470 880");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(box()).toBe("178.33 216.67 313.33 586.67");
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(box()).toBe("100 70 470 880");
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(box()).toBe("-17.5 -150 705 1320");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  fireEvent.click(screen.getByRole("button", { name: "Show whole line" }));
  expect(box()).toBe("100 70 470 880");
});

test("METRO-111 zoom stops at 8x and at 0.5x", () => {
  render(<LineMap />);
  for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(box()).toBe("305.63 455 58.75 110");
  for (let i = 0; i < 20; i += 1) fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(box()).toBe("-135 -370 940 1760");
});

test("METRO-111 arrow keys pan by 60 px and keep the key from scrolling the page", () => {
  render(<LineMap />);
  expect(press("ArrowRight")).toBe(false);
  expect(box()).toBe("160 70 470 880");
  press("ArrowDown");
  expect(box()).toBe("160 130 470 880");
  press("ArrowLeft");
  press("ArrowUp");
  expect(box()).toBe("100 70 470 880");
});

test("METRO-111 plus and minus zoom, zero shows the whole line", () => {
  render(<LineMap />);
  press("+");
  expect(box()).toBe("178.33 216.67 313.33 586.67");
  press("0");
  expect(box()).toBe("100 70 470 880");
  press("-");
  expect(box()).toBe("-17.5 -150 705 1320");
});

test("METRO-111 keys with a modifier or that the map does not use are left to the browser", () => {
  render(<LineMap />);
  expect(press("ArrowRight", { ctrlKey: true })).toBe(true);
  expect(press("+", { metaKey: true })).toBe(true);
  expect(press("-", { altKey: true })).toBe(true);
  expect(press("Tab")).toBe(true);
  expect(press("a")).toBe(true);
  expect(box()).toBe("100 70 470 880");
});

test("METRO-111 the wheel zooms around the pointer and does not scroll the page", () => {
  render(<LineMap />);
  // Over the top-left corner of the map (map point 100, 70): that point stays put.
  expect(wheel({ deltaY: -100, clientX: 0, clientY: 0 })).toBe(false);
  const [x, y, width] = box().split(" ").map(Number);
  expect(width).toBeLessThan(470);
  expect(Math.abs((x ?? 0) - 100)).toBeLessThan(1);
  expect(Math.abs((y ?? 0) - 70)).toBeLessThan(1);
  wheel({ deltaY: 100, clientX: 0, clientY: 0 });
  expect(box()).toBe("100 70 470 880");
});

test("METRO-111 a wheel in line mode counts 16 px a line", () => {
  render(<LineMap />);
  wheel({ deltaY: -3, deltaMode: 1, clientX: 235, clientY: 440 });
  const width = Number(box().split(" ")[2]);
  expect(width).toBeLessThan(470);
  expect(width).toBeCloseTo(470 / Math.exp(3 * 16 * 0.002), 1);
});

test("METRO-111 dragging pans with the pointer; releasing, cancelling and other pointers are handled", () => {
  render(<LineMap />);
  const pointer = { pointerId: 1, pointerType: "touch" };
  fireEvent.pointerDown(map(), { ...pointer, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(map(), { ...pointer, clientX: 70, clientY: 130 });
  // The map follows the finger: it moved 30 px left and 30 px down, so the view moved right and up.
  expect(box()).toBe("130 40 470 880");
  fireEvent.pointerMove(map(), { pointerId: 9, pointerType: "touch", clientX: 0, clientY: 0 });
  expect(box()).toBe("130 40 470 880");
  fireEvent.pointerUp(map(), pointer);
  fireEvent.pointerMove(map(), { ...pointer, clientX: 0, clientY: 0 });
  expect(box()).toBe("130 40 470 880");
  fireEvent.pointerDown(map(), { ...pointer, clientX: 0, clientY: 0 });
  fireEvent.pointerCancel(map(), pointer);
  fireEvent.pointerMove(map(), { ...pointer, clientX: 50, clientY: 0 });
  expect(box()).toBe("130 40 470 880");
  fireEvent.pointerDown(map(), { ...pointer, clientX: 0, clientY: 0 });
  fireEvent.lostPointerCapture(map(), pointer);
  fireEvent.pointerMove(map(), { ...pointer, clientX: 50, clientY: 0 });
  expect(box()).toBe("130 40 470 880");
});

test("METRO-111 only the primary mouse button drags", () => {
  render(<LineMap />);
  const mouse = { pointerId: 2, pointerType: "mouse" };
  fireEvent.pointerDown(map(), { ...mouse, button: 2, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(map(), { ...mouse, clientX: 50, clientY: 100 });
  expect(box()).toBe("100 70 470 880");
  fireEvent.pointerDown(map(), { ...mouse, button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(map(), { ...mouse, clientX: 50, clientY: 100 });
  expect(box()).toBe("150 70 470 880");
});

test("METRO-111 two pointers pinch to zoom, a third is ignored, and an empty gap does not divide by zero", () => {
  render(<LineMap />);
  const one = { pointerId: 1, pointerType: "touch" };
  const two = { pointerId: 2, pointerType: "touch" };
  const three = { pointerId: 3, pointerType: "touch" };
  fireEvent.pointerDown(map(), { ...one, clientX: 135, clientY: 440 });
  fireEvent.pointerDown(map(), { ...two, clientX: 335, clientY: 440 });
  // The fingers move apart, doubling the gap around the same midpoint: zoom 2.
  fireEvent.pointerMove(map(), { ...two, clientX: 435, clientY: 440 });
  fireEvent.pointerMove(map(), { ...one, clientX: 35, clientY: 440 });
  const zoomed = box().split(" ").map(Number);
  expect(zoomed[2]).toBeCloseTo(470 / 2, 0);
  fireEvent.pointerDown(map(), { ...three, clientX: 1, clientY: 1 });
  const before = box();
  fireEvent.pointerMove(map(), { ...three, clientX: 300, clientY: 300 });
  expect(box()).toBe(before);
  fireEvent.pointerUp(map(), three);
  fireEvent.pointerUp(map(), one);
  fireEvent.pointerUp(map(), two);

  fireEvent.pointerDown(map(), { ...one, clientX: 100, clientY: 100 });
  fireEvent.pointerDown(map(), { ...two, clientX: 100, clientY: 100 });
  const level = Number(box().split(" ")[2]);
  fireEvent.pointerMove(map(), { ...two, clientX: 100, clientY: 100 });
  expect(Number(box().split(" ")[2])).toBe(level);
});

test("METRO-111 a drag or key before the map has a size changes nothing", () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 0, 0));
  render(<LineMap />);
  const pointer = { pointerId: 1, pointerType: "touch" };
  fireEvent.pointerDown(map(), { ...pointer, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(map(), { ...pointer, clientX: 40, clientY: 40 });
  press("ArrowRight");
  expect(box()).toBe("100 70 470 880");
});

test("METRO-111 the interactive map still carries no style attribute and makes no request", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const { container } = render(<LineMap />);
  press("+");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  wheel({ deltaY: -50, clientX: 10, clientY: 10 });
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
  expect(fetchSpy).not.toHaveBeenCalled();
});
