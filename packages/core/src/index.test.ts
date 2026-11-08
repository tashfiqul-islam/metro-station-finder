import * as core from "./index.ts";

test("the package entry exposes the domain, lookups and the baseline dataset", () => {
  expect(core.baselineDataset.stations).toHaveLength(16);
  expect(
    core.findNearestStation(core.baselineDataset.stations, { lat: 23.73, lng: 90.4 }).kind,
  ).toBe("nearest");
  expect(core.parseCoordinate(0, 0).ok).toBe(true);
  expect(core.createFare(20).currency).toBe("BDT");
  expect(core.isStationId("pallabi")).toBe(true);
});

test("the package entry exposes the dataset provenance for the fare notice and last-checked dates", () => {
  expect(core.datasetProvenance.fares.noticeDate).toBe("2022-09-08");
  expect(core.datasetProvenance.fares.officialTableRetrieved).toBe("2026-11-05");
});

test("the exported dataset provenance is frozen at every level", () => {
  const { fares, operator, coordinates } = core.datasetProvenance;
  for (const value of [core.datasetProvenance, fares, operator, coordinates, coordinates.sources]) {
    expect(Object.isFrozen(value)).toBe(true);
  }
  expect(() => {
    Object.defineProperty(fares, "noticeDate", { value: "1999-01-01" });
  }).toThrow(TypeError);
  expect(fares.noticeDate).toBe("2022-09-08");
});
