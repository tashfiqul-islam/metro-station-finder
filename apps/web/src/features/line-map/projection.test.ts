import { expect, test } from "vitest";

import { FIT_VIEW, VIEW_HEIGHT, VIEW_WIDTH, lineStops, project, round1 } from "./projection";

/** The handoff's table (docs/design/handoff/handoff.md, Map), rounded to one decimal in the design. */
const HANDOFF: readonly (readonly [string, number, number])[] = [
  ["Uttara North", 190.2, 116.2],
  ["Uttara Center", 180.4, 167.2],
  ["Uttara South", 169.8, 244],
  ["Pallabi", 175.6, 351.9],
  ["Mirpur 11", 181, 391.5],
  ["Mirpur 10", 194.2, 451.6],
  ["Kazipara", 211.9, 499.9],
  ["Shewrapara", 231.9, 551.2],
  ["Agargaon", 254.1, 619],
  // Bijoy Sarani: the handoff predates the METRO-67 coordinate correction (its y there is 679.2).
  ["Bijoy Sarani", 269.3, 686.3],
  ["Farmgate", 290.2, 725.5],
  ["Karwan Bazar", 319.4, 769.9],
  ["Shahbag", 335.2, 834.6],
  ["Dhaka University", 337.8, 877.2],
  ["Bangladesh Secretariat", 388.9, 887.8],
  ["Motijheel", 453.1, 898.7],
];

test("the view box constants are the handoff's", () => {
  expect([VIEW_WIDTH, VIEW_HEIGHT]).toEqual([710, 1055]);
  expect(FIT_VIEW).toEqual({ x: 100, y: 70, width: 470, height: 880 });
});

test("project is the equirectangular formula of the handoff", () => {
  expect(project({ lat: 23.89, lng: 90.33 })).toEqual({ x: 0, y: 0 });
  const corner = project({ lat: 23.7, lng: 90.47 });
  expect(corner.x).toBeCloseTo(710, 6);
  expect(corner.y).toBeCloseTo(1055, 6);
});

test("round1 rounds to one decimal", () => {
  expect(round1(190.24)).toBe(190.2);
  expect(round1(190.26)).toBe(190.3);
});

test("the 16 line stops come from the core dataset in order and match the handoff coordinates", () => {
  const stops = lineStops();
  expect(stops).toHaveLength(HANDOFF.length);
  stops.forEach((stop, index) => {
    const [name, x, y] = HANDOFF[index] ?? ["", 0, 0];
    expect(stop.name).toBe(name);
    expect(Math.abs(stop.x - x)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(stop.y - y)).toBeLessThanOrEqual(0.06);
  });
});

test("only the first and last stops are termini; two stops sit away from the right-hand default", () => {
  const stops = lineStops();
  expect(stops.filter((stop) => stop.terminus).map((stop) => stop.name)).toEqual([
    "Uttara North",
    "Motijheel",
  ]);
  const placed = stops.filter((stop) => stop.placement !== "right");
  expect(placed.map((stop) => [stop.name, stop.placement])).toEqual([
    ["Dhaka University", "left"],
    ["Bangladesh Secretariat", "below"],
  ]);
});
