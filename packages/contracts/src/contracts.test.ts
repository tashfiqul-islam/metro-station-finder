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
