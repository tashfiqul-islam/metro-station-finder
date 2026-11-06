import { stationId } from "../stations/station.ts";
import { createFare } from "./fare.ts";
import { findFare } from "./quote-fare.ts";

describe("findFare", () => {
  const order = [stationId("a"), stationId("b")];
  const table = {
    order,
    amounts: [
      [0, 20],
      [20, 0],
    ],
  };

  test("returns the fare between two known stations", () => {
    expect(findFare(table, stationId("a"), stationId("b"))).toEqual({
      kind: "fare",
      fare: createFare(20),
    });
  });

  test("the same station is an explicit zero fare, distinct from unknown", () => {
    expect(findFare(table, stationId("a"), stationId("a"))).toEqual({
      kind: "fare",
      fare: createFare(0),
    });
  });

  test("an unknown station yields an unknown-fare result that carries no amount", () => {
    for (const [from, to] of [
      ["a", "zzz"],
      ["zzz", "a"],
      ["zzz", "zzz"],
    ] as const) {
      const result = findFare(table, stationId(from), stationId(to));
      expect(result).toEqual({ kind: "unknown-fare", reason: "unknown-station" });
      expect("fare" in result).toBe(false);
    }
  });

  test("a missing or malformed matrix entry is unknown, never zero", () => {
    const missing = findFare({ order, amounts: [[0], []] }, stationId("a"), stationId("b"));
    expect(missing).toEqual({ kind: "unknown-fare", reason: "no-fare-entry" });
    const nan = findFare(
      {
        order,
        amounts: [
          [0, Number.NaN],
          [20, 0],
        ],
      },
      stationId("a"),
      stationId("b"),
    );
    expect(nan).toEqual({ kind: "unknown-fare", reason: "no-fare-entry" });
    const negative = findFare(
      {
        order,
        amounts: [
          [0, 20],
          [-5, 0],
        ],
      },
      stationId("b"),
      stationId("a"),
    );
    expect(negative).toEqual({ kind: "unknown-fare", reason: "no-fare-entry" });
  });

  test("an empty table knows no station", () => {
    expect(findFare({ order: [], amounts: [] }, stationId("a"), stationId("a"))).toEqual({
      kind: "unknown-fare",
      reason: "unknown-station",
    });
  });
});
