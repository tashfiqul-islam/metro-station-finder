import * as v from "valibot";

/** Error envelope returned for failed `/api/*` requests. */
export const errorEnvelopeSchema = v.pipe(
  v.strictObject({
    error: v.strictObject({ code: v.pipe(v.string(), v.nonEmpty()), message: v.string() }),
  }),
  v.readonly(),
);

export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;

export function parseErrorEnvelope(body: unknown): ErrorEnvelope {
  return v.parse(errorEnvelopeSchema, body);
}
