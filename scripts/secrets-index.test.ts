import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import {
  gitArgs,
  objectSizes,
  planChunks,
  readChunk,
  stagingPath,
  type GitRunner,
} from "./secrets-index";

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
        try {
          await symlink(join(outside, "stolen.txt"), join(root, "AGENTS.md"));
        } catch (error) {
          // Never skip silently: this test is the proof for acceptance criterion 1.
          throw new Error(
            "Cannot create a symlink, so the METRO-28 symlink test cannot run. On Windows enable " +
              "Developer Mode (Settings > System > For developers) or run with symlink privilege; " +
              `on POSIX check file system support. Cause: ${String(error)}`,
            { cause: error },
          );
        }
        // Unstaged typechange: the index still holds the plain regular file.
        const status = git(root, "status", "--porcelain").stdout.toString();
        if (!status.includes("T AGENTS.md"))
          throw new Error(
            "Git does not see the working-tree symlink as a typechange (core.symlinks=false?), so " +
              `the METRO-28 symlink test cannot prove anything here. Enable symlink support. Status: ${status}`,
          );
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

/** Object id staged for `path` (stage 0). */
function indexedObject(root: string, path: string): string {
  const line = git(root, "ls-files", "-s", "--", path).stdout.toString().trim();
  return line.split(/\s+/u)[1] ?? "";
}

test(
  "METRO-28 the scan reads the stored (LF) bytes, not the CRLF working-tree bytes",
  () =>
    fixture(async (root) => {
      expect(git(root, "config", "core.autocrlf", "true").exitCode).toBe(0);
      await writeFile(join(root, "crlf.txt"), "first\r\nsecond\r\n");
      expect(git(root, "add", "crlf.txt").exitCode).toBe(0);
      const object = indexedObject(root, "crlf.txt");
      const sizes = objectSizes(root, [object]);
      const stored = readChunk(root, [object], sizes).get(object);
      expect(stored?.toString("utf8")).toBe("first\nsecond\n");
      // The working tree still holds CRLF, so reading it (the METRO-27 behaviour) would differ.
      expect(await Bun.file(join(root, "crlf.txt")).text()).toBe("first\r\nsecond\r\n");
    }),
  30000,
);

test(
  "METRO-28 a local replace ref cannot change the scanned bytes",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      await track(root, "fixture.ts", leaking);
      await writeFile(join(root, "clean.txt"), "clean\n");
      const clean = git(root, "hash-object", "-w", "clean.txt").stdout.toString().trim();
      expect(
        git(root, "replace", "--force", indexedObject(root, "fixture.ts"), clean).exitCode,
      ).toBe(0);
      const result = secretScan(root);
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "METRO-28 paths that differ only by case are all scanned",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      const stage = async (path: string, content: string) => {
        await Bun.write(join(root, "scratch.txt"), content);
        const hash = git(root, "hash-object", "-w", "scratch.txt").stdout.toString().trim();
        expect(
          git(root, "update-index", "--add", "--cacheinfo", `100644,${hash},${path}`).exitCode,
        ).toBe(0);
      };
      // Sorted order puts "A.txt" first; on a case-insensitive disk "a.txt" would overwrite it.
      await stage("A.txt", leaking);
      await stage("a.txt", "clean\n");
      const result = secretScan(root);
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "METRO-28 many chunks: every file is staged and scanned when each blob is its own chunk",
  () =>
    fixture(async (root) => {
      await track(root, "AGENTS.md", "plain\n");
      await track(root, "b.txt", "other\n");
      await track(root, "fixture.ts", leaking);
      const result = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], {
        env: { ...cleanGitEnv(), METRO_SECRETS_CHUNK_BYTES: "1" },
      });
      expect(output(result)).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
      const bad = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], {
        env: { ...cleanGitEnv(), METRO_SECRETS_CHUNK_BYTES: "0" },
      });
      expect(bad.stderr.toString()).toContain("METRO_SECRETS_CHUNK_BYTES");
      expect(bad.exitCode).not.toBe(0);
    }),
  60000,
);

test("METRO-28 planChunks bounds each chunk and isolates an oversized blob", () => {
  const sizes = new Map([
    ["a", 60],
    ["b", 60],
    ["c", 10],
    ["d", 500],
    ["e", 1],
  ]);
  const chunks = planChunks(sizes, 100);
  expect(chunks).toEqual([["a"], ["b", "c"], ["d"], ["e"]]);
  for (const chunk of chunks) {
    const total = chunk.reduce((sum, object) => sum + (sizes.get(object) ?? 0), 0);
    expect(chunk.length === 1 || total <= 100).toBe(true);
  }
  expect(planChunks(new Map(), 100)).toEqual([]);
});

test("METRO-28 staging names are index-numbered and git runs without replace objects", () => {
  expect(stagingPath("/s", 3, "A.txt")).not.toBe(stagingPath("/s", 4, "a.txt"));
  expect(stagingPath("/s", 3, "docs/a.md").replaceAll("\\", "/")).toBe("/s/3/docs/a.md");
  expect(gitArgs("/r", ["ls-files"])).toEqual(["--no-replace-objects", "-C", "/r", "ls-files"]);
});

test(
  "METRO-28 unreadable index objects fail visibly",
  () =>
    fixture(async (root) => {
      await track(root, "fixture.ts", "x\n");
      const object = indexedObject(root, "fixture.ts");
      expect(objectSizes(root, [])).toEqual(new Map());
      const tree = git(root, "write-tree").stdout.toString().trim();
      expect(() => objectSizes(root, [tree])).toThrow("not a readable blob");
      expect(() => objectSizes(root, ["0".repeat(object.length)])).toThrow("not a readable blob");
      const wrong = new Map([[object, 999]]);
      expect(() => readChunk(root, [object], wrong)).toThrow("Index object changed size");
    }),
  30000,
);

test("METRO-92 a git failure is reported with the command and git's own message", async () => {
  const missing = resolve(".local", "secrets-index-no-such-repository");
  expect(() => objectSizes(missing, ["0".repeat(40)])).toThrow(
    /git cat-file --batch-check failed: .*/su,
  );
});

test("METRO-92 cat-file output whose blob is not followed by a newline fails visibly", () => {
  const object = "a".repeat(40);
  const sizes = new Map([[object, 3]]);
  const serve = (tail: string): GitRunner => {
    return () => Buffer.from(`${object} blob 3\nabc${tail}`);
  };
  expect(readChunk("/r", [object], sizes, serve("\n")).get(object)?.toString("utf8")).toBe("abc");
  expect(() => readChunk("/r", [object], sizes, serve(""))).toThrow(
    `Truncated git cat-file output at ${object}`,
  );
  expect(() => readChunk("/r", [object], sizes, serve("Z"))).toThrow(
    `Truncated git cat-file output at ${object}`,
  );
});

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
