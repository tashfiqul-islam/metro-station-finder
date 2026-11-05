import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");
const adr = read("docs/adr/0009-maps-provider-design.md");
const spec = read("docs/specifications/maps-provider-design.md");

test("METRO-39 the ADR is Accepted and has the template sections", () => {
  expect(adr).toMatch(/^- Status: Accepted$/mu);
  for (const heading of ["Context", "Decision", "Consequences", "Alternatives considered"])
    expect(adr).toContain(`## ${heading}`);
});

test("METRO-39 the ADR decides each topic the ticket names", () => {
  for (const topic of [
    "Loader and channel",
    "Browser or Worker",
    "Session handling",
    "Stored and non-storable",
    "Attribution",
    "Quota and billing alert",
    "Key restrictions",
    "Geolocation consent",
  ])
    expect(adr).toContain(`### ${topic}`);
});

test("METRO-39 the specification has a SKU and free-tier row for every external call", () => {
  const rows = spec.split("\n").filter((line) => line.startsWith("| C"));
  for (const id of ["C1", "C2", "C3", "C4", "C5"]) {
    const row = rows.find((line) => line.startsWith(`| ${id} `));
    expect(row, id).toBeDefined();
    expect(row).toMatch(/\(\w{4}-\w{4}-\w{4}\)|Unverified/u);
    expect(row).toMatch(/free/iu);
  }
});

test("METRO-39 the specification lists the test plan as future work", () => {
  expect(spec).toContain("## Test plan for the first map slice");
  for (const needle of [
    "getCurrentPosition",
    'role="alert"',
    "manual search",
    "coordinate",
    "gmpClickable",
    "text list",
    "fares",
  ])
    expect(spec).toContain(needle);
});
