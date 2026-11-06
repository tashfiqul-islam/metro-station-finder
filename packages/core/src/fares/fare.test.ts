import { createFare } from "./fare.ts";
import type { Fare } from "./fare.ts";

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
