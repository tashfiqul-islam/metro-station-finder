import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { isRecord } from "./guards.ts";

const root = resolve(import.meta.dir, "..");
const read = (file: string) => readFile(join(root, file), "utf8");

async function markdownFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await markdownFiles(path)));
    else if (entry.name.endsWith(".md")) found.push(path);
  }
  return found;
}

const BANNER = "Historical baseline: legacy implementation references";

/**
 * Documents that may still carry the banner because they quote the legacy baseline (METRO-51).
 * A document that describes the rebuild must not: remove it from this list when its banner goes.
 * The base-branch agreement across CONTRIBUTING, workflow and plane is `bun run branches:check`.
 */
const LEGACY_BANNER_ALLOWED = new Set([
  "AGENTS.md",
  "docs/agents/api.md",
  "docs/agents/architecture.md",
  "docs/agents/observability.md",
  "docs/agents/ui.md",
  "docs/agents/workflow.md",
  "docs/evidence/audit-2026-11.md",
  "docs/evidence/metro-8.md",
  "docs/evidence/metro-9.md",
  "docs/product/feature-parity.md",
  "docs/product/glossary.md",
  "docs/superpowers/plans/2026-11-02-bootstrap-evidence.md",
]);

test("METRO-51 only documents on the legacy-quoting list carry the Historical baseline banner", async () => {
  const carrying: string[] = [];
  for (const file of [
    "AGENTS.md",
    "README.md",
    "CONTRIBUTING.md",
    ...(await markdownFiles("docs")),
  ])
    if ((await read(file)).includes(BANNER)) carrying.push(file);
  expect(carrying.filter((file) => !LEGACY_BANNER_ALLOWED.has(file))).toEqual([]);
});

test("METRO-51 testing.md and security.md describe the rebuild and carry no legacy banner", async () => {
  for (const file of ["docs/agents/testing.md", "docs/agents/security.md"])
    expect(await read(file), file).not.toContain("Historical baseline");
});

test("METRO-51 agent guidance names no stale statement", async () => {
  const stale: [RegExp, string][] = [
    [/while pending/iu, "METRO-9 has landed; link the local parity and glossary documents"],
    [/REST\/OpenAPI contracts/u, "ADR-0003 chose plain fetch with Valibot schemas"],
    [
      /\.codex\/plugins/u,
      "the active agent is Claude Code; pins describe reviewed bytes, not one machine path",
    ],
    [/permissions\.md/u, "docs/agents/permissions.md was removed"],
    [/authorization hook/iu, "the authorization hook was removed"],
  ];
  const files = [
    "README.md",
    "docs/development.md",
    "docs/examples/plane-preparation/README.md",
    ...(await markdownFiles("docs/agents")),
  ];
  const hits: string[] = [];
  for (const file of files) {
    const body = await read(file);
    for (const [pattern, why] of stale) if (pattern.test(body)) hits.push(`${file}: ${why}`);
  }
  expect(hits).toEqual([]);
});

test("METRO-51 domain.md lists packages/contracts in its layout", async () => {
  expect(await read("docs/agents/domain.md")).toContain("packages/");
  expect(await read("docs/agents/domain.md")).toMatch(
    /packages\/\s+\(core, contracts\)|packages\/contracts/u,
  );
});

test("METRO-51 the skills lock states what it pins and for which agent", async () => {
  const text = await read("docs/agents/skills.lock.json");
  const lock: unknown = JSON.parse(text);
  expect(isRecord(lock)).toBe(true);
  if (!isRecord(lock)) return;
  expect(lock["agent"]).toBe("claude-code");
  expect(typeof lock["pins"]).toBe("string");
  expect(text).not.toContain(".codex-plugin");
  expect(text).not.toMatch(/Installed Codex/u);
  expect(text).not.toMatch(/[A-Za-z]:[\\/]Users/u);
});

test("METRO-51 quality-gates documents the hook bypass policy and local signature verification", async () => {
  const gates = await read("docs/agents/quality-gates.md");
  for (const needle of [
    "## Hook bypass policy",
    "CI is authoritative",
    "HK_SKIP_STEPS",
    "HK_SKIP_HOOK",
    "--no-verify",
    "## Verify signatures locally",
    "gpg.ssh.allowedSignersFile",
    "git verify-commit",
  ])
    expect(gates, needle).toContain(needle);
});
