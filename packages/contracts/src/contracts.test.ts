import { expect, test } from "bun:test";
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

for (const [name, body] of [
  ["ready: false", { kind: "synthetic-scaffold", ready: false }],
  ["missing kind", { ready: true }],
  ["wrong kind", { kind: "other", ready: true }],
  ["extra field", { kind: "synthetic-scaffold", ready: true, extra: 1 }],
  ["null", null],
  ["array", []],
  ["string", "synthetic-scaffold"],
] as const) {
  test(`FND-R4 rejects status body: ${name}`, () => {
    expect(() => parseScaffoldStatus(body)).toThrow();
  });
}

test("FND-R4 exposes a Standard Schema v1 interface", () => {
  expect(scaffoldStatusSchema["~standard"].version).toBe(1);
  expect(errorEnvelopeSchema["~standard"].version).toBe(1);
  const result = scaffoldStatusSchema["~standard"].validate({ ready: false });
  expect(result instanceof Promise).toBe(false);
  expect((result as { issues?: unknown }).issues).toBeDefined();
});

test("FND-R4 error envelope accepts { error: { code, message } } only", () => {
  const envelope = { error: { code: "not_found", message: "No such route" } };
  expect(parseErrorEnvelope(envelope)).toEqual(envelope);
  for (const body of [
    {},
    { error: {} },
    { error: { code: "not_found" } },
    { error: { code: "", message: "x" } },
    { error: { code: "a", message: "b", extra: 1 } },
    { error: { code: 1, message: "b" } },
  ])
    expect(() => parseErrorEnvelope(body)).toThrow();
});
