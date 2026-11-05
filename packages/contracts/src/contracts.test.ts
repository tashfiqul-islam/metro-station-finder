import { getScaffoldStatus } from "@metro/core";

import {
  errorEnvelopeSchema,
  parseErrorEnvelope,
  parseScaffoldStatus,
  scaffoldStatusSchema,
} from "./index";

const valid = { kind: "synthetic-scaffold", ready: true } as const;

test("FND-R4 accepts the synthetic status produced by core", () => {
  expect(parseScaffoldStatus(getScaffoldStatus())).toEqual(valid);
  expect(parseScaffoldStatus(valid)).toEqual(valid);
});

for (const [name, body, reason] of [
  [
    "ready: false",
    { kind: "synthetic-scaffold", ready: false },
    "Expected true but received false",
  ],
  ["missing kind", { ready: true }, 'Expected "kind" but received undefined'],
  [
    "wrong kind",
    { kind: "other", ready: true },
    'Expected "synthetic-scaffold" but received "other"',
  ],
  [
    "extra field",
    { kind: "synthetic-scaffold", ready: true, extra: 1 },
    'Expected never but received "extra"',
  ],
  ["null", null, "Expected Object but received null"],
  ["array", [], 'Expected "kind" but received undefined'],
  ["string", "synthetic-scaffold", 'Expected Object but received "synthetic-scaffold"'],
] as const) {
  test(`FND-R4 rejects status body: ${name}`, () => {
    expect(() => parseScaffoldStatus(body)).toThrow(reason);
  });
}

test("FND-R4 exposes a Standard Schema v1 interface", () => {
  expect(scaffoldStatusSchema["~standard"].version).toBe(1);
  expect(errorEnvelopeSchema["~standard"].version).toBe(1);
  const result = scaffoldStatusSchema["~standard"].validate({ ready: false });
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
  const withExtra = { kind: "synthetic-scaffold", ready: true, addedLater: "x" };
  expect(() => parseScaffoldStatus(withExtra)).toThrow('Expected never but received "addedLater"');
  const errorWithExtra = { error: { code: "not_found", message: "m" }, requestId: "r" };
  expect(() => parseErrorEnvelope(errorWithExtra)).toThrow(
    'Expected never but received "requestId"',
  );
});

test("METRO-53 ADR-0013 a response field of the wrong type is rejected", () => {
  expect(() => parseScaffoldStatus({ kind: "synthetic-scaffold", ready: "true" })).toThrow(
    'Expected true but received "true"',
  );
  expect(() => parseScaffoldStatus({ kind: 1, ready: true })).toThrow(
    'Expected "synthetic-scaffold" but received 1',
  );
  expect(() => parseErrorEnvelope({ error: { code: "a", message: 1 } })).toThrow(
    "Expected string but received 1",
  );
});

test("METRO-53 ADR-0013 contract objects are strict_object, the rule request schemas must follow", () => {
  // No request schema exists yet (the only route is GET). A request schema added later must also
  // be a v.strictObject; ADR-0013 keeps requests strict.
  expect(scaffoldStatusSchema.pipe[0].type).toBe("strict_object");
  expect(errorEnvelopeSchema.pipe[0].type).toBe("strict_object");
  expect(errorEnvelopeSchema.pipe[0].entries.error.type).toBe("strict_object");
});
