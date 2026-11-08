import { assessNearestReliability } from "./nearest-reliability.ts";
import { stationId } from "./station.ts";
import type { Station } from "./station.ts";

function station(id: string, lat: number, lng: number): Station {
  return { id: stationId(id), name: id, coordinate: { lat, lng }, aliases: [] };
}

// 0.01 degree of longitude on the equator is about 1,112 m.
const west = station("west", 0, -0.01);
const east = station("east", 0, 0.01);
const origin = { lat: 0, lng: 0.004 };
const ambiguous = { kind: "uncertain", reason: "ambiguous" } as const;

describe("assessNearestReliability", () => {
  test("a clear gap and a small radius is reliable", () => {
    // Nearest about 667 m, runner-up about 1,557 m: gap about 890 m.
    expect(assessNearestReliability([west, east], origin, 20)).toEqual({ kind: "reliable" });
  });

  test("a radius of zero is reliable when the gap is positive", () => {
    expect(assessNearestReliability([west, east], origin, 0)).toEqual({ kind: "reliable" });
  });

  test("a radius larger than half the gap is uncertain", () => {
    expect(assessNearestReliability([west, east], origin, 500)).toEqual(ambiguous);
  });

  test("a huge radius is uncertain", () => {
    expect(assessNearestReliability([west, east], origin, 25_000)).toEqual(ambiguous);
  });

  test("the threshold is the gap over two: just under is reliable, just over is uncertain", () => {
    // Gap for origin lng 0.004 is 2 * 0.004 degrees of longitude, about 889.6 m, so the threshold r is 444.8 m.
    expect(assessNearestReliability([west, east], origin, 440).kind).toBe("reliable");
    expect(assessNearestReliability([west, east], origin, 450)).toEqual(ambiguous);
  });

  test("an exact tie is uncertain even with a radius of zero", () => {
    expect(assessNearestReliability([west, east], { lat: 0, lng: 0 }, 0)).toEqual(ambiguous);
  });

  test("an undefined accuracy is unknown", () => {
    expect(assessNearestReliability([west, east], origin).kind).toBe("uncertain");
  });

  test("a NaN, infinite or negative radius is unknown", () => {
    for (const accuracy of [Number.NaN, Infinity, -Infinity, -1]) {
      expect(assessNearestReliability([west, east], origin, accuracy)).toEqual({
        kind: "uncertain",
        reason: "accuracy-unknown",
      });
    }
  });

  test("one station has no runner-up and is reliable once the radius is known", () => {
    expect(assessNearestReliability([west], origin, 25_000)).toEqual({ kind: "reliable" });
    expect(assessNearestReliability([west], origin).kind).toBe("uncertain");
  });

  test("the order of the stations does not matter, and the runner-up tracks later stations", () => {
    const far = station("far", 0, 1);
    expect(assessNearestReliability([far, east, west], origin, 20)).toEqual({ kind: "reliable" });
    expect(assessNearestReliability([west, east, far], origin, 20)).toEqual({ kind: "reliable" });
    // The runner-up improves from far to east without changing the nearest.
    expect(assessNearestReliability([west, far, east], { lat: 0, lng: -0.009 }, 20)).toEqual({
      kind: "reliable",
    });
  });

  test("two stations at the same place are a tie", () => {
    const twin = station("twin", 0, 0.01);
    expect(assessNearestReliability([east, twin], origin, 0)).toEqual(ambiguous);
  });

  test("an invalid origin or no station is no-nearest", () => {
    expect(assessNearestReliability([west, east], { lat: Number.NaN, lng: 0 }, 10)).toEqual({
      kind: "uncertain",
      reason: "no-nearest",
    });
    expect(assessNearestReliability([], origin, 10)).toEqual({
      kind: "uncertain",
      reason: "no-nearest",
    });
  });

  test("a station with a non-finite distance is skipped", () => {
    const broken = station("broken", Number.NaN, 0);
    expect(assessNearestReliability([broken, west, east], origin, 20)).toEqual({
      kind: "reliable",
    });
    expect(assessNearestReliability([broken], origin, 20).kind).toBe("uncertain");
  });
});
