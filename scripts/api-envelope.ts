import { parseErrorEnvelope } from "@metro/contracts";

/**
 * The shared check for "an unknown /api route answers with the 404 error envelope and an x-request-id".
 * Used by the per-pull-request preview smoke (scripts/preview.ts) and the uptime probe
 * (scripts/uptime-probe.ts, METRO-44). The messages are fixed: they never carry the response body,
 * so a parser error that could echo a value cannot reach a log.
 */

/** The part of a Response the check reads; a structural type so any runtime's Response fits. */
export interface EnvelopeResponse {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export type EnvelopeProblem = "status" | "envelope" | "request-id";

/** What is wrong with an unknown-route response, or undefined when it is a 404 envelope with an x-request-id. */
export async function envelopeProblem(
  response: EnvelopeResponse,
): Promise<EnvelopeProblem | undefined> {
  if (response.status !== 404) return "status";
  try {
    parseErrorEnvelope(await response.json());
  } catch {
    return "envelope";
  }
  return response.headers.get("x-request-id") ? undefined : "request-id";
}

/** Throws a fixed-message Error unless the response is a 404 with the error envelope and an x-request-id. */
export async function assertNotFoundEnvelope(response: EnvelopeResponse): Promise<void> {
  const problem = await envelopeProblem(response);
  if (problem === "status")
    throw new Error(`Unknown API route returned ${response.status}, not 404`);
  if (problem === "envelope")
    throw new Error("Unknown API route did not return the error envelope");
  if (problem === "request-id") throw new Error("API response has no x-request-id");
}
