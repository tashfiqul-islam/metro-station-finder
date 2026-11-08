import { expect, test } from "vitest";

import {
  clampHeight,
  cycleSnap,
  keySnap,
  largerSnap,
  nearestSnap,
  smallerSnap,
  snapHeights,
} from "./sheet";

test("METRO-105 snap heights follow the handoff: 196px, 58 percent, viewport minus 148px", () => {
  expect(snapHeights(844)).toEqual({ peek: 196, half: 490, full: 696 });
});

test("METRO-105 a very short viewport never makes full smaller than peek", () => {
  expect(snapHeights(300).full).toBe(196);
});

test("METRO-105 a drag is clamped between 120px and full", () => {
  expect(clampHeight(10, 844)).toBe(120);
  expect(clampHeight(400, 844)).toBe(400);
  expect(clampHeight(5000, 844)).toBe(696);
});

test("METRO-105 release snaps to the nearest of the three heights", () => {
  expect(nearestSnap(120, 844)).toBe("peek");
  expect(nearestSnap(400, 844)).toBe("half");
  expect(nearestSnap(600, 844)).toBe("full");
  expect(nearestSnap(696, 844)).toBe("full");
  expect(nearestSnap(343, 844)).toBe("peek");
  expect(nearestSnap(344, 844)).toBe("half");
});

test("METRO-105 tapping the grip cycles peek, half, full, peek", () => {
  expect(cycleSnap("peek")).toBe("half");
  expect(cycleSnap("half")).toBe("full");
  expect(cycleSnap("full")).toBe("peek");
});

test("METRO-105 larger and smaller stop at the ends", () => {
  expect(largerSnap("peek")).toBe("half");
  expect(largerSnap("half")).toBe("full");
  expect(largerSnap("full")).toBe("full");
  expect(smallerSnap("full")).toBe("half");
  expect(smallerSnap("half")).toBe("peek");
  expect(smallerSnap("peek")).toBe("peek");
});

test("METRO-105 ArrowUp enlarges, ArrowDown shrinks, other keys do nothing", () => {
  expect(keySnap("ArrowUp", "half")).toBe("full");
  expect(keySnap("ArrowDown", "half")).toBe("peek");
  expect(keySnap("Enter", "half")).toBeNull();
  expect(keySnap("ArrowLeft", "half")).toBeNull();
});

test("METRO-105 without a section nav the full sheet is taller by the reserve of the bar", () => {
  expect(snapHeights(844, true).full).toBe(696);
  expect(snapHeights(844, false).full).toBe(772);
  expect(snapHeights(844, false).half).toBe(490);
  expect(clampHeight(5000, 844, false)).toBe(772);
  expect(clampHeight(5000, 844, true)).toBe(696);
  expect(nearestSnap(750, 844, false)).toBe("full");
  expect(nearestSnap(630, 844, false)).toBe("half");
  expect(nearestSnap(630, 844, true)).toBe("full");
});
