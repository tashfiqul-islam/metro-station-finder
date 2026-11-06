import { parseCoordinate } from "./coordinate.ts";

describe("Coordinate", () => {
  test("accepts finite WGS84-range degrees including the exact limits", () => {
    expect(parseCoordinate(23.8103, 90.4125)).toEqual({
      ok: true,
      coordinate: { lat: 23.8103, lng: 90.4125 },
    });
    for (const [lat, lng] of [
      [90, 180],
      [-90, -180],
      [0, 0],
    ] as const)
      expect(parseCoordinate(lat, lng).ok).toBe(true);
  });

  test("rejects non-numbers, NaN and infinities with a reason", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, "23.8", null, undefined])
      expect(parseCoordinate(bad, 90)).toEqual({ ok: false, reason: "not-finite-number" });
    expect(parseCoordinate(23, Number.NEGATIVE_INFINITY)).toEqual({
      ok: false,
      reason: "not-finite-number",
    });
  });

  test("rejects out-of-range latitude and longitude", () => {
    expect(parseCoordinate(90.0001, 0)).toEqual({ ok: false, reason: "latitude-out-of-range" });
    expect(parseCoordinate(-91, 0)).toEqual({ ok: false, reason: "latitude-out-of-range" });
    expect(parseCoordinate(0, 180.0001)).toEqual({ ok: false, reason: "longitude-out-of-range" });
    expect(parseCoordinate(0, -181)).toEqual({ ok: false, reason: "longitude-out-of-range" });
  });
});
