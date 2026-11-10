import type { StationId } from "@metro/core";

import { round1 } from "./projection";
import type { LineStop } from "./projection";

/** Which side of its pin a label sits on. */
type Side = "right" | "left" | "below" | "above";

/** A label to draw, in pixels from its stop (the stop's group is scaled to pixels, see `LineMap.tsx`). */
export interface Label {
  readonly kind: "pill" | "halo";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly textX: number;
  readonly textY: number;
  readonly anchor: "start" | "end" | "middle";
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const PILL_HEIGHT = 24;
const HALO_HEIGHT = 14;
/** Space kept between two labels, in pixels. */
const GAP = 2;
/** Order in which the other sides are tried after the stop's own. */
const SIDES: readonly Side[] = ["right", "left", "below", "above"];

/** A pill: width follows the text (7.6px per character plus 9px padding each side), height 24px. */
function pillAt(name: string, side: Side): Label {
  const width = round1(name.length * 7.6 + 18);
  const x = round1(side === "left" ? -14 - width : side === "right" ? 14 : -width / 2);
  const y = side === "below" ? 20 : side === "above" ? -44 : -12;
  return {
    kind: "pill",
    x,
    y,
    width,
    height: PILL_HEIGHT,
    textX: round1(x + width / 2),
    textY: y + 16,
    anchor: "middle",
  };
}

/** A halo label (11.5px text, about 6.4px per character). */
function haloAt(name: string, side: Side): Label {
  const width = round1(name.length * 6.4);
  if (side === "below")
    return {
      kind: "halo",
      x: round1(-width / 2),
      y: 12,
      width,
      height: HALO_HEIGHT,
      textX: 0,
      textY: 22,
      anchor: "middle",
    };
  if (side === "above")
    return {
      kind: "halo",
      x: round1(-width / 2),
      y: -20,
      width,
      height: HALO_HEIGHT,
      textX: 0,
      textY: -10,
      anchor: "middle",
    };
  if (side === "left")
    return {
      kind: "halo",
      x: round1(-11 - width),
      y: -10,
      width,
      height: HALO_HEIGHT,
      textX: -11,
      textY: 4,
      anchor: "end",
    };
  return {
    kind: "halo",
    x: 11,
    y: -10,
    width,
    height: HALO_HEIGHT,
    textX: 11,
    textY: 4,
    anchor: "start",
  };
}

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right + GAP &&
  b.left < a.right + GAP &&
  a.top < b.bottom + GAP &&
  b.top < a.bottom + GAP;

/**
 * Decides which labels are drawn and on which side, for the map at `unit` map units per screen pixel (METRO-115).
 *
 * Labels have a fixed size in pixels, so at the fit view on a short frame neighbouring stops are only a few
 * pixels apart and their labels would overlap. The rule is deterministic: labels are placed in priority order,
 * marked stations (nearest, selected, in the order given) before the two termini before every other station
 * (the last only when `all` is set, from `LABELS_ZOOM`). Each takes the first side from its own, then right, left,
 * below, above, that overlaps no label already placed; one that fits on no side is not drawn (its pin and its
 * place in the station list remain).
 */
export function layoutLabels(
  stops: readonly LineStop[],
  marked: readonly StationId[],
  all: boolean,
  unit: number,
): ReadonlyMap<StationId, Label> {
  const first = [...new Set(marked)].flatMap((id) => stops.filter((stop) => stop.id === id));
  const rest = stops.filter((stop) => !marked.includes(stop.id));
  const order = [
    ...first,
    ...rest.filter((stop) => stop.terminus),
    ...(all ? rest.filter((stop) => !stop.terminus) : []),
  ];
  const placed = new Map<StationId, Label>();
  const boxes: Box[] = [];
  for (const stop of order) {
    const pill = marked.includes(stop.id) || stop.terminus;
    const sides = [stop.placement, ...SIDES.filter((side) => side !== stop.placement)];
    for (const side of sides) {
      const label = pill ? pillAt(stop.name, side) : haloAt(stop.name, side);
      const left = stop.x / unit + label.x;
      const top = stop.y / unit + label.y;
      const box = { left, top, right: left + label.width, bottom: top + label.height };
      if (boxes.some((other) => overlaps(box, other))) continue;
      boxes.push(box);
      placed.set(stop.id, label);
      break;
    }
  }
  return placed;
}
