import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  BANNER,
  OPEN_TICKET_LINKS,
  bannerProblems,
  fileStructureBlock,
  staleProblems,
} from "./docs-drift.ts";
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

/** Documents that may carry the banner, each with the reason it still consists of legacy references. */
const BANNER_ALLOWED: ReadonlyMap<string, string> = new Map([
  ["docs/product/feature-parity.md", "records the legacy baseline's behavior, pinned to af903d7"],
  ["docs/product/glossary.md", "defines baseline terms cited to af903d7 source"],
  ["docs/evidence/metro-8.md", "dated METRO-8 evidence reviewed at af903d7"],
  ["docs/evidence/metro-9.md", "dated METRO-9 evidence reproduced at af903d7"],
  [
    "docs/superpowers/plans/2026-11-02-bootstrap-evidence.md",
    "dated plan for the METRO-8 baseline",
  ],
]);

test("METRO-51 bannerProblems requires a baseline citation and labels rebuild claims", () => {
  const banner = `${BANNER} concern commit af903d7.`;
  expect(bannerProblems(`${banner}\n\nOnly rebuild prose.`)).toHaveLength(1);
  expect(bannerProblems(`${banner}\n\nSee [src](x/af903d7/y.ts).`)).toEqual([]);
  const unlabelled = `${banner}\n\nSee af903d7.\n\n**Repo-verified:** \`bun run check\` runs in CI.`;
  expect(bannerProblems(unlabelled)).toHaveLength(1);
  const labelled = `${banner}\n\nSee af903d7.\n\n**Repo-verified (legacy baseline):** \`scripts/x.ts\` is absent.`;
  expect(bannerProblems(labelled)).toEqual([]);
});

test("METRO-51 a file may carry the banner only with a listed reason, a baseline citation and no unlabelled rebuild claim", async () => {
  const problems: string[] = [];
  const files = ["AGENTS.md", "README.md", "CONTRIBUTING.md", ...(await markdownFiles("docs"))];
  for (const file of files) {
    const text = await read(file);
    if (!text.includes(BANNER)) continue;
    if (!BANNER_ALLOWED.has(file))
      problems.push(`${file}: carries the banner without a listed reason`);
    for (const problem of bannerProblems(text)) problems.push(`${file}: ${problem}`);
  }
  expect(problems).toEqual([]);
});

test("METRO-51 every banner exemption names a file that exists and still carries the banner", async () => {
  for (const [file, reason] of BANNER_ALLOWED) {
    expect(reason.length, file).toBeGreaterThan(10);
    expect(await read(file), file).toContain(BANNER);
  }
});

test("METRO-51 staleProblems flags each drift class and spares true statements", () => {
  for (const stale of [
    "Read it while pending.",
    "until landed, consult the ticket",
    "scans are pending METRO-12",
    "run the proposed checks",
    "Keep clients on REST/OpenAPI contracts.",
    "C:/Users/x/.codex/plugins/cache",
    "see docs/agents/permissions.md",
    "the authorization hook runs",
    "[t](https://app.plane.so/metro-station-finder/browse/METRO-9/)",
  ])
    expect(staleProblems(stale), stale).toHaveLength(1);
  for (const fine of [
    "there is no OpenAPI document",
    "a REST/OpenAPI layer needs a new ADR",
    "[t](https://app.plane.so/metro-station-finder/browse/METRO-15/)",
  ])
    expect(staleProblems(fine), fine).toEqual([]);
  expect([...OPEN_TICKET_LINKS.keys()]).toEqual(["METRO-15"]);
});

test("METRO-51 agent-facing documents carry no stale statement", async () => {
  const files = [
    "README.md",
    "CONTRIBUTING.md",
    "AGENTS.md",
    "docs/development.md",
    ...(await markdownFiles("docs/agents")),
    ...(await markdownFiles("docs/product")),
    ...(await markdownFiles("docs/templates")),
    ...(await markdownFiles("docs/examples")),
  ];
  const hits: string[] = [];
  for (const file of files)
    for (const problem of staleProblems(await read(file))) hits.push(`${file}: ${problem}`);
  expect(hits).toEqual([]);
});

test("METRO-51 domain.md layout block lists contracts under packages", async () => {
  const block = fileStructureBlock(await read("docs/agents/domain.md"));
  const packages = block.find((line) => line.includes("packages/")) ?? "";
  expect(packages).toMatch(/\bcore\b/u);
  expect(packages).toMatch(/\bcontracts\b/u);
  expect(fileStructureBlock("## File structure\n\n```\n└── packages/  (core)\n```")).toEqual([
    "└── packages/  (core)",
    "",
  ]);
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

test("METRO-51 skills.md marks any Codex install route as historical evidence", async () => {
  const skills = await read("docs/agents/skills.md");
  const undated = skills
    .split(/\r?\n/u)
    .filter((line) => /\bCodex\b/u.test(line))
    .filter((line) => !/historical|METRO-10|2026-11-03/iu.test(line));
  expect(undated).toEqual([]);
});

test("METRO-51 quality-gates keeps a no-bypass policy with an owner-only emergency step skip", async () => {
  const gates = await read("docs/agents/quality-gates.md");
  const policy = gates.split("## Hook bypass policy")[1]?.split(/^## /mu)[0] ?? "";
  for (const needle of [
    "No bypass is the default.",
    "Agents never bypass hooks or signing",
    "never replaces CI",
    "CI is authoritative",
    "HK_SKIP_STEPS=build git push",
    "$env:HK_SKIP_STEPS = 'build'; git push; Remove-Item Env:HK_SKIP_STEPS",
    "https://hk.jdx.dev/environment_variables.html",
  ])
    expect(policy, needle).toContain(needle);
  expect(policy).not.toContain("HK_SKIP_HOOK");
  const noVerify = policy.split(/\r?\n/u).filter((line) => line.includes("--no-verify"));
  for (const line of noVerify) expect(line).toContain("Never use");
  expect(policy).not.toMatch(/Use them only|Allowed, narrowest/u);

  const signing = gates.split("## Verify signatures locally")[1]?.split(/^## /mu)[0] ?? "";
  for (const needle of [
    "git config --get gpg.format",
    "git config --get commit.gpgsign",
    "git config --get gpg.ssh.allowedSignersFile",
    "git verify-commit HEAD",
  ])
    expect(signing, needle).toContain(needle);
  expect(signing).not.toMatch(/this machine/iu);
});
