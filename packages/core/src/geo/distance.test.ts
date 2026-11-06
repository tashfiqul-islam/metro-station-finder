import type { Coordinate } from "./coordinate.ts";
import { geographicDistanceKm, walkingDistanceMeters } from "./distance.ts";
import type { GeographicDistanceKm, WalkingDistanceMeters } from "./distance.ts";

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
