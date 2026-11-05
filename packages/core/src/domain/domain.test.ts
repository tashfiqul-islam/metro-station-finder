import { describe, expect, test } from "bun:test";

import {
  createFare,
  geographicDistanceKm,
  isStationId,
  parseCoordinate,
  stationId,
  walkingDistanceMeters,
  type Coordinate,
  type Fare,
  type GeographicDistanceKm,
  type Station,
  type WalkingDistanceMeters,
} from "./index.ts";

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

describe("distances", () => {
  const origin: Coordinate = { lat: 0, lng: 0 };

  test("geographic distance is Haversine kilometres on a 6371 km sphere", () => {
    expect(Number(geographicDistanceKm(origin, origin))).toBe(0);
    expect(geographicDistanceKm(origin, { lat: 1, lng: 0 })).toBeCloseTo(111.19492664, 6);
    const a = { lat: 23.869076247909604, lng: 90.36749888965423 };
    const b = { lat: 23.728141228055236, lng: 90.41934126299398 };
    expect(geographicDistanceKm(a, b)).toBe(geographicDistanceKm(b, a));
  });

  test("near-antipodal points give a finite distance of about half the circumference", () => {
    const pairs: [Coordinate, Coordinate][] = [
      [
        { lat: -54.78937689394159, lng: 130.19944470249817 },
        { lat: 54.78937689394159, lng: -49.80055529750183 },
      ],
      [
        { lat: 2.2212046529304104, lng: 161.04264590176962 },
        { lat: -2.2212046529304104, lng: -18.957354098230383 },
      ],
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 180 },
      ],
    ];
    for (const [a, b] of pairs) {
      const km = Number(geographicDistanceKm(a, b));
      expect(Number.isFinite(km)).toBe(true);
      expect(km).toBeCloseTo(Math.PI * 6371, 3);
    }
  });

  test("geographic and walking distance are separate, non-interchangeable types", () => {
    const geographic: GeographicDistanceKm = geographicDistanceKm(origin, { lat: 0, lng: 1 });
    const walking: WalkingDistanceMeters = walkingDistanceMeters(1200);
    // @ts-expect-error a walking distance is not a geographic distance
    const wrongGeographic: GeographicDistanceKm = walking;
    // @ts-expect-error a geographic distance is not a walking distance
    const wrongWalking: WalkingDistanceMeters = geographic;
    // @ts-expect-error a bare number is neither
    const bare: GeographicDistanceKm = 5;
    expect([wrongGeographic, wrongWalking, bare]).toHaveLength(3);
  });

  test("walking distance must be a finite non-negative number of metres", () => {
    expect(Number(walkingDistanceMeters(0))).toBe(0);
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => walkingDistanceMeters(bad)).toThrow(RangeError);
  });
});

describe("StationId", () => {
  test("is a lowercase ASCII kebab-case slug", () => {
    for (const ok of ["pallabi", "mirpur-11", "bangladesh-secretariat"]) {
      expect(isStationId(ok)).toBe(true);
      expect(String(stationId(ok))).toBe(ok);
    }
  });

  test("rejects empty, mixed-case, spaced, padded and non-string values", () => {
    for (const bad of ["", "Mirpur 11", "mirpur_11", "-a", "a-", "a--b", " a", "ঢাকা", 11, null])
      expect(isStationId(bad)).toBe(false);
    expect(() => stationId("Mirpur 11")).toThrow(RangeError);
  });

  test("a plain string is not assignable to StationId", () => {
    const station: Station = {
      id: stationId("pallabi"),
      name: "Pallabi",
      coordinate: { lat: 23.8, lng: 90.3 },
      aliases: [],
    };
    // @ts-expect-error unbranded string
    const bad: Station = { ...station, id: "pallabi" };
    expect(bad.id).toBe(station.id);
  });
});

describe("Fare", () => {
  test("is an amount in BDT; zero is a legitimate, explicit fare", () => {
    const zero: Fare = createFare(0);
    expect(zero).toEqual({ amount: 0, currency: "BDT" });
    expect(createFare(100).amount).toBe(100);
  });

  test("rejects negative and non-finite amounts", () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => createFare(bad)).toThrow(RangeError);
  });
});
