import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";

/**
 * METRO-28: the secret scan reads what the index holds (what the next commit would contain), never
 * the working tree. Every fixture is a disposable repository under `.local`, created with
 * `cleanGitEnv` and removed in `finally`.
 */

const FAKE_TOKEN = ["gh", "p_", "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAB7c"].join("");

async function fixture(run: (root: string) => Promise<void>) {
  await mkdir(".local", { recursive: true });
  const root = await mkdtemp(resolve(".local/secrets-index-"));
  try {
    expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const git = (root: string, ...args: string[]) =>
  Bun.spawnSync(["git", "-C", root, ...args], { env: cleanGitEnv() });

const secretScan = (root: string) =>
  Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], { env: cleanGitEnv() });

const output = (result: { stdout: Uint8Array; stderr: Uint8Array }) =>
  result.stdout.toString() + result.stderr.toString();

async function track(root: string, path: string, content: string) {
  await writeFile(join(root, path), content);
  expect(git(root, "add", path).exitCode).toBe(0);
}

const leaking = `export const token = ${JSON.stringify(FAKE_TOKEN)};\n`;

test(
  "METRO-28 a working-tree symlink replacing a tracked file is never followed",
  () =>
    fixture(async (root) => {
      const outside = `${root}-outside`;
      try {
        await track(root, "AGENTS.md", "plain instructions\n");
        await mkdir(outside, { recursive: true });
        await writeFile(join(outside, "stolen.txt"), leaking);
        await rm(join(root, "AGENTS.md"));
        await symlink(join(outside, "stolen.txt"), join(root, "AGENTS.md"));
        // Unstaged typechange: the index still holds the plain regular file.
        expect(git(root, "status", "--porcelain").stdout.toString()).toContain("T AGENTS.md");
        const result = secretScan(root);
        // Following the link would copy the outside credential into the scan and fail the gate.
        expect(output(result)).toContain("no leaks found");
        expect(result.exitCode).toBe(0);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    }),
  30000,
);

test(
  "METRO-28 a credential staged in the index is found even when the working tree is clean",
  () =>
    fixture(async (root) => {
      await track(root, "fixture.ts", leaking);
      await writeFile(join(root, "fixture.ts"), "export const token = 'removed';\n");
      const result = secretScan(root);
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "METRO-28 a credential only in an unstaged edit is outside the scan until it is staged",
  () =>
    fixture(async (root) => {
      await track(root, "fixture.ts", "export const token = 'clean';\n");
      await writeFile(join(root, "fixture.ts"), leaking);
      expect(secretScan(root).exitCode).toBe(0);
      expect(git(root, "add", "fixture.ts").exitCode).toBe(0);
      const staged = secretScan(root);
      expect(output(staged)).toContain("leaks found");
      expect(staged.exitCode).not.toBe(0);
    }),
  60000,
);

test(
  "METRO-28 a tracked file deleted from the working tree is still scanned from the index",
  () =>
    fixture(async (root) => {
      await track(root, "fixture.ts", leaking);
      await rm(join(root, "fixture.ts"));
      const result = secretScan(root);
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "METRO-28 an intent-to-add entry scans as the empty blob, not the working-tree content",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      await writeFile(join(root, "draft.ts"), leaking);
      expect(git(root, "add", "--intent-to-add", "draft.ts").exitCode).toBe(0);
      expect(secretScan(root).exitCode).toBe(0);
    }),
  30000,
);

test(
  "METRO-28 the committed bytes are scanned without line-ending conversion",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      await writeFile(join(root, "crlf.txt"), `a\r\ntoken = ${FAKE_TOKEN}\r\n`);
      expect(git(root, "-c", "core.autocrlf=false", "add", "crlf.txt").exitCode).toBe(0);
      const result = secretScan(root);
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "METRO-28 an unmerged index entry fails visibly instead of scanning one stage",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      const hash = git(root, "hash-object", "-w", "AGENTS.md").stdout.toString().trim();
      const info = Bun.spawnSync(["git", "-C", root, "update-index", "--index-info"], {
        env: cleanGitEnv(),
        stdin: new TextEncoder().encode(
          `0 ${"0".repeat(hash.length)}\tAGENTS.md\n` +
            `100644 ${hash} 2\tAGENTS.md\n100644 ${hash} 3\tAGENTS.md\n`,
        ),
      });
      expect(info.exitCode).toBe(0);
      expect(git(root, "ls-files", "-u").stdout.toString()).toContain("AGENTS.md");
      const result = secretScan(root);
      expect(result.stderr.toString()).toContain("Unmerged");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);
