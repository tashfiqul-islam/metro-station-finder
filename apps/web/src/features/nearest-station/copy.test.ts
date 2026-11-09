import { expect, test } from "vitest";

import { pickerCopy } from "../station-picker/copy";
import { copy } from "./copy";
import type { NoticeVariants } from "./copy";

/**
 * METRO-120 guard. Scope, exactly: every entry of `features/nearest-station/copy.ts` and of
 * `features/station-picker/copy.ts`. Copy written anywhere else (the shell, the error fallback) is not scanned.
 */
const SEARCH_STEP = "Search for a place instead.";
const PICK_STEP = "Pick a station instead.";

/**
 * Plain strings that may mention search because they are not a suggested next step: the field's own label and
 * hint, the consent line, the two statements that place search is unavailable, and the picker's own name-search
 * texts. A new key that mentions search must be a `{ search, pick }` pair or be added here on purpose.
 */
const MAY_MENTION_SEARCH: Record<string, readonly string[]> = {
  nearest: ["searchLabel", "searchHint", "consent", "searchUnavailable", "searchNoConnection"],
  picker: ["hint", "clear"],
};

type Entry = { source: string; key: string; value: unknown };

/** Realistic argument sets: strings the screen formats, and numbers the picker passes. */
const ARGUMENT_SETS: readonly (readonly unknown[])[] = [
  ["about 25 km", "15 min"],
  [16, 3],
  [1, 16],
];

function expand(source: string, table: Record<string, unknown>): Entry[] {
  return Object.entries(table).flatMap(([key, raw]) => {
    if (!isFunction(raw)) return [{ source, key, value: raw }];
    return ARGUMENT_SETS.map((args) => ({ source, key, value: raw(...args) }));
  });
}

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

const entries: Entry[] = [...expand("nearest", copy), ...expand("picker", pickerCopy)];

function isVariants(value: unknown): value is NoticeVariants {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 2 &&
    "search" in value &&
    typeof value.search === "string" &&
    "pick" in value &&
    typeof value.pick === "string"
  );
}

const variants = entries.flatMap((e) => (isVariants(e.value) ? [{ ...e, value: e.value }] : []));
const plain = entries.flatMap((e) =>
  typeof e.value === "string" ? [{ ...e, value: e.value }] : [],
);

test("METRO-120 guard: every entry is text or a { search, pick } pair, nothing else", () => {
  const odd = entries.filter((e) => typeof e.value !== "string" && !isVariants(e.value));
  expect(odd.map((e) => `${e.source}.${e.key}`)).toEqual([]);
});

test("METRO-120 guard: the notices that name a next step each have a search and a pick variant", () => {
  // The four location notices of METRO-103/113. A new notice with a next step must be a pair, so it joins this
  // list and the guards below; a plain string that suggests a step fails the plain-string guard.
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

test("METRO-120 guard: a plain string mentions search only where it is not a next step", () => {
  const stray = plain.filter(
    (e) => /search/iu.test(e.value) && !(MAY_MENTION_SEARCH[e.source] ?? []).includes(e.key),
  );
  expect(stray.map((e) => `${e.source}.${e.key}: ${e.value}`)).toEqual([]);
  // The field's own label is the one string that is exactly the action's name.
  expect(plain.filter((e) => /search for a place/iu.test(e.value)).map((e) => e.key)).toEqual([
    "searchLabel",
  ]);
  // Any "instead" step in a plain string is the available one.
  const steps = plain.filter((e) => /instead/iu.test(e.value));
  expect(steps.length).toBeGreaterThan(0);
  expect(steps.filter((e) => !e.value.endsWith(PICK_STEP))).toEqual([]);
});

test("METRO-120 guard: the guard itself fails on a stray notice (a mutation check)", () => {
  // A new plain notice that names the search, and a pair with an extra key, must both be caught by the rules.
  const fake: Entry[] = [
    { source: "nearest", key: "newNotice", value: "Something failed. Search for a place instead." },
    { source: "nearest", key: "odd", value: { search: "a", pick: "b", extra: "c" } },
  ];
  const strays = fake.filter(
    (e) =>
      typeof e.value === "string" &&
      /search/iu.test(e.value) &&
      !(MAY_MENTION_SEARCH[e.source] ?? []).includes(e.key),
  );
  expect(strays).toHaveLength(1);
  expect(fake.filter((e) => typeof e.value !== "string" && !isVariants(e.value))).toHaveLength(1);
});
