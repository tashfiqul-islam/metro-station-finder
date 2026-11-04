import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * METRO-34 criterion 3: CONTRIBUTING.md, docs/agents/workflow.md and docs/agents/plane.md must name
 * the same pull request base branch. At the default-branch switch all three change in one reviewed
 * edit; this check fails when only some do. Limitation: it proves the documents agree with each
 * other, not that they match GitHub's actual default branch or the Renovate and workflow
 * configuration; the runbook's readback and the cutover preflight cover the live side. Each document is matched by one fixed phrase so a
 * rewording that drops the branch fails visibly instead of passing silently.
 */

interface Source {
  file: string;
  phrase: RegExp;
}

const SOURCES: readonly Source[] = [
  { file: "CONTRIBUTING.md", phrase: /Open pull requests against `([^`]+)`/gu },
  { file: "docs/agents/workflow.md", phrase: /ticket PRs target `([^`]+)`/gu },
  { file: "docs/agents/plane.md", phrase: /Ticket merges target `([^`]+)`/gu },
];

/** Returns one message per problem; an empty list means the three documents agree. */
export async function checkBaseBranches(root: string): Promise<string[]> {
  const problems: string[] = [];
  const named = new Map<string, string>();
  for (const { file, phrase } of SOURCES) {
    const text = await readFile(join(root, file), "utf8").catch(() => null);
    if (text === null) {
      problems.push(`${file}: cannot be read`);
      continue;
    }
    const branches = new Set([...text.matchAll(phrase)].map((match) => match[1] ?? ""));
    if (branches.size === 0) {
      problems.push(
        `${file}: does not state its base branch (expected the phrase ${phrase.source})`,
      );
    } else if (branches.size > 1) {
      problems.push(`${file}: names more than one base branch: ${[...branches].join(", ")}`);
    } else {
      named.set(file, [...branches][0] ?? "");
    }
  }
  if (new Set(named.values()).size > 1) {
    problems.push(
      `base branches differ: ${[...named].map(([file, branch]) => `${file} names ${branch}`).join("; ")}`,
    );
  }
  return problems;
}

/** CLI body: prints each problem and sets the exit code. */
export async function runBaseBranchCheck(root: string): Promise<void> {
  const problems = await checkBaseBranches(root);
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exitCode = 1;
  else console.log("Base branch ok: CONTRIBUTING.md, workflow.md and plane.md agree");
}

if (import.meta.main)
  await runBaseBranchCheck(
    resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url))),
  );
