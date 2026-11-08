import { isWebVitalPayload, type ErrorEnvelope } from "@metro/contracts";

import type { ApiApp } from "./types";

/** A valid beacon is about 130 bytes; 1 KB leaves room and refuses anything that is not one. */
export const MAX_VITAL_BYTES = 1024;

function envelope(code: string, message: string): ErrorEnvelope {
  return { error: { code, message } };
}

/**
 * Reads at most `max` bytes. Returns undefined as soon as the body is larger, so an oversized or
 * chunked body is never held in memory, let alone parsed.
 */
async function readCapped(request: Request, max: number): Promise<Uint8Array | undefined> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > max) return undefined;
  if (request.body === null) return new Uint8Array(0);
  // A counting pipe errors (and cancels the source) the moment the cap is crossed.
  let total = 0;
  const limit = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > max) controller.error(new RangeError("body too large"));
      else controller.enqueue(chunk);
    },
  });
  try {
    return new Uint8Array(await new Response(request.body.pipeThrough(limit)).arrayBuffer());
  } catch {
    return undefined;
  }
}

/**
 * `POST /api/vitals` (METRO-44, ADR-0019). Same-origin beacon: JSON only, size cap before parsing,
 * strict contract, 204 with no body. Every rejection is a fixed envelope that never echoes input.
 */
export function registerVitals(app: ApiApp): void {
  app.post("/api/vitals", async (context) => {
    const type = (context.req.header("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
    if (type !== "application/json") {
      return context.json(envelope("unsupported_media_type", "Send application/json"), 415);
    }
    const bytes = await readCapped(context.req.raw, MAX_VITAL_BYTES);
    if (bytes === undefined) {
      return context.json(envelope("payload_too_large", "Body is too large"), 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    } catch {
      return context.json(envelope("invalid_body", "Body is not valid JSON"), 400);
    }
    if (!isWebVitalPayload(body)) {
      return context.json(envelope("invalid_payload", "Body does not match the contract"), 400);
    }
    const { name, value, rating, navigationType } = body;
    context.set("vital", { name, value, rating, navigationType });
    return context.body(null, 204);
  });
  app.all("/api/vitals", (context) => {
    context.header("Allow", "POST");
    return context.json(envelope("method_not_allowed", "Use POST"), 405);
  });
}
