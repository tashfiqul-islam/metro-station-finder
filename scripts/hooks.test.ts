import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("installed hooks inspect staged bytes and restore failed snapshots in linked worktrees", async () => {
  const root = await mkdtemp(join(tmpdir(), "metro-hooks-"));
  const linked = `${root}-linked`;
  const run = (args: string[], cwd = root) =>
    Bun.spawnSync(args, { cwd, env: { ...process.env, HK_MISE: "0" } });
  const ok = (args: string[], cwd = root) => {
    const result = run(args, cwd);
    expect(result.stdout.toString() + result.stderr.toString()).not.toContain("PANIC");
    if (result.exitCode !== 0)
      throw new Error(`${args.join(" ")}: ${result.stdout.toString()}${result.stderr.toString()}`);
    return result.stdout.toString();
  };
  try {
    ok(["git", "init"]);
    ok(["git", "config", "user.email", "fixture@example.invalid"]);
    ok(["git", "config", "user.name", "Hook fixture"]);
    ok(["git", "config", "core.autocrlf", "false"]);
    // Only this disposable repository disables signing; real commits remain signed.
    ok(["git", "config", "commit.gpgsign", "false"]);
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
    ok(["git", "commit", "-m", "Fixture baseline"]);
    ok(["hk", "install"]);
    await writeFile(join(root, "sample.txt"), "GOOD staged\n");
    ok(["git", "add", "sample.txt"]);
    await writeFile(join(root, "sample.txt"), "BAD unstaged\n");
    await writeFile(join(root, "untracked.txt"), "keep me\n");
    ok(["git", "commit", "-m", "Staged snapshot passes"]);
    expect(ok(["git", "show", "HEAD:sample.txt"])).toBe("GOOD staged\n");
    expect(await readFile(join(root, "sample.txt"), "utf8")).toBe("BAD unstaged\n");
    await writeFile(join(root, "sample.txt"), "BAD staged\n");
    ok(["git", "add", "sample.txt"]);
    await writeFile(join(root, "sample.txt"), "GOOD unstaged\n");
    const before = ok(["git", "status", "--porcelain=v1"]);
    expect(run(["git", "commit", "-m", "Must fail"]).exitCode).not.toBe(0);
    expect(ok(["git", "status", "--porcelain=v1"])).toBe(before);
    expect(ok(["git", "show", ":sample.txt"])).toBe("BAD staged\n");
    expect(await readFile(join(root, "sample.txt"), "utf8")).toBe("GOOD unstaged\n");
    expect(await readFile(join(root, "untracked.txt"), "utf8")).toBe("keep me\n");
    expect(ok(["git", "stash", "list"])).toBe("");
    ok(["git", "worktree", "add", "-b", "linked-fixture", linked]);
    ok(["hk", "install"], linked);
    await writeFile(join(linked, "sample.txt"), "GOOD linked\n");
    ok(["git", "add", "sample.txt"], linked);
    ok(["git", "commit", "-m", "Linked hooks pass"], linked);
  } finally {
    await rm(linked, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
}, 60000);
