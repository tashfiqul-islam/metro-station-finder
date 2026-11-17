/**
 * METRO-75: rules behind docs/README.md. The README holds the Kinds table (the only list of kinds)
 * and a Map table of `path | kind` rows. Every file under docs/ must match a map row, every row
 * must match a file, every row's kind must be in the Kinds table, every kind in the Kinds table
 * must be used by a row, and specifications carry no implementation checklist (work tracking lives
 * in the tracker). Pure functions over text so each rule can be proven on synthetic input.
 *
 * Limits (textual checks, not a Markdown parser): a task item indented four or more spaces is still
 * counted (it is usually a nested list item, but an indented code block would be a false positive);
 * a task item inside an HTML comment is still counted; a kind's fit to its files is not judged.
 */

/** Kind words from the first cell of the table under `## Kinds`, in file order. */
export function parseKinds(readme: string): string[] {
  const section = /^## Kinds\s*$/mu.exec(readme);
  if (!section) return [];
  const after = readme.slice(section.index + section[0].length);
  const body = after.split(/^## /mu)[0] ?? "";
  const kinds: string[] = [];
  for (const line of body.split(/\r?\n/u)) {
    const word = /^\|\s*([a-z][a-z-]*)\s*\|/u.exec(line)?.[1];
    if (word && word !== "kind") kinds.push(word);
  }
  return kinds;
}

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

/** Problems between the docs file list (root-relative, `/` separated) and the README tables. */
export function structureProblems(files: readonly string[], readme: string): string[] {
  const kinds = parseKinds(readme);
  const map = parseKindMap(readme);
  const problems: string[] = [];
  if (kinds.length === 0) problems.push("docs/README.md has no Kinds table");
  for (const [path, kind] of map) {
    if (!kinds.includes(kind)) problems.push(`map row ${path} uses unknown kind "${kind}"`);
    const matches = path.endsWith("/")
      ? files.some((file) => file.startsWith(path))
      : files.includes(path);
    if (!matches) problems.push(`map row ${path} matches no file`);
  }
  const used = new Set(map.values());
  for (const kind of kinds)
    if (!used.has(kind)) problems.push(`kind "${kind}" is defined but no map row uses it`);
  for (const file of files)
    if (!kindOf(file, map)) problems.push(`${file} has no kind in docs/README.md`);
  return problems;
}

const TASK_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\](?:\s|$)/u;
const OPENING_FENCE = /^\s*(`{3,}|~{3,})/u;
const QUOTE_PREFIX = /^(?:\s{0,3}>\s?)+/u;

/** One message per Markdown task-list item outside fenced code; an unclosed fence is a problem too. */
export function checklistProblems(text: string): string[] {
  const problems: string[] = [];
  let fence: { marker: string; line: number } | undefined;
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    const line = raw.replace(QUOTE_PREFIX, "");
    if (fence) {
      // A closing fence uses the same character, is at least as long and carries no info string.
      const closing = /^\s*(`{3,}|~{3,})\s*$/u.exec(line)?.[1];
      if (closing && closing[0] === fence.marker[0] && closing.length >= fence.marker.length)
        fence = undefined;
      continue;
    }
    const opening = OPENING_FENCE.exec(line)?.[1];
    if (opening) {
      fence = { marker: opening, line: index + 1 };
      continue;
    }
    if (TASK_ITEM.test(line))
      problems.push(`line ${index + 1}: implementation checklist item; track work in the tracker`);
  }
  if (fence) problems.push(`line ${fence.line}: unclosed fence; the rest of the file is unchecked`);
  return problems;
}
