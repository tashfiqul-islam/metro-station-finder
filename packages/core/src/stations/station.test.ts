import { isStationId, stationId } from "./station.ts";
import type { Station } from "./station.ts";

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
