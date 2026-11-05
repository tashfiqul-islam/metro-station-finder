import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// METRO-54: every ADR follows docs/adr/0000-template.md (MADR 4.0.0 vocabulary, see the template).
const directory = "docs/adr";
const statuses = ["Proposed", "Accepted", "Rejected", "Deprecated"] as const;
const sections = [
  "Context",
  "Decision",
  "Consequences",
  "Alternatives considered",
  "Confirmation",
] as const;
const placeholder = "Delete this paragraph";

const files = readdirSync(directory).filter((name) => /^\d{4}-.+\.md$/u.test(name));
const adrs = files.filter((name) => !name.startsWith("0000-"));
const numbers = new Set(adrs.map((name) => name.slice(0, 4)));

// Line-ending agnostic (the repository pins LF, but a CRLF checkout must not fail the check).
const normalize = (text: string): string => text.replaceAll("\r\n", "\n");
const read = (name: string): string => normalize(readFileSync(join(directory, name), "utf8"));

const statusLine = new RegExp(
  // The status word, then optionally a qualifier: " (...)", ". ..." or "; ..." (ADR-0008, 0012).
  `^- Status: (?:${statuses.join("|")}|Superseded by ADR-(\\d{4}))(?:[ .;(].*)?$`,
  "mu",
);

// Headings inside fenced code blocks are examples, not structure: blank them out.
function withoutFences(text: string): string {
  let fenced = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/u.test(line)) {
        fenced = !fenced;
        return "";
      }
      return fenced ? "" : line;
    })
    .join("\n");
}

function problems(name: string, text: string, known: ReadonlySet<string> = numbers): string[] {
  const found: string[] = [];
  const body = withoutFences(text);
  const lines = body.split("\n");
  if (lines[0]?.startsWith(`# ADR-${name.slice(0, 4)}: `) !== true) {
    found.push(`first line must be "# ADR-${name.slice(0, 4)}: <title>"`);
  }
  const header = lines.slice(1, 6).join("\n");
  const status = statusLine.exec(header);
  if (status === null) {
    found.push("header needs a '- Status:' bullet with a valid status");
  } else if (status[1] !== undefined && !known.has(status[1])) {
    found.push(`superseding ADR-${status[1]} does not exist`);
  }
  if (!/^- Date: \d{4}-\d{2}-\d{2}$/mu.test(header)) {
    found.push("header needs a '- Date: YYYY-MM-DD' bullet");
  }
  if (!/^- Ticket(?: and specification)?: \S/mu.test(header)) {
    found.push("header needs a '- Ticket and specification:' (or '- Ticket:') bullet");
  }
  let from = 0;
  for (const section of sections) {
    const at = body.indexOf(`\n## ${section}\n`, from);
    if (at === -1) {
      found.push(`missing or out-of-order section "## ${section}"`);
    } else {
      from = at + 1;
    }
  }
  if (text.includes(placeholder)) {
    found.push("template placeholder note was left in");
  }
  return found;
}

const sample = `# ADR-0001: Sample

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-1

## Context

c

## Decision

d

## Consequences

q

## Alternatives considered

a

## Confirmation

None (policy)
`;

test("METRO-54 the ADR directory holds unique numbered files", () => {
  expect(adrs.length).toBeGreaterThan(0);
  expect(numbers.size).toBe(adrs.length);
});

test("METRO-54 the template lists every status and every required section", () => {
  const template = read("0000-template.md");
  for (const status of [...statuses, "Superseded by ADR-NNNN"]) {
    expect(template).toContain(status);
  }
  for (const section of sections) {
    expect(template).toContain(`\n## ${section}\n`);
  }
});

for (const name of adrs) {
  test(`METRO-54 ${name} has the template header, a valid status and every required section`, () => {
    expect(problems(name, read(name))).toEqual([]);
  });
}

test("METRO-54 the checker accepts a well-formed ADR, CRLF and every status", () => {
  expect(problems("0001-x.md", sample)).toEqual([]);
  expect(problems("0001-x.md", normalize(sample.replaceAll("\n", "\r\n")))).toEqual([]);
  for (const status of [...statuses, "Accepted (plan only)", "Superseded by ADR-0002"]) {
    const text = sample.replace("- Status: Accepted", `- Status: ${status}`);
    expect(problems("0001-x.md", text, new Set(["0001", "0002"]))).toEqual([]);
  }
});

test("METRO-54 the checker rejects each kind of defect", () => {
  const cases: [string, string][] = [
    ["bad status", sample.replace("- Status: Accepted", "- Status: Maybe")],
    ["no bullet", sample.replace("- Status: Accepted", "Status: Accepted")],
    ["unknown superseder", sample.replace("Accepted", "Superseded by ADR-9999")],
    ["bad date", sample.replace("2026-11-05", "yesterday")],
    ["no ticket", sample.replace("- Ticket and specification: METRO-1\n", "")],
    ["wrong title number", sample.replace("# ADR-0001", "# ADR-0002")],
    ["missing section", sample.replace("## Confirmation", "## Checks")],
    [
      "out of order",
      sample.replace("## Decision\n\nd\n\n## Consequences", "## Consequences\n\nd\n\n## Decision"),
    ],
    ["placeholder left in", `${sample}\n${placeholder} in a real ADR.\n`],
  ];
  for (const [label, text] of cases) {
    expect({ label, count: problems("0001-x.md", text).length > 0 }).toEqual({
      label,
      count: true,
    });
  }
});

test("METRO-54 a heading inside a code fence does not count as a section", () => {
  const fenced = sample.replace(
    "## Confirmation\n\nNone (policy)\n",
    "```md\n## Confirmation\n```\n",
  );
  expect(problems("0001-x.md", fenced)).toEqual([
    'missing or out-of-order section "## Confirmation"',
  ]);
});
