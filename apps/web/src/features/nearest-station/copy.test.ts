import { expect, test } from "vitest";

import { copy } from "./copy";
import type { NoticeVariants } from "./copy";

const SEARCH_STEP = "Search for a place instead.";
const PICK_STEP = "Pick a station instead.";

function isVariants(value: unknown): value is NoticeVariants {
  return typeof value === "object" && value !== null && "search" in value && "pick" in value;
}

/** Every entry of copy that is text: functions are called with sample arguments. */
function texts(): { key: string; value: unknown }[] {
  return Object.entries(copy).map(([key, raw]) => ({
    key,
    value:
      typeof raw === "function"
        ? (raw as (...a: string[]) => unknown)("about 25 km", "15 min")
        : raw,
  }));
}

const variants = texts().flatMap(({ key, value }) => (isVariants(value) ? [{ key, value }] : []));
const plain = texts().flatMap(({ key, value }) =>
  typeof value === "string" ? [{ key, value }] : [],
);

test("METRO-120 guard: the notices that name a next step each have a search and a pick variant", () => {
  // The four location notices of METRO-103/113. A new notice with a next step must be a variants object, so it
  // joins this list and the guards below; a plain string with an "instead" step fails the third guard.
  expect(new Set(variants.map((e) => e.key))).toEqual(
    new Set(["denied", "roughKnown", "roughUnknown", "unavailable"]),
  );
  for (const { key, value } of variants) {
    expect(value.search, key).toMatch(/Search for a place instead\.$/u);
    expect(value.pick, key).toMatch(/Pick a station instead\.$/u);
    // The reason before the step is the same in both: only the last sentence differs.
    expect(value.pick.slice(0, -PICK_STEP.length), key).toBe(
      value.search.slice(0, -SEARCH_STEP.length),
    );
  }
});

test("METRO-120 guard: no pick variant names a search action", () => {
  for (const { key, value } of variants) {
    expect(value.pick, key).not.toMatch(/search/iu);
  }
});

test("METRO-120 guard: a plain string names the search only as the field's own label, and any step is the available one", () => {
  const naming = plain.filter((e) => /search for a place/iu.test(e.value));
  expect(naming.map((e) => e.value)).toEqual([copy.searchLabel]);
  const steps = plain.filter((e) => /instead/iu.test(e.value));
  expect(steps.length).toBeGreaterThan(0);
  expect(steps.filter((e) => !e.value.endsWith(PICK_STEP))).toEqual([]);
});
