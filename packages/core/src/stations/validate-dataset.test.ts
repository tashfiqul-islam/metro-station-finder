import { baselineDataset } from "./dataset.ts";
import { validateDataset, type StationDataset } from "./validate-dataset.ts";

const base = baselineDataset;

function problems(dataset: StationDataset): readonly string[] {
  const result = validateDataset(dataset);
  return result.ok ? [] : result.problems;
}

function withStations(stations: StationDataset["stations"]): StationDataset {
  return { ...base, stations };
}

function withAmounts(amounts: StationDataset["fares"]["amounts"]): StationDataset {
  return { ...base, fares: { ...base.fares, amounts } };
}

function edit(i: number, j: number, value: number): StationDataset["fares"]["amounts"] {
  return base.fares.amounts.map((row, r) =>
    r === i ? row.map((v, c) => (c === j ? value : v)) : row,
  );
}

describe("validateDataset", () => {
  test("accepts the baseline dataset", () => {
    expect(validateDataset(base)).toEqual({ ok: true });
  });

  test("rejects a duplicate station id", () => {
    const [first, second, ...rest] = base.stations;
    if (!first || !second) throw new Error("fixture");
    const result = problems(withStations([first, { ...second, id: first.id }, ...rest]));
    expect(result.some((p) => p.includes("duplicate station id"))).toBe(true);
  });

  test("rejects an alias that collides with another station's name or alias", () => {
    const [first, second, ...rest] = base.stations;
    if (!first || !second) throw new Error("fixture");
    const byName = problems(withStations([first, { ...second, aliases: [first.name] }, ...rest]));
    expect(byName.some((p) => p.includes("duplicate label"))).toBe(true);
    const byAlias = problems(
      withStations([
        { ...first, aliases: ["Shared"] },
        { ...second, aliases: ["Shared"] },
        ...rest,
      ]),
    );
    expect(byAlias.some((p) => p.includes("duplicate label"))).toBe(true);
  });

  test("rejects a fare order that differs from the station list", () => {
    const rotated = [...base.fares.order.slice(1), ...base.fares.order.slice(0, 1)];
    const result = problems({ ...base, fares: { ...base.fares, order: rotated } });
    expect(result.some((p) => p.includes("fare order"))).toBe(true);
  });

  test("rejects ragged and non-square matrices", () => {
    const ragged = base.fares.amounts.map((row, i) => (i === 3 ? row.slice(1) : row));
    expect(problems(withAmounts(ragged)).some((p) => p.includes("square"))).toBe(true);
    expect(
      problems(withAmounts(base.fares.amounts.slice(1))).some((p) => p.includes("square")),
    ).toBe(true);
  });

  test("rejects a non-zero diagonal and non-finite or negative cells", () => {
    expect(problems(withAmounts(edit(2, 2, 20))).some((p) => p.includes("diagonal"))).toBe(true);
    expect(problems(withAmounts(edit(0, 1, Number.NaN))).some((p) => p.includes("cell"))).toBe(
      true,
    );
    expect(problems(withAmounts(edit(0, 1, -20))).some((p) => p.includes("cell"))).toBe(true);
  });
});
