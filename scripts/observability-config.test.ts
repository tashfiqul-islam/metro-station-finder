import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${where} must be an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

// Wrangler environments are configured per environment, so each one is asserted on its own.
const config = asRecord(
  Bun.JSONC.parse(readFileSync("apps/api/wrangler.jsonc", "utf8")),
  "wrangler.jsonc",
);
const environments = asRecord(config["env"], "env");

const blocks: [string, unknown][] = [
  ["default (production)", config["observability"]],
  ...Object.entries(environments).map(([name, env]): [string, unknown] => [
    name,
    asRecord(env, `env.${name}`)["observability"],
  ]),
];

test("METRO-43 production and preview are both declared", () => {
  expect(blocks.map(([name]) => name)).toEqual(["default (production)", "preview"]);
});

for (const [name, block] of blocks) {
  test(`METRO-43 ${name} sets observability explicitly, never platform defaults`, () => {
    const observability = asRecord(block, `${name} observability`);
    expect(observability["enabled"]).toBe(true);
    expect(observability["head_sampling_rate"]).toBe(1);
    expect(observability["redact_query_string"]).toBe(true);
    expect(asRecord(observability["logs"], "logs")["invocation_logs"]).toBe(false);
    expect(asRecord(observability["traces"], "traces")["enabled"]).toBe(false);
  });
}
