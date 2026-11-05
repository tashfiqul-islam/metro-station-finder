import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseScenarios, parseTriggerTable, readSet, sorted } from "./routing.ts";

const root = resolve(import.meta.dir, "..");
const read = (file: string) => readFile(join(root, file), "utf8");

/** Trigger-row needles each METRO-8 scenario touches; the expected read sets come from the evidence file. */
const SCENARIOS: Record<string, string[]> = {
  "Add geocoding request validation/provider error contract": [
    "Package, import",
    "API, external",
    "Secrets, location",
    "Behavior, bug",
  ],
  "Fix keyboard focus/error rendering without provider changes": [
    "UI, interaction",
    "Behavior, bug",
  ],
  "Fix nearest-station calculation without UI/provider/log changes": ["Behavior, bug"],
  "Update map-provider dependency": [
    "Tool, dependency",
    "Package, import",
    "API, external",
    "Secrets, location",
    "Behavior, bug",
    "UI, interaction",
  ],
  "Release checked revision without product changes": ["Tool, dependency"],
};

test("METRO-51 parseTriggerTable reads trigger text and linked agent guides", () => {
  const table = parseTriggerTable(
    [
      "intro",
      "| Trigger | Additional read set |",
      "| --- | --- |",
      "| A thing | [One](docs/agents/one.md); [Other](docs/product/x.md) |",
      "| B thing | [Two](docs/agents/two.md) and [Three](docs/agents/three.md) |",
      "",
      "| Trigger | Ignored |",
    ].join("\n"),
  );
  expect(table).toEqual([
    { trigger: "A thing", guides: ["one"] },
    { trigger: "B thing", guides: ["two", "three"] },
  ]);
});

test("METRO-51 readSet unions and sorts guides and rejects an unknown trigger", () => {
  const table = [
    { trigger: "A thing", guides: ["b"] },
    { trigger: "B thing", guides: ["b", "a"] },
  ];
  expect(readSet(table, ["A thing", "B thing"])).toEqual(["a", "b"]);
  expect(() => readSet(table, ["C thing"])).toThrow('no trigger row contains "C thing"');
});

test("METRO-51 parseScenarios reads names and sorted read sets", () => {
  const scenarios = parseScenarios(
    "| Scenario | Additional read set | Other |\n| --- | --- | --- |\n| S1 | b, a | x |\n\nafter",
  );
  expect([...scenarios]).toEqual([["S1", ["a", "b"]]]);
});

test("METRO-51 AGENTS.md routes every recorded METRO-8 scenario to its expected read set", async () => {
  const table = parseTriggerTable(await read("AGENTS.md"));
  const expected = parseScenarios(await read("docs/evidence/metro-8.md"));
  expect(sorted([...expected.keys()])).toEqual(sorted(Object.keys(SCENARIOS)));
  for (const [name, needles] of Object.entries(SCENARIOS)) {
    expect({ name, set: readSet(table, needles) }).toEqual({ name, set: expected.get(name) ?? [] });
  }
});

test("METRO-51 every guide the trigger table links exists and nothing in docs/agents is orphaned from routing", async () => {
  const agents = await read("AGENTS.md");
  const table = parseTriggerTable(agents);
  expect(table.length).toBeGreaterThanOrEqual(11);
  for (const row of table)
    for (const guide of row.guides)
      expect(existsSync(join(root, "docs/agents", `${guide}.md`)), `${row.trigger}: ${guide}`).toBe(
        true,
      );
  const routed = new Set(table.flatMap((row) => row.guides));
  for (const guide of [
    "api",
    "architecture",
    "maintenance",
    "observability",
    "quality-gates",
    "security",
    "testing",
    "ui",
    "untrusted-input",
  ])
    expect(routed.has(guide), guide).toBe(true);
  expect(agents).toContain("docs/agents/workflow.md");
});
