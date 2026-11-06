import { expect, test } from "vitest";

import { formatIsoDate, formatKm, formatMinutes, formatWalkingDistance } from "./format";

test("METRO-88 straight-line distance is kilometres with two decimals", () => {
  expect(formatKm(2.3149)).toBe("2.31 km");
  expect(formatKm(0)).toBe("0.00 km");
});

test("METRO-88 walking distance is metres under 1 km and kilometres from 1 km", () => {
  expect(formatWalkingDistance(999.4)).toBe("999 m");
  expect(formatWalkingDistance(1000)).toBe("1.00 km");
  expect(formatWalkingDistance(1234)).toBe("1.23 km");
});

test("METRO-88 duration is whole minutes and never less than one", () => {
  expect(formatMinutes(900)).toBe("15 min");
  expect(formatMinutes(10)).toBe("1 min");
  expect(formatMinutes(0)).toBe("1 min");
});

test("METRO-88 ISO dates read as day month year without a time zone shift", () => {
  expect(formatIsoDate("2022-09-08")).toBe("8 September 2022");
  expect(formatIsoDate("2026-11-05")).toBe("5 November 2026");
  expect(formatIsoDate("2026-12-31")).toBe("31 December 2026");
});

test("METRO-88 a walking distance that rounds to 1000 m reads 1.00 km, never 1000 m", () => {
  expect(formatWalkingDistance(999.4)).toBe("999 m");
  expect(formatWalkingDistance(999.5)).toBe("1.00 km");
  expect(formatWalkingDistance(1000)).toBe("1.00 km");
});
