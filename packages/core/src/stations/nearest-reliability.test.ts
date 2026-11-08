import { geographicDistanceKm } from "../geo/distance.ts";
import { GOOD_FIX_METERS, assessNearestReliability } from "./nearest-reliability.ts";
import { stationId } from "./station.ts";
import type { Station } from "./station.ts";

function station(id: string, lat: number, lng: number): Station {
  return { id: stationId(id), name: id, coordinate: { lat, lng }, aliases: [] };
}

// 0.01 degree of longitude on the equator is about 1,112 m.
const west = station("west", 0, -0.01);
const east = station("east", 0, 0.01);
const origin = { lat: 0, lng: 0.004 };
const bisector = { lat: 0, lng: 0 };
const ambiguous = { kind: "uncertain", reason: "ambiguous" } as const;
const reliable = { kind: "reliable" } as const;

describe("assessNearestReliability", () => {
  test("the good-fix constant is 100 m", () => {
    expect(GOOD_FIX_METERS).toBe(100);
  });

  test("a clear gap and a small radius is reliable", () => {
    expect(assessNearestReliability([west, east], origin, 20)).toEqual(reliable);
  });

  test("a radius of zero is reliable, even on an exact tie (the first station wins)", () => {
    expect(assessNearestReliability([west, east], origin, 0)).toEqual(reliable);
    expect(assessNearestReliability([west, east], bisector, 0)).toEqual(reliable);
  });

  test("a GPS-grade fix near the bisector is reliable", () => {
    expect(assessNearestReliability([west, east], { lat: 0, lng: 0.0001 }, 30)).toEqual(reliable);
  });

  test("the good-fix boundary: 100 m is reliable on a tie, 100.01 m is not", () => {
    expect(assessNearestReliability([west, east], bisector, 100)).toEqual(reliable);
    expect(assessNearestReliability([west, east], bisector, 100.01)).toEqual(ambiguous);
  });

  test("above the good-fix limit a clear gap is still reliable", () => {
    expect(assessNearestReliability([west, east], origin, 100.01)).toEqual(reliable);
  });

  test("above the good-fix limit the 2r rule applies: just under is reliable, just over is not", () => {
    // Gap at origin lng 0.004 is about 889.6 m, so the threshold r is about 444.8 m.
    expect(assessNearestReliability([west, east], origin, 440)).toEqual(reliable);
    expect(assessNearestReliability([west, east], origin, 450)).toEqual(ambiguous);
  });

  test("a gap of exactly 2r is uncertain", () => {
    const gapMeters =
      (geographicDistanceKm(origin, west.coordinate) -
        geographicDistanceKm(origin, east.coordinate)) *
      1000;
    expect(assessNearestReliability([west, east], origin, gapMeters / 2)).toEqual(ambiguous);
    expect(assessNearestReliability([west, east], origin, gapMeters / 2 - 0.001)).toEqual(reliable);
  });

  test("a huge radius is uncertain, including the largest finite number", () => {
    expect(assessNearestReliability([west, east], origin, 25_000)).toEqual(ambiguous);
    expect(assessNearestReliability([west, east], origin, 1e308)).toEqual(ambiguous);
    expect(assessNearestReliability([west, east], origin, Number.MAX_VALUE)).toEqual(ambiguous);
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
    expect(assessNearestReliability([west], origin, 25_000)).toEqual(reliable);
    expect(assessNearestReliability([west], origin).kind).toBe("uncertain");
  });

  test("the order of the stations does not matter", () => {
    const far = station("far", 0, 1);
    expect(assessNearestReliability([far, east, west], origin, 150)).toEqual(reliable);
    expect(assessNearestReliability([west, east, far], origin, 150)).toEqual(reliable);
    expect(assessNearestReliability([west, far, east], { lat: 0, lng: -0.009 }, 150)).toEqual(
      reliable,
    );
  });

  test("two stations at the same place are a tie above the good-fix limit", () => {
    const twin = station("twin", 0, 0.01);
    expect(assessNearestReliability([east, twin], origin, 150)).toEqual(ambiguous);
  });

  test("an invalid origin or no station is no-nearest, after the accuracy check", () => {
    const noNearest = { kind: "uncertain", reason: "no-nearest" } as const;
    expect(assessNearestReliability([west, east], { lat: Number.NaN, lng: 0 }, 10)).toEqual(
      noNearest,
    );
    expect(assessNearestReliability([], origin, 10)).toEqual(noNearest);
    // The accuracy is judged first, so an unknown accuracy wins over an invalid origin.
    expect(assessNearestReliability([west, east], { lat: Number.NaN, lng: 0 })).toMatchObject({
      reason: "accuracy-unknown",
    });
  });

  test("a station with a non-finite distance is skipped", () => {
    const broken = station("broken", Number.NaN, 0);
    expect(assessNearestReliability([broken, west, east], origin, 20)).toEqual(reliable);
    expect(assessNearestReliability([broken], origin, 20).kind).toBe("uncertain");
  });
});
