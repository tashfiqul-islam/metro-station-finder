import { FIT_VIEW } from "./projection";
import type { Point } from "./projection";

/** What the zoom and pan controls change: the centre and zoom of the view, as pure data. */
export interface View {
  readonly cx: number;
  readonly cy: number;
  /** 1 is the fit-all view. */
  readonly zoom: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
/** One press of a zoom button or key. */
export const ZOOM_STEP = 1.5;
/** One arrow key press, in screen pixels (WCAG 2.5.7 needs a non-dragging way to pan). */
export const KEY_PAN_PX = 60;

export const FIT: View = {
  cx: FIT_VIEW.x + FIT_VIEW.width / 2,
  cy: FIT_VIEW.y + FIT_VIEW.height / 2,
  zoom: 1,
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** Keeps the zoom in range and the centre inside the fit view's area, so the line cannot be lost. */
function clampView({ cx, cy, zoom }: View): View {
  return {
    cx: clamp(cx, FIT_VIEW.x, FIT_VIEW.x + FIT_VIEW.width),
    cy: clamp(cy, FIT_VIEW.y, FIT_VIEW.y + FIT_VIEW.height),
    zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

const two = (value: number): number => Math.round(value * 100) / 100;

/** The `viewBox` attribute. The aspect ratio never changes; zoom scales both sides. */
export function viewBoxOf({ cx, cy, zoom }: View): string {
  const width = FIT_VIEW.width / zoom;
  const height = FIT_VIEW.height / zoom;
  return [cx - width / 2, cy - height / 2, width, height].map(two).join(" ");
}

/** Multiplies the zoom. With an anchor (map units) that point stays under the same screen position. */
export function zoomBy(view: View, factor: number, anchor?: Point): View {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  if (anchor === undefined) return clampView({ ...view, zoom });
  const ratio = view.zoom / zoom;
  return clampView({
    cx: anchor.x - (anchor.x - view.cx) * ratio,
    cy: anchor.y - (anchor.y - view.cy) * ratio,
    zoom,
  });
}

/** Moves the centre by map units. */
export function panBy(view: View, dx: number, dy: number): View {
  return clampView({ ...view, cx: view.cx + dx, cy: view.cy + dy });
}

/** Screen pixels per map unit for an element of this size (`preserveAspectRatio="meet"`). Zero before layout. */
export function scaleOf(view: View, rect: Rect): number {
  return Math.min(
    rect.width / (FIT_VIEW.width / view.zoom),
    rect.height / (FIT_VIEW.height / view.zoom),
  );
}

/** A client point in map units, allowing for the margin `meet` leaves on one axis. */
export function toMap(view: View, rect: Rect, clientX: number, clientY: number): Point {
  const scale = scaleOf(view, rect);
  if (scale <= 0) return { x: view.cx, y: view.cy };
  const offsetX = (rect.width - (FIT_VIEW.width / view.zoom) * scale) / 2;
  const offsetY = (rect.height - (FIT_VIEW.height / view.zoom) * scale) / 2;
  return {
    x: view.cx - FIT_VIEW.width / view.zoom / 2 + (clientX - rect.left - offsetX) / scale,
    y: view.cy - FIT_VIEW.height / view.zoom / 2 + (clientY - rect.top - offsetY) / scale,
  };
}

/** Pans by screen pixels (a drag, an arrow key): the content follows the pointer, so the view moves the other way. */
export function panPx(view: View, rect: Rect, dx: number, dy: number): View {
  const scale = scaleOf(view, rect);
  return scale <= 0 ? view : panBy(view, dx / scale, dy / scale);
}

const ARROW: Readonly<Record<string, readonly [number, number]>> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

/** The view after a key on the focused map, or `null` when the key is not ours (so the browser keeps it). */
export function keyView(view: View, key: string, rect: Rect): View | null {
  const arrow = ARROW[key];
  if (arrow !== undefined) return panPx(view, rect, arrow[0] * KEY_PAN_PX, arrow[1] * KEY_PAN_PX);
  if (key === "+" || key === "=") return zoomBy(view, ZOOM_STEP);
  if (key === "-" || key === "_") return zoomBy(view, 1 / ZOOM_STEP);
  if (key === "0") return FIT;
  return null;
}

const LINE_PX = 16;

/** A wheel delta in pixels, whatever its `deltaMode`: 0 pixels, 1 lines (Firefox), 2 pages (one element height). */
export function wheelPixels(delta: number, mode: number, pageHeight: number): number {
  if (mode === 1) return delta * LINE_PX;
  if (mode === 2) return delta * pageHeight;
  return delta;
}
