import { expect, test } from "bun:test";

import * as core from "./index.ts";

test("the package entry exposes the scaffold, domain, lookups and the baseline dataset", () => {
  expect(core.getScaffoldStatus().ready).toBe(true);
  expect(core.baselineDataset.stations).toHaveLength(16);
  expect(
    core.findNearestStation(core.baselineDataset.stations, { lat: 23.73, lng: 90.4 }).kind,
  ).toBe("nearest");
  expect(core.parseCoordinate(0, 0).ok).toBe(true);
  expect(core.createFare(20).currency).toBe("BDT");
  expect(core.isStationId("pallabi")).toBe(true);
});
