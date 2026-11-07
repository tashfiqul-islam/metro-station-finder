import { expect, test } from "vitest";

import { fakePosition, fakePositionError } from "./geolocation-fakes";

test("METRO-88 the fake position carries the coordinate and serialises", () => {
  const position = fakePosition(1.5, 2.5);
  expect(position.coords.latitude).toBe(1.5);
  expect(position.coords.longitude).toBe(2.5);
  expect(position.toJSON()).toEqual({});
  expect(position.coords.toJSON()).toEqual({});
});

test("METRO-88 the fake error carries its code and the spec constants", () => {
  const error = fakePositionError(3);
  expect(error.code).toBe(3);
  expect([error.PERMISSION_DENIED, error.POSITION_UNAVAILABLE, error.TIMEOUT]).toEqual([1, 2, 3]);
});
