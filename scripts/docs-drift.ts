/**
 * METRO-51: content rules behind the documentation drift tests. Pure functions over Markdown text so
 * each rule can be proven on synthetic input (it fails on the stale shape) and then applied to the
 * real files. Limit: these are textual heuristics, not proof that a statement is true.
 */

export const BANNER = "Historical baseline: legacy implementation references";

const BASELINE_REFERENCE = /af903d7/u;
/** Claims about rebuild files or commands; only valid on a banner-free line or when labelled legacy. */
const REBUILD_CLAIM = /(?:apps\/|packages\/|scripts\/|\.github\/|\bbun run\b|\bthe rebuild\b)/u;
const LEGACY_LABEL = /af903d7|legacy|baseline|historical/iu;

/**
 * Problems for one document that carries the Historical baseline banner. A banner is honest only
 * when the file still consists of legacy references, so it must cite the baseline at least once
 * outside the banner line, and no `Repo-verified` line may make an unlabelled claim about rebuild
 * files or commands (the banner would otherwise tell readers those claims are legacy).
 */
export function bannerProblems(text: string): string[] {
  const lines = text.split(/\r?\n/u);
  const problems: string[] = [];
  const body = lines.filter((line) => !line.includes(BANNER));
  if (!body.some((line) => BASELINE_REFERENCE.test(line)))
    problems.push("carries the banner but cites no legacy baseline (af903d7) outside it");
  for (const line of body) {
    if (/Repo-verified/u.test(line) && REBUILD_CLAIM.test(line) && !LEGACY_LABEL.test(line))
      problems.push(
        `unlabelled Repo-verified rebuild claim under the banner: ${line.slice(0, 80)}`,
      );
  }
  return problems;
}

/** Statement classes that rot once the work they wait for lands. `except` lines are true as written. */
export const STALE_PATTERNS: readonly { pattern: RegExp; why: string; except?: RegExp }[] = [
  { pattern: /while pending/iu, why: "waiting-on-ticket phrase; link the landed document" },
  { pattern: /until landed/iu, why: "waiting-on-ticket phrase; link the landed document" },
  { pattern: /pending METRO-\d+/iu, why: "pending-ticket phrase" },
  { pattern: /proposed checks/iu, why: "checks exist; name them" },
  { pattern: /not available verified gates/iu, why: "gates exist; name them" },
  {
    pattern: /REST\/OpenAPI/u,
    why: "ADR-0003 chose plain fetch with Valibot schemas",
    except: /no OpenAPI|new ADR|OpenAPI generation exists|ADR-0003/u,
  },
  { pattern: /\.codex\/plugins/u, why: "the active agent is Claude Code" },
  { pattern: /permissions\.md/u, why: "docs/agents/permissions.md was removed" },
  { pattern: /authorization hook/iu, why: "the authorization hook was removed" },
];

/** Plane tickets a document may link by browse URL, each with its state when last read. */
export const OPEN_TICKET_LINKS: ReadonlyMap<string, string> = new Map([
  ["METRO-15", "Backlog, read from Plane 2026-11-05"],
]);

const PLANE_BROWSE = /app\.plane\.so\/[^\s)]*\/browse\/(METRO-\d+)/gu;

/** One message per stale line or per Plane browse link to a ticket not known to be open. */
export function staleProblems(text: string): string[] {
  const problems: string[] = [];
  for (const line of text.split(/\r?\n/u)) {
    for (const { pattern, why, except } of STALE_PATTERNS)
      if (pattern.test(line) && !except?.test(line)) problems.push(`${why}: ${line.slice(0, 80)}`);
    for (const match of line.matchAll(PLANE_BROWSE)) {
      const ticket = match[1] ?? "";
      if (!OPEN_TICKET_LINKS.has(ticket))
        problems.push(`links ${ticket}, not listed as open in OPEN_TICKET_LINKS`);
    }
  }
  return problems;
}
