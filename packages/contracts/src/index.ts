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

/**
 * One real-user web-vitals measurement, sent by the browser to `POST /api/vitals` (METRO-44, ADR-0019).
 * The five fields are the whole payload: no URL, path, query string, referrer, user agent, position or
 * free text can be expressed, and `strictObject` rejects any other key. `id` is the opaque per-page-load
 * id the web-vitals library makes (letters, digits, `_` and `-`); the server validates it and discards it.
 * Values are milliseconds except CLS, which has no unit; the bounds only reject absurd numbers.
 */
const vitalValue = (max: number) => v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(max));
const VITAL_MAX_MS = 600_000;
const vitalRating = v.picklist(["good", "needs-improvement", "poor"]);
const vitalNavigationType = v.picklist([
  "navigate",
  "reload",
  "back-forward",
  "back-forward-cache",
  "prerender",
  "restore",
]);
const vitalId = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{1,64}$/u));
const vitalEntries = (max: number) => ({
  value: vitalValue(max),
  rating: vitalRating,
  navigationType: vitalNavigationType,
  id: vitalId,
});

export const webVitalPayloadSchema = v.pipe(
  v.variant("name", [
    v.strictObject({ name: v.literal("CLS"), ...vitalEntries(100) }),
    v.strictObject({ name: v.literal("INP"), ...vitalEntries(VITAL_MAX_MS) }),
    v.strictObject({ name: v.literal("LCP"), ...vitalEntries(VITAL_MAX_MS) }),
  ]),
  v.readonly(),
);

export type WebVitalPayload = v.InferOutput<typeof webVitalPayloadSchema>;

export function parseWebVitalPayload(body: unknown): WebVitalPayload {
  return v.parse(webVitalPayloadSchema, body);
}

export function isWebVitalPayload(body: unknown): body is WebVitalPayload {
  return v.is(webVitalPayloadSchema, body);
}
