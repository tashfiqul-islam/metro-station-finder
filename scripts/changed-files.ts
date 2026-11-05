import { appendFileSync } from "node:fs";

import { gitChangedPaths, isDocsOnly } from "./reviewer-record.ts";

/**
 * Decides whether a pull request changes only documentation (METRO-62), so `quality.yml` can skip the
 * browser build, smoke and Cloudflare preview. The allow-list is the one `reviewer-record.ts` already uses
 * for its docs-only marker (`*.md` at the repository root, `docs/**` markdown), so both checks agree.
 *
 * Fail safe: the answer is `true` only for a `pull_request` event with a non-empty change list that git
 * produced without error and that is entirely on the allow-list. Anything else is `false`, which runs
 * every job.
 */

const SHA = /^[0-9a-f]{40}$/u;

export interface Deps {
  readonly changedPaths: (base: string, head: string) => string[];
  readonly log: (message: string) => void;
}

/** `true` only when it is provably safe to skip the build jobs; never throws. */
export function docsOnlyFor(
  env: Readonly<Record<string, string | undefined>>,
  changedPaths: Deps["changedPaths"],
): boolean {
  if (env["EVENT_NAME"] !== "pull_request") return false;
  const base = env["BASE_SHA"] ?? "";
  const head = env["HEAD_SHA"] ?? "";
  if (!SHA.test(base) || !SHA.test(head)) return false;
  try {
    return isDocsOnly(changedPaths(base, head));
  } catch {
    return false;
  }
}

/** Process entry: writes `docs_only=true|false` to `GITHUB_OUTPUT` (or stdout when unset). */
export function changedFilesMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = { changedPaths: (base, head) => gitChangedPaths(base, head), log: console.log },
): void {
  const line = `docs_only=${String(docsOnlyFor(env, deps.changedPaths))}`;
  const file = env["GITHUB_OUTPUT"];
  if (file) appendFileSync(file, `${line}\n`);
  deps.log(line);
}

if (import.meta.main) changedFilesMain(process.env);
