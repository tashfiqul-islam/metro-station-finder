import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");
const adr = read("docs/adr/0009-maps-provider-design.md");
const spec = read("docs/specifications/maps-provider-design.md");

const section = (source: string, heading: string): string => {
  const start = source.indexOf(`## ${heading}`);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\n## ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
};

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

test("METRO-39 the ADR states the key restrictions, the quota caps and the route disclosure", () => {
  const keys = adr.slice(adr.indexOf("### Key restrictions"));
  for (const phrase of [
    "metro-station-key-dev",
    "https://metro-station-finder.com/*",
    "https://www.metro-station-finder.com/*",
    "HTTP referrer",
    "Maps JavaScript API, Places API (New), Routes API",
  ])
    expect(keys).toContain(phrase);
  for (const phrase of ["daily quota cap", "budget alert", "owner-adjustable", "Pro price"])
    expect(adr).toContain(phrase);
  expect(adr).toContain("sent to Google only to compute the route");
  expect(adr).toContain("DEMO_MAP_ID");
  expect(adr).toContain("METRO-31");
});

test("METRO-39 each external call has a SKU and free-tier row", () => {
  const rows = section(spec, "External calls, SKUs and free tiers")
    .split("\n")
    .filter((line) => /^\| C\d /u.test(line));
  expect(rows).toHaveLength(5);
  const row = (id: string): string => rows.find((line) => line.startsWith(`| ${id} `)) ?? "";
  for (const id of ["C1", "C2", "C3", "C4"])
    expect(row(id), id).toMatch(/\b[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}\b/u);
  for (const id of ["C1", "C2", "C3", "C4", "C5"]) expect(row(id), id).toMatch(/free/iu);
  expect(row("C4")).toContain("SKU: not named by Google (Unverified)");
  expect(row("C4")).toContain("02F7-1B55-DC90");
  expect(row("C5")).toContain("SKU: none (browser API)");
  expect(row("C5")).toContain("not sent to our server");
});

test("METRO-39 the test plan has exactly one row per test id T1 to T8", () => {
  const plan = section(spec, "Test plan for the first map slice");
  for (let n = 1; n <= 8; n += 1) {
    const rows = plan.split("\n").filter((line) => line.startsWith(`| T${n} `));
    expect(rows, `T${n}`).toHaveLength(1);
  }
  expect(plan).toContain("getCurrentPosition");
  expect(plan).toContain('role="alert"');
  expect(plan).toContain("gmpClickable");
  expect(plan).toContain("coordinate");
});

test("METRO-39 the slice names its blockers and the provider-down fallback", () => {
  const slice = section(spec, "Slice MAP-1: first map slice (future, not authorized here)");
  for (const blocker of ["METRO-40", "METRO-57", "METRO-31"]) expect(slice).toContain(blocker);
  expect(spec).toContain("station dropdown");
  expect(spec).toContain("## Open items");
});
