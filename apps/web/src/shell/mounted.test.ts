import { expect, test } from "vitest";

import { mounted } from "./mounted";

test("METRO-126 mounted returns the attached element", () => {
  const element = document.createElement("div");
  expect(mounted({ current: element })).toBe(element);
});

test("METRO-126 mounted fails visibly when the element is not attached", () => {
  expect(() => mounted({ current: null })).toThrow("AppShell is not mounted");
});
