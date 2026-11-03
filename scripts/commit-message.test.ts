import { expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateMessage, validateSubject } from "./commit-message";
import { cleanGitEnv } from "./git-env";

const accepted = [
  "feat(core): add x",
  "fix: handle empty list",
  "feat!: drop legacy route",
  "refactor(web)!: rename prop",
  "docs: correct guide",
  "test: add case",
  "chore: bump",
  "perf: faster scan",
  "ci: cache bun",
  "style: format",
  "build: pin tool",
  "revert: undo change",
  "Merge pull request #17 from owner/ticket/branch",
  "Merge branch 'a' into b",
  'Revert "feat: add x"',
];
const rejected = [
  "update stuff",
  "Feat: capitalised type",
  "feat add x",
  "feat:no space",
  "feat(): empty scope",
  "unknown(core): add x",
  "feat: ",
  "",
  "WIP",
];

for (const subject of accepted) {
  test(`FND-S5 accepts "${subject}"`, () => {
    expect(validateSubject(subject)).toBeNull();
  });
}
for (const subject of rejected) {
  test(`FND-S5 rejects "${subject}"`, () => {
    expect(validateSubject(subject)).not.toBeNull();
  });
}

test("FND-S5 message validation uses the first non-comment line and allows a body", () => {
  expect(
    validateMessage("# comment\nfeat(core): add x\n\nBody text.\n\nCo-Authored-By: A <a@b.c>\n"),
  ).toBeNull();
  expect(validateMessage("update stuff\n\nfeat: body line does not count\n")).not.toBeNull();
  expect(validateMessage("# only comments\n")).not.toBeNull();
});

const env = () => ({ ...cleanGitEnv(), HK_MISE: "0" });

async function repo() {
  const root = await mkdtemp(join(tmpdir(), "metro-commitmsg-"));
  const run = (args: string[]) => Bun.spawnSync(args, { cwd: root, env: env() });
  const ok = (args: string[]) => {
    const result = run(args);
    if (result.exitCode !== 0)
      throw new Error(`${args.join(" ")}: ${result.stdout.toString()}${result.stderr.toString()}`);
    return result.stdout.toString();
  };
  ok(["git", "init", "-b", "main"]);
  ok(["git", "config", "user.email", "fixture@example.invalid"]);
  ok(["git", "config", "user.name", "Commit fixture"]);
  ok(["git", "config", "core.autocrlf", "false"]);
  // Only this disposable repository disables signing; real commits remain signed.
  ok(["git", "config", "commit.gpgsign", "false"]);
  await mkdir(join(root, "scripts"));
  for (const file of ["commit-message.ts", "git-env.ts"])
    await copyFile(resolve("scripts", file), join(root, "scripts", file));
  return { root, run, ok };
}

test("FND-S5 range mode exits nonzero when any commit in the range is invalid", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    const base = ok(["git", "rev-parse", "HEAD"]).trim();
    await writeFile(join(root, "a.txt"), "2\n");
    ok(["git", "commit", "-am", "fix(core): good one"]);
    expect(run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]).exitCode).toBe(0);
    await writeFile(join(root, "a.txt"), "3\n");
    ok(["git", "commit", "-am", "update stuff"]);
    const result = run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("update stuff");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("FND-S5 range mode rejects an unresolvable range visibly", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    expect(run(["node", "scripts/commit-message.ts", "--range", "nope..HEAD"]).exitCode).not.toBe(
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("FND-S5 installed commit-msg hook rejects a bad subject and keeps the index", async () => {
  const { root, run, ok } = await repo();
  try {
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { "check:fast": "node -e 0" } }),
    );
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: baseline before hooks"]);
    ok(["hk", "install"]);
    await writeFile(join(root, "a.txt"), "2\n");
    ok(["git", "add", "a.txt"]);
    const before = ok(["git", "diff", "--cached", "--name-status"]);
    expect(run(["git", "commit", "-m", "update stuff"]).exitCode).not.toBe(0);
    expect(ok(["git", "diff", "--cached", "--name-status"])).toBe(before);
    expect(ok(["git", "log", "--format=%s"]).trim()).toBe("feat: baseline before hooks");
    ok(["git", "commit", "-m", "feat(core): add x"]);
    expect(ok(["git", "log", "-1", "--format=%s"]).trim()).toBe("feat(core): add x");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);

test("FND-S5 installed commit-msg hook accepts a Git merge subject", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: baseline"]);
    ok(["git", "switch", "-c", "side"]);
    await writeFile(join(root, "b.txt"), "b\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: side"]);
    ok(["git", "switch", "main"]);
    await writeFile(join(root, "c.txt"), "c\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: main"]);
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { "check:fast": "node -e 0" } }),
    );
    ok(["hk", "install"]);
    const merged = run(["git", "merge", "--no-ff", "side"]);
    expect(merged.exitCode).toBe(0);
    expect(ok(["git", "log", "-1", "--format=%s"])).toContain("Merge branch 'side'");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);
