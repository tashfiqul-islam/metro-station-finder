import { rankNearest } from "./rank-nearest.ts";
import { stationId } from "./station.ts";
import type { Station } from "./station.ts";

function station(id: string, lat: number, lng: number): Station {
  return { id: stationId(id), name: id, coordinate: { lat, lng }, aliases: [] };
}

const west = station("west", 0, -1);
const east = station("east", 0, 1);
const far = station("far", 10, 10);

describe("rankNearest", () => {
  test("returns the nearest and the distance to the runner-up", () => {
    const result = rankNearest([far, west, east], { lat: 0, lng: 0.9 });
    expect(result?.station.id).toBe(east.id);
    expect(result?.distance).toBeCloseTo(11.119, 2);
    expect(result?.runnerUpDistance).toBeCloseTo(211.3, 0);
  });

  test("the runner-up does not depend on the order of the stations", () => {
    const forward = rankNearest([far, west, east], { lat: 0, lng: 0.9 });
    const reversed = rankNearest([east, west, far], { lat: 0, lng: 0.9 });
    expect(reversed?.runnerUpDistance).toBe(forward?.runnerUpDistance);
    expect(reversed?.station.id).toBe(east.id);
  });

  test("an exact tie keeps the first station and a runner-up at the same distance", () => {
    const result = rankNearest([west, east], { lat: 0, lng: 0 });
    expect(result?.station.id).toBe(west.id);
    expect(result?.runnerUpDistance).toBe(result?.distance);
  });

  test("one station has an infinite runner-up distance", () => {
    expect(rankNearest([west], { lat: 0, lng: 0 })?.runnerUpDistance).toBe(Infinity);
  });

  test("skips non-finite distances, and returns undefined when none is finite", () => {
    const broken = station("broken", Number.NaN, 0);
    expect(rankNearest([broken, west], { lat: 0, lng: 0 })?.station.id).toBe(west.id);
    expect(rankNearest([broken], { lat: 0, lng: 0 })).toBeUndefined();
    expect(rankNearest([], { lat: 0, lng: 0 })).toBeUndefined();
  });
});
