import type { WebVitalPayload } from "@metro/contracts";
import type { Hono } from "hono";

/** The validated beacon fields that may be logged. `id` is deliberately absent (ADR-0019). */
type LoggedVital = Pick<WebVitalPayload, "name" | "value" | "rating" | "navigationType">;

/**
 * One structured log line. Only these fields exist, so nothing else (query string, headers, bodies,
 * error messages) can be logged by accident. See docs/specifications/cloudflare-preview.md.
 */
export type LogLine =
  | {
      level: "info";
      event: "request";
      requestId: string;
      method: string;
      path: string;
      status: number;
      durationMs: number;
      /** Present only on an accepted `POST /api/vitals`. */
      vital?: LoggedVital;
    }
  | { level: "error"; event: "error"; requestId: string; errorName: string };

export type Logger = (line: LogLine) => void;

export type ApiApp = Hono<{
  Bindings: Env;
  Variables: { requestId: string; vital?: LoggedVital };
}>;
