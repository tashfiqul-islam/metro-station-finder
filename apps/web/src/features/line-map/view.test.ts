import { expect, test } from "vitest";

import {
  FIT,
  KEY_PAN_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  keyView,
  panBy,
  scaleOf,
  toMap,
  viewBoxOf,
  wheelPixels,
  zoomBy,
} from "./view";

/** An element 470 x 880 px: one screen pixel per map unit at the fit view. */
const RECT = { left: 10, top: 20, width: 470, height: 880 };

test("the fit view is the handoff's view box 100 70 470 880", () => {
  expect(viewBoxOf(FIT)).toBe("100 70 470 880");
  expect(FIT.zoom).toBe(1);
});

test("zoom limits are 0.5x to 8x and a step is 1.5x", () => {
  expect([MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, KEY_PAN_PX]).toEqual([0.5, 8, 1.5, 60]);
});

test("zooming in halves the box around the centre; zooming out doubles it", () => {
  expect(viewBoxOf(zoomBy(FIT, 2))).toBe("217.5 290 235 440");
  expect(viewBoxOf(zoomBy(FIT, 0.5))).toBe("-135 -370 940 1760");
});

test("zoom is clamped to the limits however far it is pushed", () => {
  expect(zoomBy(FIT, 1000).zoom).toBe(MAX_ZOOM);
  expect(zoomBy(FIT, 0.0001).zoom).toBe(MIN_ZOOM);
  expect(zoomBy({ ...FIT, zoom: MAX_ZOOM }, 2).zoom).toBe(MAX_ZOOM);
});

test("zooming around an anchor keeps the anchor under the same screen position", () => {
  const anchor = { x: 200, y: 200 };
  const before = toMap(FIT, RECT, 10 + (anchor.x - 100), 20 + (anchor.y - 70));
  expect(before.x).toBeCloseTo(200, 6);
  const zoomed = zoomBy(FIT, 2, anchor);
  const after = toMap(zoomed, RECT, 10 + (anchor.x - 100), 20 + (anchor.y - 70));
  expect(after.x).toBeCloseTo(200, 6);
  expect(after.y).toBeCloseTo(200, 6);
});

test("panning moves the centre in map units and cannot leave the line's area", () => {
  expect(panBy(FIT, 10, -20)).toEqual({ cx: 345, cy: 490, zoom: 1 });
  expect(panBy(FIT, 100000, 100000)).toEqual({ cx: 570, cy: 950, zoom: 1 });
  expect(panBy(FIT, -100000, -100000)).toEqual({ cx: 100, cy: 70, zoom: 1 });
});

test("scale is screen pixels per map unit, letterboxed like preserveAspectRatio meet", () => {
  expect(scaleOf(FIT, RECT)).toBe(1);
  expect(scaleOf(FIT, { ...RECT, width: 940 })).toBe(1);
  expect(scaleOf(zoomBy(FIT, 2), RECT)).toBe(2);
  expect(scaleOf(FIT, { left: 0, top: 0, width: 0, height: 0 })).toBe(0);
});

test("toMap converts a client point to map units, allowing for the letterbox margin", () => {
  expect(toMap(FIT, RECT, 10, 20)).toEqual({ x: 100, y: 70 });
  const wide = { left: 0, top: 0, width: 940, height: 880 };
  expect(toMap(FIT, wide, 470, 440)).toEqual({ x: 335, y: 510 });
  expect(toMap(FIT, { left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 335, y: 510 });
});

test("arrow keys pan by 60 screen pixels in the arrow's direction", () => {
  expect(keyView(FIT, "ArrowRight", RECT)).toEqual({ cx: 395, cy: 510, zoom: 1 });
  expect(keyView(FIT, "ArrowLeft", RECT)).toEqual({ cx: 275, cy: 510, zoom: 1 });
  expect(keyView(FIT, "ArrowDown", RECT)).toEqual({ cx: 335, cy: 570, zoom: 1 });
  expect(keyView(FIT, "ArrowUp", RECT)).toEqual({ cx: 335, cy: 450, zoom: 1 });
  // At 2x, 60 screen pixels are 30 map units.
  expect(keyView(zoomBy(FIT, 2), "ArrowRight", RECT)).toEqual({ cx: 365, cy: 510, zoom: 2 });
});

test("plus and minus zoom, zero fits, other keys do nothing", () => {
  expect(keyView(FIT, "+", RECT)?.zoom).toBe(1.5);
  expect(keyView(FIT, "=", RECT)?.zoom).toBe(1.5);
  expect(keyView(FIT, "-", RECT)?.zoom).toBeCloseTo(1 / 1.5, 10);
  expect(keyView(FIT, "_", RECT)?.zoom).toBeCloseTo(1 / 1.5, 10);
  expect(keyView(zoomBy(panBy(FIT, 50, 50), 3), "0", RECT)).toEqual(FIT);
  expect(keyView(FIT, "a", RECT)).toBeNull();
  expect(keyView(FIT, "Enter", RECT)).toBeNull();
});

test("arrow keys do nothing before the element has a size", () => {
  expect(keyView(FIT, "ArrowRight", { left: 0, top: 0, width: 0, height: 0 })).toEqual(FIT);
});

test("a wheel delta is normalised to pixels for pixel, line and page modes", () => {
  expect(wheelPixels(-100, 0, 880)).toBe(-100);
  expect(wheelPixels(-3, 1, 880)).toBe(-48);
  expect(wheelPixels(1, 2, 880)).toBe(880);
});
