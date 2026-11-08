/** Bottom-sheet snap points (handoff `interactions.md`). Below 768 px the panel is a sheet; above, a sidebar. */
const SNAPS = ["peek", "half", "full"] as const;
export type Snap = (typeof SNAPS)[number];

/** CSS values: `--sheet-peek` 196px, `--sheet-half` 58dvh, `--sheet-full` 100dvh - 148px - safe-area-bottom. */
const PEEK_PX = 196;
const HALF_RATIO = 0.58;
const FULL_INSET_PX = 148;
/** Lowest height a drag may reach. */
const MIN_PX = 120;
/** Movement beyond this (px) turns a press on the grip into a drag; less is a tap. */
export const DRAG_THRESHOLD_PX = 4;

/**
 * Pixel heights of the three snaps for a viewport height. During a drag only: the safe-area inset is not
 * known here, so `full` can be up to the inset (about 34 px on an iPhone) too tall until release, when the
 * CSS `data-snap` value takes over exactly.
 */
export function snapHeights(viewportHeight: number): Record<Snap, number> {
  return {
    peek: PEEK_PX,
    half: Math.round(viewportHeight * HALF_RATIO),
    full: Math.max(PEEK_PX, viewportHeight - FULL_INSET_PX),
  };
}

export function clampHeight(height: number, viewportHeight: number): number {
  return Math.min(Math.max(height, MIN_PX), snapHeights(viewportHeight).full);
}

/** The snap whose height is closest to `height`. */
export function nearestSnap(height: number, viewportHeight: number): Snap {
  const heights = snapHeights(viewportHeight);
  let best: Snap = "peek";
  for (const snap of SNAPS) {
    if (Math.abs(heights[snap] - height) < Math.abs(heights[best] - height)) best = snap;
  }
  return best;
}

const CYCLE: Record<Snap, Snap> = { peek: "half", half: "full", full: "peek" };
const LARGER: Record<Snap, Snap> = { peek: "half", half: "full", full: "full" };
const SMALLER: Record<Snap, Snap> = { peek: "peek", half: "peek", full: "half" };

/** Tap on the grip: peek, half, full, then back to peek. */
export const cycleSnap = (snap: Snap): Snap => CYCLE[snap];
export const largerSnap = (snap: Snap): Snap => LARGER[snap];
export const smallerSnap = (snap: Snap): Snap => SMALLER[snap];

/** ArrowUp makes the sheet larger, ArrowDown smaller; any other key changes nothing (null). */
export function keySnap(key: string, snap: Snap): Snap | null {
  if (key === "ArrowUp") return largerSnap(snap);
  if (key === "ArrowDown") return smallerSnap(snap);
  return null;
}
