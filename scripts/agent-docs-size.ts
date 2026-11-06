import { kindOf, parseKindMap } from "./docs-structure.ts";

/**
 * METRO-86: byte budgets for agent instructions. The root AGENTS.md is a map and every guide under
 * docs/agents/ stays short; a runbook (docs/README.md map kind `runbook`) is an operator procedure
 * and is exempt. Bytes, not lines, because a budget is about context cost.
 */
export const ROOT_CAP = 8192;
export const GUIDE_CAP = 6144;

export interface Sized {
  path: string;
  bytes: number;
}

/** Files under docs/agents/ whose docs/README.md map kind is `guide` (runbooks and data are exempt). */
export function guidePaths(files: readonly string[], readme: string): string[] {
  const map = parseKindMap(readme);
  return files.filter(
    (file) =>
      file.startsWith("docs/agents/") && file.endsWith(".md") && kindOf(file, map) === "guide",
  );
}

/** One message per file over its cap; empty means every file is within budget. */
export function sizeProblems(rootFile: Sized, guides: readonly Sized[]): string[] {
  const problems: string[] = [];
  if (rootFile.bytes > ROOT_CAP)
    problems.push(
      `${rootFile.path} is ${rootFile.bytes} bytes, over the ${ROOT_CAP}-byte cap. Move detail to the guide a trigger row routes to, or history to an evidence file, and keep a link.`,
    );
  for (const guide of guides)
    if (guide.bytes > GUIDE_CAP)
      problems.push(
        `${guide.path} is ${guide.bytes} bytes, over the ${GUIDE_CAP}-byte cap. Move history, measurements and run IDs to the ADR or evidence file they came from with a link back, merge a narrow guide, or make it a runbook in docs/README.md if it is a procedure.`,
      );
  return problems;
}
