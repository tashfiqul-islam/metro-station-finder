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

const files = readdirSync(directory).filter((name) => /^\d{4}-.+\.md$/u.test(name));
const adrs = files.filter((name) => !name.startsWith("0000-"));
const numbers = new Set(adrs.map((name) => name.slice(0, 4)));
const read = (name: string): string => readFileSync(join(directory, name), "utf8");

const statusLine = new RegExp(
  `^- Status: (?:${statuses.join("|")}|Superseded by ADR-(\\d{4}))(?: \\([^)\\n]+\\))?$`,
  "mu",
);

function problems(name: string, text: string): string[] {
  const found: string[] = [];
  const lines = text.split("\n");
  if (lines[0] !== undefined && !lines[0].startsWith(`# ADR-${name.slice(0, 4)}: `)) {
    found.push(`first line must be "# ADR-${name.slice(0, 4)}: <title>"`);
  }
  const header = lines.slice(1, 6).join("\n");
  const status = statusLine.exec(header);
  if (status === null) {
    found.push("header needs a '- Status:' bullet with a valid status");
  } else if (status[1] !== undefined && !numbers.has(status[1])) {
    found.push(`superseding ADR-${status[1]} does not exist`);
  }
  if (!/^- Date: \d{4}-\d{2}-\d{2}$/mu.test(header)) {
    found.push("header needs a '- Date: YYYY-MM-DD' bullet");
  }
  if (!/^- Ticket and specification: \S/mu.test(header)) {
    found.push("header needs a '- Ticket and specification:' bullet");
  }
  let from = 0;
  for (const section of sections) {
    const at = text.indexOf(`\n## ${section}\n`, from);
    if (at === -1) {
      found.push(`missing or out-of-order section "## ${section}"`);
    } else {
      from = at + 1;
    }
  }
  return found;
}

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

test("METRO-54 the checker rejects a bad status and a missing section", () => {
  const good = read(adrs[0] ?? "");
  expect(problems("0001-x.md", good.replace(/^- Status: .*$/mu, "- Status: Maybe"))).toHaveLength(
    1,
  );
  expect(problems("0001-x.md", good.replace(/^- Status: .*$/mu, "Status: Accepted"))).toHaveLength(
    1,
  );
  expect(
    problems("0001-x.md", good.replace(/^- Status: .*$/mu, "- Status: Superseded by ADR-9999")),
  ).toHaveLength(1);
  expect(problems("0001-x.md", good.replace("\n## Confirmation\n", "\n## Checks\n"))).toHaveLength(
    1,
  );
  expect(problems("0001-x.md", good.replace(/^- Date: .*$/mu, "- Date: yesterday"))).toHaveLength(
    1,
  );
});
