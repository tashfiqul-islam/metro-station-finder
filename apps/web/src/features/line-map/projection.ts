import { baselineDataset } from "@metro/core";
import type { Coordinate, Station, StationId } from "@metro/core";

/** The fixed design canvas (docs/design/handoff/handoff.md, Map). */
export const VIEW_WIDTH = 710;
export const VIEW_HEIGHT = 1055;
/** The fit-all view: the whole line with room for labels. */
export const FIT_VIEW = { x: 100, y: 70, width: 470, height: 880 } as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Equirectangular projection into the 710 x 1055 canvas. x and y scales differ by cos(23.8 degrees). */
export function project({ lat, lng }: Coordinate): Point {
  return {
    x: ((lng - 90.33) / 0.14) * VIEW_WIDTH,
    y: ((23.89 - lat) / 0.19) * VIEW_HEIGHT,
  };
}

/** The design's precision: one decimal. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Where a label sits against its pin; the default is to the right. */
type Placement = "right" | "left" | "below";

export interface LineStop extends Point {
  readonly id: StationId;
  readonly name: string;
  readonly terminus: boolean;
  readonly placement: Placement;
}

/** The two stops at the line's south end whose right-hand label would cross the line or leave the canvas. */
const PLACEMENT: Readonly<Record<string, Placement>> = {
  "dhaka-university": "left",
  "bangladesh-secretariat": "below",
};

function stop(station: Station, index: number, last: number): LineStop {
  return {
    id: station.id,
    name: station.name,
    ...project(station.coordinate),
    terminus: index === 0 || index === last,
    placement: PLACEMENT[station.id] ?? "right",
  };
}

/** The line's stops in order, projected from the core dataset (no copied coordinates). */
export function lineStops(): readonly LineStop[] {
  const { stations } = baselineDataset;
  return stations.map((station, index) => stop(station, index, stations.length - 1));
}
