import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { cleanGitEnv } from "./git-env";

const run = (args: string[], cwd: string) =>
  Bun.spawnSync(args, { cwd, env: cleanGitEnv(), stdout: "pipe", stderr: "pipe" });

const ok = (args: string[], cwd: string) => {
  const result = run(args, cwd);
  if (result.exitCode !== 0) throw new Error(`${args.join(" ")}: ${result.stderr.toString()}`);
};

test("FND-S6 history scan fails visibly on a shallow clone", async () => {
  const base = await mkdtemp(join(tmpdir(), "metro-history-"));
  try {
    const source = join(base, "source");
    await mkdir(source);
    ok(["git", "init", "-b", "main"], source);
    ok(["git", "config", "user.email", "fixture@example.invalid"], source);
    ok(["git", "config", "user.name", "History fixture"], source);
    ok(["git", "config", "commit.gpgsign", "false"], source);
    for (const name of ["one", "two"]) {
      await writeFile(join(source, `${name}.txt`), `${name}\n`);
      ok(["git", "add", "."], source);
      ok(["git", "commit", "-m", `chore: ${name}`], source);
    }
    const shallow = join(base, "shallow");
    ok(["git", "clone", "--depth", "1", pathToFileURL(source).href, shallow], base);
    const result = run(["node", resolve("scripts/secrets.ts"), "--history", shallow], resolve("."));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("full clone");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}, 60000);
