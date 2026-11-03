import { expect, test } from "bun:test";

import { isRecord } from "./guards";

test("isRecord accepts plain objects only", () => {
  expect(isRecord({})).toBe(true);
  expect(isRecord({ a: 1 })).toBe(true);
  for (const value of [null, undefined, [], [1], "x", 1, true]) expect(isRecord(value)).toBe(false);
});
