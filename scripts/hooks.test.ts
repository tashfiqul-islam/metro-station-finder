import { expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";

// Every fixture command runs with GIT_* removed so a hook invoking this suite can never
// redirect git into the caller's real repository.
const env = () => ({ ...cleanGitEnv(), HK_MISE: "0" });

function runner(defaultCwd: string) {
  const run = (args: string[], cwd = defaultCwd) => Bun.spawnSync(args, { cwd, env: env() });
  const ok = (args: string[], cwd = defaultCwd) => {
    const result = run(args, cwd);
    expect(result.stdout.toString() + result.stderr.toString()).not.toContain("PANIC");
    if (result.exitCode !== 0)
      throw new Error(`${args.join(" ")}: ${result.stdout.toString()}${result.stderr.toString()}`);
    return result.stdout.toString();
  };
  return { run, ok };
}

async function configureFixture(root: string, ok: (args: string[]) => string) {
  ok(["git", "init", "-b", "main"]);
  ok(["git", "config", "user.email", "fixture@example.invalid"]);
  ok(["git", "config", "user.name", "Hook fixture"]);
  ok(["git", "config", "core.autocrlf", "false"]);
  // Only this disposable repository disables signing; real commits remain signed.
  ok(["git", "config", "commit.gpgsign", "false"]);
  // The commit-msg hook runs the repository script, so the fixture carries it.
  await mkdir(join(root, "scripts"));
  for (const file of ["commit-message.ts", "git-env.ts"])
    await copyFile(resolve("scripts", file), join(root, "scripts", file));
}

test("installed hooks inspect staged bytes and restore failed snapshots in linked worktrees", async () => {
  const root = await mkdtemp(join(tmpdir(), "metro-hooks-"));
  const linked = `${root}-linked`;
  const { run, ok } = runner(root);
  try {
    await configureFixture(root, ok);
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { "check:fast": "node gate.cjs" } }),
    );
    await writeFile(
      join(root, "gate.cjs"),
      "if (require('node:fs').readFileSync('sample.txt','utf8').includes('BAD')) process.exit(1);",
    );
    await writeFile(join(root, "sample.txt"), "GOOD base\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "chore: fixture baseline"]);
    ok(["hk", "install"]);
    await writeFile(join(root, "sample.txt"), "GOOD staged\n");
    ok(["git", "add", "sample.txt"]);
    await writeFile(join(root, "sample.txt"), "BAD unstaged\n");
    await writeFile(join(root, "untracked.txt"), "keep me\n");
    ok(["git", "commit", "-m", "test: staged snapshot passes"]);
    expect(ok(["git", "show", "HEAD:sample.txt"])).toBe("GOOD staged\n");
    expect(await readFile(join(root, "sample.txt"), "utf8")).toBe("BAD unstaged\n");
    await writeFile(join(root, "sample.txt"), "BAD staged\n");
    ok(["git", "add", "sample.txt"]);
    await writeFile(join(root, "sample.txt"), "GOOD unstaged\n");
    const before = ok(["git", "status", "--porcelain=v1"]);
    expect(run(["git", "commit", "-m", "test: must fail"]).exitCode).not.toBe(0);
    expect(ok(["git", "status", "--porcelain=v1"])).toBe(before);
    expect(ok(["git", "show", ":sample.txt"])).toBe("BAD staged\n");
    expect(await readFile(join(root, "sample.txt"), "utf8")).toBe("GOOD unstaged\n");
    expect(await readFile(join(root, "untracked.txt"), "utf8")).toBe("keep me\n");
    expect(ok(["git", "stash", "list"])).toBe("");
    ok(["git", "worktree", "add", "-b", "linked-fixture", linked]);
    ok(["hk", "install"], linked);
    await writeFile(join(linked, "sample.txt"), "GOOD linked\n");
    ok(["git", "add", "sample.txt"], linked);
    ok(["git", "commit", "-m", "test: linked hooks pass"], linked);
  } finally {
    await rm(linked, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("installed pre-push hook blocks a failing canonical check and allows a passing one", async () => {
  const root = await mkdtemp(join(tmpdir(), "metro-prepush-"));
  const remote = `${root}-remote`;
  const { run, ok } = runner(root);
  const stub = "node -e 0";
  try {
    ok(["git", "init", "--bare", "-b", "main", remote], tmpdir());
    await configureFixture(root, ok);
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        scripts: {
          "check:fast": stub,
          check: "node check.cjs",
          build: stub,
          smoke: stub,
          "bundle:check": stub,
          scan: stub,
        },
      }),
    );
    await writeFile(
      join(root, "check.cjs"),
      "if (require('node:fs').existsSync('FAIL')) process.exit(1);",
    );
    await writeFile(join(root, "FAIL"), "block\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "chore: fixture baseline"]);
    ok(["git", "remote", "add", "origin", remote]);
    ok(["hk", "install"]);
    expect(run(["git", "push", "origin", "main"]).exitCode).not.toBe(0);
    expect(ok(["git", "ls-remote", "--heads", "origin"])).toBe("");
    await rm(join(root, "FAIL"));
    ok(["git", "add", "-A"]);
    ok(["git", "commit", "-m", "test: remove failing marker"]);
    ok(["git", "push", "origin", "main"]);
    expect(ok(["git", "ls-remote", "--heads", "origin"])).toContain("refs/heads/main");
  } finally {
    await rm(remote, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
}, 120000);
