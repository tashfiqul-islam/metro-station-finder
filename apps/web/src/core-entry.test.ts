import { baselineDataset, validateDataset } from "@metro/core";
import { expect, test } from "vitest";

// METRO-89 (ADR-0018): the browser app runs core through its public entry. This proves, in the web
// test environment, that the workspace link resolves `@metro/core` and its dataset runs there.
test("METRO-89 web resolves and runs @metro/core through its public entry", () => {
  expect(validateDataset(baselineDataset)).toEqual({ ok: true });
});
