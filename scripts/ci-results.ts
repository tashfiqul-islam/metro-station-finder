import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function requiredJobsSucceeded(needs: unknown): boolean {
  if (typeof needs !== "object" || needs === null || Array.isArray(needs)) return false;
  return ["checks", "build", "security"].every((job) => {
    const entry: unknown = (needs as Record<string, unknown>)[job];
    return (
      typeof entry === "object" && entry !== null && "result" in entry && entry.result === "success"
    );
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const needs: unknown = JSON.parse(process.env["REQUIRED_JOB_RESULTS"] ?? "null");
  if (!requiredJobsSucceeded(needs)) throw new Error("Required quality jobs did not all succeed");
  console.log("All required quality jobs succeeded");
}
