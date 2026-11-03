import type { ScaffoldStatus } from "@metro/core";
import * as v from "valibot";

/** Synthetic status carried from the Worker to the page. Strict: unknown fields are rejected. */
export const scaffoldStatusSchema = v.pipe(
  v.strictObject({ kind: v.literal("synthetic-scaffold"), ready: v.literal(true) }),
  v.readonly(),
);

/** Error envelope returned for failed `/api/*` requests. */
export const errorEnvelopeSchema = v.pipe(
  v.strictObject({
    error: v.strictObject({ code: v.pipe(v.string(), v.nonEmpty()), message: v.string() }),
  }),
  v.readonly(),
);

export type ScaffoldStatusBody = v.InferOutput<typeof scaffoldStatusSchema>;
export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;

type Equal<A, B> = (() => unknown extends A ? 1 : 2) extends () => unknown extends B ? 1 : 2
  ? true
  : false;

/** Compile-time guard: the schema-derived type must stay identical to the core type. */
export const coreStatusMatchesSchema: Equal<ScaffoldStatus, ScaffoldStatusBody> = true;

export function parseScaffoldStatus(body: unknown): ScaffoldStatusBody {
  return v.parse(scaffoldStatusSchema, body);
}

export function parseErrorEnvelope(body: unknown): ErrorEnvelope {
  return v.parse(errorEnvelopeSchema, body);
}
