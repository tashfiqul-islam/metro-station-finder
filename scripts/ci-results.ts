import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isRecord } from "./guards.ts";

const REQUIRED_JOBS = ["changes", "checks", "build", "smoke", "security"] as const;
/** Jobs that may be skipped, but only on a docs-only change (METRO-62, METRO-90). */
const SKIPPABLE_JOBS = new Set(["build", "smoke"]);

function resultOf(entry: unknown): unknown {
  return isRecord(entry) ? entry["result"] : undefined;
}

function succeeded(entry: unknown): boolean {
  return resultOf(entry) === "success";
}

/** True only when the `changes` job succeeded and reported exactly `docs_only=true`. */
function docsOnly(changes: unknown): boolean {
  if (!succeeded(changes) || !isRecord(changes)) return false;
  const outputs = changes["outputs"];
  return isRecord(outputs) && outputs["docs_only"] === "true";
}

/**
 * Every job in `needs` must succeed, and the known required jobs must be present.
 * Checking all entries means a job added to the workflow `needs` list cannot fail silently;
 * the required list is a floor that stops a gate being dropped from `needs`.
 *
 * One exception (METRO-62, METRO-90): `build` and `smoke` may be skipped, but only when `changes` succeeded and reported
 * `docs_only` as exactly "true". Any other skip is a failure, so a mis-wired condition cannot pass.
 */
export function requiredJobsSucceeded(needs: unknown): boolean {
  if (!isRecord(needs)) return false;
  if (!REQUIRED_JOBS.every((job) => job in needs)) return false;
  return Object.entries(needs).every(
    ([job, entry]) =>
      succeeded(entry) ||
      (SKIPPABLE_JOBS.has(job) && resultOf(entry) === "skipped" && docsOnly(needs["changes"])),
  );
}

/** CLI body: fails unless every required quality job succeeded. */
export function runCiResults(env: NodeJS.ProcessEnv): void {
  const needs: unknown = JSON.parse(env["REQUIRED_JOB_RESULTS"] ?? "null");
  if (!requiredJobsSucceeded(needs)) throw new Error("Required quality jobs did not all succeed");
  console.log("All required quality jobs succeeded");
}

const isEntry = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) runCiResults(process.env);
