/**
 * METRO-51: deterministic routing check. AGENTS.md carries a trigger table (trigger text, additional
 * read set). The METRO-8 evidence lists expected read sets per scenario. Both are parsed here without
 * any model, so a change to the table that drops or misroutes a guidance document fails a test.
 * Limit: it proves the table and the recorded expectations agree, not that an agent follows the table;
 * LLM-run evals stay evidence, never a gate.
 */

export interface TriggerRow {
  trigger: string;
  /** Guidance documents under docs/agents/ linked from the row, as file stems (for example `api`). */
  guides: string[];
}

const AGENT_GUIDE = /\]\(docs\/agents\/([a-z-]+)\.md\)/gu;

/** Sorts `items` in place and returns them; callers pass a fresh array. */
export function sorted(items: string[]): string[] {
  items.sort((a, b) => a.localeCompare(b));
  return items;
}

function cells(line: string): string[] {
  return line
    .trim()
    .replaceAll(/^\||\|$/gu, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Rows of the first table in `markdown` whose header starts with `Trigger`, without header/separator. */
export function parseTriggerTable(markdown: string): TriggerRow[] {
  const rows: TriggerRow[] = [];
  let inTable = false;
  for (const line of markdown.split(/\r?\n/u)) {
    if (!line.trimStart().startsWith("|")) {
      if (inTable) break;
      continue;
    }
    const [first = "", second = ""] = cells(line);
    if (!inTable) {
      inTable = first === "Trigger";
      continue;
    }
    if (/^-+$/u.test(first)) continue;
    rows.push({
      trigger: first,
      guides: [...second.matchAll(AGENT_GUIDE)].map((match) => match[1] ?? ""),
    });
  }
  return rows;
}

/** Union of the guides of every row whose trigger contains one of `needles`; a needle that matches no row throws. */
export function readSet(table: readonly TriggerRow[], needles: readonly string[]): string[] {
  const guides = new Set<string>();
  for (const needle of needles) {
    const row = table.find((candidate) => candidate.trigger.includes(needle));
    if (!row) throw new Error(`no trigger row contains "${needle}"`);
    for (const guide of row.guides) guides.add(guide);
  }
  return sorted([...guides]);
}

/** Scenario name to expected guide stems, from the METRO-8 evidence table (`Scenario | Additional read set | ...`). */
export function parseScenarios(markdown: string): Map<string, string[]> {
  const scenarios = new Map<string, string[]>();
  let inTable = false;
  for (const line of markdown.split(/\r?\n/u)) {
    if (!line.trimStart().startsWith("|")) {
      if (inTable) break;
      continue;
    }
    const [name = "", set = ""] = cells(line);
    if (!inTable) {
      inTable = name === "Scenario";
      continue;
    }
    if (/^-+$/u.test(name)) continue;
    scenarios.set(name, sorted(set.split(",").map((guide) => guide.trim())));
  }
  return scenarios;
}
