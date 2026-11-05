/**
 * METRO-75: rules behind docs/README.md. The README holds one table of `path | kind` rows; every
 * file under docs/ must match a row, every row must match a file, and specifications carry no
 * implementation checklist (work tracking lives in Plane). Pure functions over text so each rule
 * can be proven on synthetic input. Limit: textual checks; they cannot judge whether a kind is right.
 */

export const KINDS: readonly string[] = [
  "index",
  "guide",
  "runbook",
  "contract",
  "decision",
  "evidence",
  "history",
  "reference",
  "template",
  "example",
  "data",
];

/** A map row: first cell a backticked docs path (trailing `/` = directory prefix), second a kind word. */
const ROW = /^\|\s*`(docs\/[^`]+)`\s*\|\s*([a-z-]+)\s*\|/u;

/** Path-to-kind rows of the README map, in file order. */
export function parseKindMap(readme: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const line of readme.split(/\r?\n/u)) {
    const match = ROW.exec(line);
    if (match?.[1] && match[2]) map.set(match[1], match[2]);
  }
  return map;
}

/** Kind of a file: an exact row wins, otherwise the longest directory prefix. */
export function kindOf(path: string, map: ReadonlyMap<string, string>): string | undefined {
  const exact = map.get(path);
  if (exact) return exact;
  let best: string | undefined;
  let bestLength = -1;
  for (const [key, kind] of map)
    if (key.endsWith("/") && path.startsWith(key) && key.length > bestLength) {
      best = kind;
      bestLength = key.length;
    }
  return best;
}

/** Problems between the docs file list (root-relative, `/` separated) and the README map. */
export function structureProblems(files: readonly string[], readme: string): string[] {
  const map = parseKindMap(readme);
  const problems: string[] = [];
  for (const [path, kind] of map) {
    if (!KINDS.includes(kind)) problems.push(`map row ${path} uses unknown kind "${kind}"`);
    const matches = path.endsWith("/")
      ? files.some((file) => file.startsWith(path))
      : files.includes(path);
    if (!matches) problems.push(`map row ${path} matches no file`);
  }
  for (const file of files)
    if (!kindOf(file, map)) problems.push(`${file} has no kind in docs/README.md`);
  return problems;
}

const TASK_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\](?:\s|$)/u;
const FENCE = /^\s*(`{3,}|~{3,})/u;

/** One message per Markdown task-list item outside fenced code. */
export function checklistProblems(text: string): string[] {
  const problems: string[] = [];
  let fence: string | undefined;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const marker = FENCE.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    if (TASK_ITEM.test(line))
      problems.push(`line ${index + 1}: implementation checklist item; track work in Plane`);
  }
  return problems;
}
