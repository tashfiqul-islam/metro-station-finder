import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { missingRoutes, parseScenarios, parseTriggerTable, readSet } from "./routing.ts";

const root = resolve(import.meta.dir, "..");
const read = (file: string) => readFile(join(root, file), "utf8");

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

test("METRO-51 parseTriggerTable accepts anchors, digits, uppercase and escaped pipes", () => {
  const table = parseTriggerTable(
    [
      "| Trigger | Additional read set |",
      "| --- | --- |",
      String.raw`| A \| B thing | [One](docs/agents/Guide-2.md#part); [Two](docs/agents/two.v1.md) |`,
    ].join("\n"),
  );
  expect(table).toEqual([{ trigger: "A | B thing", guides: ["Guide-2", "two.v1"] }]);
});

const REQUIRED_GUIDES = [
  "api",
  "architecture",
  "maintenance",
  "observability",
  "plane",
  "quality-gates",
  "review-checklist",
  "security",
  "skills",
  "testing",
  "ui",
  "untrusted-input",
  "workflow",
];

test("METRO-51 missingRoutes reports a guide whose row was removed or retargeted", async () => {
  const agents = await read("AGENTS.md");
  const guides = (table: ReturnType<typeof parseTriggerTable>) =>
    missingRoutes(table, REQUIRED_GUIDES);
  const targets = new Set(parseTriggerTable(agents).flatMap((row) => row.guides));
  // Guides routed only through prose below the table are linked there instead.
  const routed = REQUIRED_GUIDES.filter((guide) => agents.includes(`docs/agents/${guide}.md`));
  expect(routed.length).toBeGreaterThan(0);
  expect(targets.has("observability")).toBe(true);
  const retargeted = agents.replace("(docs/agents/observability.md)", "(docs/agents/security.md)");
  expect(guides(parseTriggerTable(retargeted))).toContain("observability");
  const removed = agents
    .split("\n")
    .filter((line) => !line.includes("docs/agents/observability.md"))
    .join("\n");
  expect(guides(parseTriggerTable(removed))).toContain("observability");
});

test("METRO-51 every guide the trigger table links exists and every key guide stays reachable from AGENTS.md", async () => {
  const agents = await read("AGENTS.md");
  const table = parseTriggerTable(agents);
  expect(table.length).toBeGreaterThanOrEqual(11);
  for (const row of table)
    for (const guide of row.guides)
      expect(existsSync(join(root, "docs/agents", `${guide}.md`)), `${row.trigger}: ${guide}`).toBe(
        true,
      );
  // Guides the table routes by trigger, plus those AGENTS.md links from its prose or the tracker block.
  const unreachable = REQUIRED_GUIDES.filter(
    (guide) =>
      missingRoutes(table, [guide]).length > 0 && !agents.includes(`docs/agents/${guide}.md`),
  );
  expect(unreachable).toEqual([]);
  expect(
    missingRoutes(table, [
      "api",
      "architecture",
      "maintenance",
      "observability",
      "quality-gates",
      "security",
      "testing",
      "ui",
      "untrusted-input",
    ]),
  ).toEqual([]);
});
