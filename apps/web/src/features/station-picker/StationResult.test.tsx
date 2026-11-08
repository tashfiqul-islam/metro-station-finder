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

test("METRO-112 a station with no known fare shows no amount and no fare footnote, but keeps the heading and the link", () => {
  override.range = null;
  show();
  expect(screen.getByRole("heading", { level: 2, name: station.name })).toBeTruthy();
  expect(screen.getByRole("article").textContent).not.toContain("৳");
  expect(screen.queryByText(/^Fares as of:/u)).toBeNull();
  expect(screen.queryByText("Single fare from here")).toBeNull();
  expect(screen.getByRole("link", { name: /^Directions in Google Maps/u })).toBeTruthy();
});
