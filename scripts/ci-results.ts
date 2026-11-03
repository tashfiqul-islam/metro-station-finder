import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_JOBS = ["checks", "build", "security"] as const;

function succeeded(entry: unknown): boolean {
  return (
    typeof entry === "object" && entry !== null && "result" in entry && entry.result === "success"
  );
}

/**
 * Every job in `needs` must succeed, and the known required jobs must be present.
 * Checking all entries means a job added to the workflow `needs` list cannot fail silently;
 * the required list is a floor that stops a gate being dropped from `needs`.
 */
export function requiredJobsSucceeded(needs: unknown): boolean {
  if (typeof needs !== "object" || needs === null || Array.isArray(needs)) return false;
  const jobs = needs as Record<string, unknown>;
  return REQUIRED_JOBS.every((job) => job in jobs) && Object.values(jobs).every(succeeded);
}

/** CLI body: fails unless every required quality job succeeded. */
export function runCiResults(env: NodeJS.ProcessEnv): void {
  const needs: unknown = JSON.parse(env["REQUIRED_JOB_RESULTS"] ?? "null");
  if (!requiredJobsSucceeded(needs)) throw new Error("Required quality jobs did not all succeed");
  console.log("All required quality jobs succeeded");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  runCiResults(process.env);
