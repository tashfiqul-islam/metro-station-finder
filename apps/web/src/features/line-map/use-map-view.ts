import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { FIT, ZOOM_STEP, keyView, panPx, toMap, wheelPixels, zoomBy } from "./view";
import type { View } from "./view";

/** Wheel zoom: one 100-pixel notch is about 22 percent. */
const WHEEL_RATE = 0.002;

interface Touch {
  readonly x: number;
  readonly y: number;
}

/**
 * The zoom and pan of the map as state (METRO-111). Every change is applied at once: the view box attribute is
 * set from state with no animation, so reduced motion is honoured by construction. Pointer drag pans, two
 * pointers pinch, the wheel zooms around the pointer, and the keys are the ones in the handoff's interactions
 * (arrows pan 60 px, plus and minus zoom, 0 shows the whole line). Nothing here reads or sends a position.
 */
export function useMapView() {
  const [view, setView] = useState<View>(FIT);
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Touch>());

  useEffect(() => {
    const element = svg.current;
    if (element === null) return () => {};
    const onWheel = (event: WheelEvent): void => {
      // Ctrl or Meta with the wheel is the browser's own page zoom (and a trackpad pinch): leave it alone, so
      // WCAG 1.4.4 Resize Text keeps working over the map.
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const pixels = wheelPixels(event.deltaY, event.deltaMode, rect.height);
      setView((current) =>
        zoomBy(
          current,
          Math.exp(-pixels * WHEEL_RATE),
          toMap(current, rect, event.clientX, event.clientY),
        ),
      );
    };
    // Not a React prop: React registers wheel listeners as passive, and a passive listener cannot stop the page.
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function down(event: PointerEvent<SVGSVGElement>): void {
    // Primary button only; Ctrl with a mouse button is a context click on a Mac, not a drag.
    if (event.button !== 0 || (event.pointerType === "mouse" && event.ctrlKey)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (NotFoundError): no drag starts and nothing is left tracked.
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function move(event: PointerEvent<SVGSVGElement>): void {
    const before = pointers.current.get(event.pointerId);
    if (before === undefined) return;
    const after = { x: event.clientX, y: event.clientY };
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.set(event.pointerId, after);
    if (pointers.current.size === 1) {
      setView((current) => panPx(current, rect, before.x - after.x, before.y - after.y));
      return;
    }
    // Two pointers pinch; a third is ignored. The point under the old midpoint follows the new midpoint.
    const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other === undefined || pointers.current.size > 2) return;
    const oldGap = Math.hypot(before.x - other.x, before.y - other.y);
    const newGap = Math.hypot(after.x - other.x, after.y - other.y);
    const factor = oldGap > 0 ? newGap / oldGap : 1;
    const oldMid = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
    const newMid = { x: (after.x + other.x) / 2, y: (after.y + other.y) / 2 };
    setView((current) =>
      panPx(
        zoomBy(current, factor, toMap(current, rect, oldMid.x, oldMid.y)),
        rect,
        oldMid.x - newMid.x,
        oldMid.y - newMid.y,
      ),
    );
  }

  function release(event: PointerEvent<SVGSVGElement>): void {
    pointers.current.delete(event.pointerId);
  }

  function key(event: KeyboardEvent<SVGSVGElement>): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const next = keyView(view, event.key, event.currentTarget.getBoundingClientRect());
    if (next === null) return;
    event.preventDefault();
    setView(next);
  }

  return {
    view,
    svg,
    handlers: {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onKeyDown: key,
    },
    zoomIn: () => setView((current) => zoomBy(current, ZOOM_STEP)),
    zoomOut: () => setView((current) => zoomBy(current, 1 / ZOOM_STEP)),
    fit: () => setView(FIT),
  };
}
