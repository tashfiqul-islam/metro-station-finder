import { readFileSync } from "node:fs";
import { join } from "node:path";

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${where} must be an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

// Wrangler environments are configured per environment, so each one is asserted on its own.
const config = asRecord(
  Bun.JSONC.parse(readFileSync(join(import.meta.dir, "../apps/api/wrangler.jsonc"), "utf8")),
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

// The exact object documented in docs/agents/observability.md; any added, removed or changed key fails.
const expected = {
  enabled: true,
  logs: { enabled: true, head_sampling_rate: 1, invocation_logs: false },
  redact_query_string: true,
  traces: { enabled: false },
};

test("METRO-43 production and preview are both declared", () => {
  expect(blocks.map(([name]) => name)).toEqual(["default (production)", "preview"]);
});

for (const [name, block] of blocks) {
  test(`METRO-43 ${name} observability is exactly the documented object`, () => {
    expect(block).toEqual(expected);
  });
}
