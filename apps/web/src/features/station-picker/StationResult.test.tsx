import * as Core from "@metro/core";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import type * as Facts from "./station-facts";
import { StationResult } from "./StationResult";

const override = vi.hoisted(() => ({ range: undefined as unknown }));

vi.mock("./station-facts", async (importOriginal) => {
  const actual = await importOriginal<typeof Facts>();
  return {
    ...actual,
    fareRange: (...args: Parameters<typeof actual.fareRange>) =>
      override.range === undefined ? actual.fareRange(...args) : override.range,
  };
});

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  override.range = undefined;
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

const station = (() => {
  const found = Core.baselineDataset.stations[3];
  if (found === undefined) throw new Error("fixture");
  return found;
})();

function show(): void {
  render(<StationResult station={station} headingRef={createRef()} onShowOnMap={vi.fn()} />);
}

test("METRO-112 a station with a single fare value shows it once, with no range", () => {
  override.range = { cheapest: 30, dearest: 30 };
  show();
  const article = screen.getByRole("article");
  expect(article.textContent).toContain("৳30");
  expect(article.textContent).not.toContain("–");
  expect(article.textContent).not.toContain(" to ");
});

test("METRO-112 a station with no known fare says so and shows no amount, but keeps the footnote and the link", () => {
  override.range = null;
  show();
  expect(screen.getByText("No fare is available from this station.")).toBeTruthy();
  expect(screen.getByRole("article").textContent).not.toContain("৳");
  expect(screen.getByText(/^Fares as of: DTCA notice dated 8 September 2022/u)).toBeTruthy();
  expect(screen.getByRole("link", { name: /^Directions in Google Maps/u })).toBeTruthy();
});
