import { afterEach, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCoreBoundary, runBoundaryCheck } from "./boundaries";
import { runCiResults } from "./ci-results";
import { commitMessageMain, runCommitMessageCli, validateRange } from "./commit-message";
import { cleanGitEnv } from "./git-env";
import { runLinkCheck } from "./links";

afterEach(() => {
  process.exitCode = 0;
});

function quiet() {
  return {
    log: spyOn(console, "log").mockImplementation(() => {}),
    error: spyOn(console, "error").mockImplementation(() => {}),
  };
}

async function tempRoot() {
  return mkdtemp(join(tmpdir(), "metro-cli-"));
}

test("FND-T1 runCiResults passes only when every required job succeeded", () => {
  const spies = quiet();
  try {
    const ok = JSON.stringify({
      checks: { result: "success" },
      build: { result: "success" },
      security: { result: "success" },
    });
    runCiResults({ REQUIRED_JOB_RESULTS: ok });
    expect(spies.log).toHaveBeenCalledWith("All required quality jobs succeeded");
    expect(() => runCiResults({})).toThrow("Required quality jobs did not all succeed");
    expect(() =>
      runCiResults({ REQUIRED_JOB_RESULTS: JSON.stringify({ checks: { result: "failure" } }) }),
    ).toThrow("Required quality jobs did not all succeed");
  } finally {
    spies.log.mockRestore();
    spies.error.mockRestore();
  }
});

test("FND-T1 runBoundaryCheck reports success and failure through the exit code", async () => {
  const spies = quiet();
  const root = await tempRoot();
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "package.json"), "{}");
    await writeFile(join(root, "src", "ok.ts"), "export const a = 1;\n");
    await runBoundaryCheck(root);
    expect(spies.log).toHaveBeenCalledWith("Core boundary passed");
    expect(process.exitCode ?? 0).toBe(0);
    await writeFile(join(root, "src", "bad.ts"), "import 'hono';\n");
    await runBoundaryCheck(root);
    expect(process.exitCode).toBe(1);
    expect(String(spies.error.mock.calls[0]?.[0])).toContain("external module hono");
  } finally {
    spies.log.mockRestore();
    spies.error.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

test("FND-T1 the core boundary walks nested folders and rejects symlinks, require and import types", async () => {
  const root = await tempRoot();
  try {
    await mkdir(join(root, "src", "nested"), { recursive: true });
    await writeFile(join(root, "package.json"), "{}");
    await writeFile(join(root, "src", "nested", "deep.ts"), "import 'hono';\n");
    await writeFile(join(root, "src", "eq.ts"), "import x = require('node:fs'); export { x };\n");
    await writeFile(join(root, "src", "type.ts"), "export type T = import('react').FC;\n");
    await mkdir(join(root, "elsewhere"));
    await symlink(join(root, "elsewhere"), join(root, "src", "link"), "junction");
    const errors = (await checkCoreBoundary(root)).join("\n");
    expect(errors).toContain("deep.ts: external module hono");
    expect(errors).toContain("eq.ts: external module node:fs");
    expect(errors).toContain("type.ts: external module react");
    expect(errors).toContain("cannot contain a symlink");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("FND-T1 runLinkCheck lists Git-known Markdown and sets the exit code", async () => {
  const spies = quiet();
  const root = await tempRoot();
  const git = (...args: string[]) =>
    Bun.spawnSync(["git", ...args], { cwd: root, env: cleanGitEnv() });
  try {
    git("init", "-b", "main");
    await writeFile(join(root, "a.md"), "# A\n\n[b](b.md)\n");
    await writeFile(join(root, "b.md"), "# B\n");
    await runLinkCheck(root);
    expect(spies.log).toHaveBeenCalledWith("Links ok: 2 Markdown files");
    await writeFile(join(root, "a.md"), "# A\n\n[gone](missing.md)\n");
    await runLinkCheck(root);
    expect(process.exitCode).toBe(1);
    expect(String(spies.error.mock.calls.at(-1)?.[0])).toContain("a.md:3");
  } finally {
    spies.log.mockRestore();
    spies.error.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

test("FND-T1 runCommitMessageCli handles files, ranges and misuse", async () => {
  const root = await tempRoot();
  try {
    const file = join(root, "MSG");
    await writeFile(file, "feat: add x\n");
    expect(runCommitMessageCli([file])).toEqual([]);
    await writeFile(file, "update stuff\n");
    expect(runCommitMessageCli([file])[0]).toContain("update stuff");
    expect(() => runCommitMessageCli([])).toThrow("Usage");
    expect(() => runCommitMessageCli(["--range"])).toThrow("Usage");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("FND-T1 validateRange and commitMessageMain report invalid commits and exit codes", async () => {
  const spies = quiet();
  const root = await tempRoot();
  const git = (...args: string[]) => {
    const result = Bun.spawnSync(["git", ...args], { cwd: root, env: cleanGitEnv() });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  };
  try {
    git("init", "-b", "main");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "user.name", "Range fixture");
    git("config", "commit.gpgsign", "false");
    await writeFile(join(root, "a.txt"), "1\n");
    git("add", ".");
    git("commit", "-m", "feat: base");
    await writeFile(join(root, "a.txt"), "2\n");
    git("commit", "-am", "update stuff");
    expect(validateRange("HEAD~1..HEAD", root)).toHaveLength(1);
    expect(validateRange("HEAD~1..HEAD~1", root)).toEqual([]);
    expect(commitMessageMain([])).toBe(1);
    const file = join(root, "MSG");
    await writeFile(file, "feat: ok\n");
    expect(commitMessageMain([file])).toBe(0);
    await writeFile(file, "bad subject\n");
    expect(commitMessageMain([file])).toBe(1);
  } finally {
    spies.log.mockRestore();
    spies.error.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});
