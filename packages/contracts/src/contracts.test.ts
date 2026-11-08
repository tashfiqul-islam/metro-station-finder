import {
  errorEnvelopeSchema,
  isWebVitalPayload,
  parseErrorEnvelope,
  parseWebVitalPayload,
  webVitalPayloadSchema,
} from "./index";

test("FND-R4 exposes a Standard Schema v1 interface", () => {
  expect(errorEnvelopeSchema["~standard"].version).toBe(1);
  const result = errorEnvelopeSchema["~standard"].validate({ error: {} });
  if (result instanceof Promise) throw new Error("expected a synchronous validation result");
  expect(result.issues).toBeDefined();
});

test("FND-R4 error envelope accepts { error: { code, message } } only", () => {
  const envelope = { error: { code: "not_found", message: "No such route" } };
  expect(parseErrorEnvelope(envelope)).toEqual(envelope);
  for (const [body, reason] of [
    [{}, 'Expected "error" but received undefined'],
    [{ error: {} }, 'Expected "code" but received undefined'],
    [{ error: { code: "not_found" } }, 'Expected "message" but received undefined'],
    [{ error: { code: "", message: "x" } }, "Invalid length: Expected !0 but received 0"],
    [{ error: { code: "a", message: "b", extra: 1 } }, 'Expected never but received "extra"'],
    [{ error: { code: 1, message: "b" } }, "Expected string but received 1"],
  ] as const)
    expect(() => parseErrorEnvelope(body)).toThrow(reason);
});

// ADR-0013 (b): response schemas stay strict for now. These tests pin that. A later move to
// tolerant readers (accepting unknown response fields) must change them on purpose, through a
// new ADR and an owner decision, not by loosening an assertion here.
test("METRO-53 ADR-0013 a response with an extra field is rejected by the strict response schema", () => {
  const errorWithExtra = { error: { code: "not_found", message: "m" }, requestId: "r" };
  expect(() => parseErrorEnvelope(errorWithExtra)).toThrow(
    'Expected never but received "requestId"',
  );
});

test("METRO-53 ADR-0013 a response field of the wrong type is rejected", () => {
  expect(() => parseErrorEnvelope({ error: { code: "a", message: 1 } })).toThrow(
    "Expected string but received 1",
  );
});

test("METRO-53 ADR-0013 contract objects are strict_object, the rule request schemas must follow", () => {
  // The one request schema (webVitalPayloadSchema, METRO-44) is pinned below; a request schema added
  // later must also be strict objects; ADR-0013 keeps requests strict.
  expect(errorEnvelopeSchema.pipe[0].type).toBe("strict_object");
  expect(errorEnvelopeSchema.pipe[0].entries.error.type).toBe("strict_object");
});

// METRO-44 part B: the web-vitals beacon payload. Strict, five fields, no way to carry a URL or a position.
const vital = {
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
  id: "v5-1731000000000-4567890123456",
} as const;

test("METRO-44 web vital payload accepts exactly name, value, rating, navigationType and id", () => {
  expect(parseWebVitalPayload(vital)).toEqual(vital);
  expect(isWebVitalPayload(vital)).toBe(true);
  for (const name of ["CLS", "INP", "LCP"] as const)
    expect(isWebVitalPayload({ ...vital, name, value: 0 })).toBe(true);
  for (const name of ["FCP", "TTFB"]) expect(isWebVitalPayload({ ...vital, name })).toBe(false);
  for (const navigationType of [
    "navigate",
    "reload",
    "back-forward",
    "back-forward-cache",
    "prerender",
    "restore",
  ] as const)
    expect(isWebVitalPayload({ ...vital, navigationType })).toBe(true);
  for (const rating of ["good", "needs-improvement", "poor"] as const)
    expect(isWebVitalPayload({ ...vital, rating })).toBe(true);
});

test("METRO-44 web vital payload rejects every extra key, including positions, URLs and queries", () => {
  for (const extra of [
    { lat: 23.8 },
    { lng: 90.4 },
    { latitude: 1 },
    { longitude: 1 },
    { location: "x" },
    { q: "motijheel" },
    { query: "a=b" },
    { url: "https://example.test/?lat=1" },
    { path: "/x" },
    { referrer: "https://example.test/" },
    { userAgent: "x" },
    { delta: 1 },
    { entries: [] },
    { navigationURL: "https://example.test/" },
  ])
    expect(isWebVitalPayload({ ...vital, ...extra }), JSON.stringify(extra)).toBe(false);
  expect(() => parseWebVitalPayload({ ...vital, lat: 1 })).toThrow(
    'Expected never but received "lat"',
  );
});

test("METRO-44 web vital payload rejects bad names, values, ratings, navigation types and ids", () => {
  const bad: unknown[] = [
    null,
    "LCP",
    [],
    {},
    { ...vital, name: "FID" },
    { ...vital, name: "lcp" },
    { ...vital, value: -1 },
    { ...vital, value: Number.NaN },
    { ...vital, value: Number.POSITIVE_INFINITY },
    { ...vital, value: "1" },
    { ...vital, value: 600_001 },
    { ...vital, name: "CLS", value: 101 },
    { ...vital, rating: "ok" },
    { ...vital, navigationType: "soft-navigation" },
    { ...vital, id: "" },
    { ...vital, id: "x".repeat(65) },
    { ...vital, id: "a b" },
    { ...vital, id: "a?lat=23.8" },
    { ...vital, id: "a/b" },
    { ...vital, id: 1 },
  ];
  for (const body of bad) expect(isWebVitalPayload(body), JSON.stringify(body)).toBe(false);
  const { id: _omitted, ...withoutId } = vital;
  expect(isWebVitalPayload(withoutId)).toBe(false);
});

test("METRO-44 web vital payload bounds: CLS tops out at 100, other metrics at 600000 ms", () => {
  expect(isWebVitalPayload({ ...vital, name: "CLS", value: 100 })).toBe(true);
  expect(isWebVitalPayload({ ...vital, value: 600_000 })).toBe(true);
  expect(webVitalPayloadSchema.pipe[0].type).toBe("variant");
});
