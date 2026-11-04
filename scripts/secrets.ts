import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, isAbsolute, posix } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanGitEnv } from "./git-env.ts";
import {
  CHUNK_BYTES,
  gitArgs,
  objectSizes,
  planChunks,
  readChunk,
  stagingPath,
} from "./secrets-index.ts";
import { gitleaksVersion } from "./tool-pins.ts";

const SYMLINK_MODE = "120000";
const GITLINK_MODE = "160000";

const history = process.argv[2] === "--history";
const root = resolve((history ? process.argv[3] : process.argv[2]) ?? ".");
if (history) {
  // Full Git history, redacted. Needs full clone depth (CI checks out with fetch-depth: 0); a shallow
  // clone would silently scan only part of the history, so it fails visibly instead.
  const shallow = execFileSync("git", gitArgs(root, ["rev-parse", "--is-shallow-repository"]), {
    encoding: "utf8",
    env: cleanGitEnv(),
  }).trim();
  if (shallow !== "false")
    throw new Error("History scan requires a full clone; fetch with fetch-depth: 0");
  const version = await gitleaksVersion(fileURLToPath(new URL("..", import.meta.url)));
  const result = spawnSync(
    "mise",
    ["exec", `gitleaks@${version}`, "--", "gitleaks", "git", root, "--redact", "--no-banner"],
    { stdio: "inherit", shell: false, env: cleanGitEnv() },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
// Inherited GIT_* variables (hooks, linked worktrees) must not redirect `-C root`.
const listing = execFileSync("git", gitArgs(root, ["ls-files", "-s", "-z"]), {
  encoding: "utf8",
  env: cleanGitEnv(),
})
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const tab = entry.indexOf("\t");
    const [mode = "", object = "", stage = ""] = entry.slice(0, tab).split(" ");
    return { mode, object, stage, path: entry.slice(tab + 1) };
  });
if (!listing.length) throw new Error("Secret scan requires tracked source");
// An unmerged path has up to three index entries (stages 1-3). Scanning one of them would silently
// skip the others, so a conflicted index fails visibly until the conflict is resolved.
const unmerged = listing.find((e) => e.stage !== "0");
if (unmerged) throw new Error(`Unmerged index entries cannot be scanned: ${unmerged.path}`);

/**
 * A tracked symlink is accepted only when it is a plain name (letters, digits, `.`, `_`, `-`, `/`
 * separators; no empty, `.` or `..` segment, no absolute or drive path) that resolves, relative to the
 * link's directory, to another tracked regular file. That file is scanned in its own right, so
 * nothing outside the repository and no other link is ever followed. The target text is read from the
 * git object, never from the working tree.
 */
const regularFiles = new Set(
  listing.filter((e) => e.mode !== SYMLINK_MODE && e.mode !== GITLINK_MODE).map((e) => e.path),
);
function symlinkTargetIsSafe(link: { object: string; path: string }): boolean {
  const target = execFileSync("git", gitArgs(root, ["cat-file", "blob", link.object]), {
    encoding: "utf8",
    env: cleanGitEnv(),
  });
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u.test(target)) return false;
  if (target.split("/").some((segment) => segment === "." || segment === "..")) return false;
  const directory = posix.dirname(link.path);
  return regularFiles.has(directory === "." ? target : posix.join(directory, target));
}
const gitleaks = await gitleaksVersion(fileURLToPath(new URL("..", import.meta.url)));
const staging = await mkdtemp(join(tmpdir(), "metro-secrets-"));
try {
  // Validate every entry before any contents are read, so an unsafe entry fails without partial work.
  const files: { object: string; path: string; position: number }[] = [];
  for (const [position, { mode, object, path: file }] of listing.entries()) {
    if (mode === SYMLINK_MODE && symlinkTargetIsSafe({ object, path: file })) continue;
    if (mode === SYMLINK_MODE || mode === GITLINK_MODE)
      throw new Error(`Tracked symlink or submodule cannot be scanned safely: ${file}`);
    if (isAbsolute(file) || relative(root, resolve(root, file)).startsWith(".."))
      throw new Error(`Invalid tracked path: ${file}`);
    files.push({ object, path: file, position });
  }
  // Memory is bounded by one chunk: each chunk is read, written to staging and released before the next.
  const limit = Number(process.env["METRO_SECRETS_CHUNK_BYTES"] ?? CHUNK_BYTES);
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new Error("METRO_SECRETS_CHUNK_BYTES must be a positive integer");
  const sizes = objectSizes(
    root,
    files.map((f) => f.object),
  );
  for (const chunk of planChunks(sizes, limit)) {
    const members = new Set(chunk);
    const blobs = readChunk(root, chunk, sizes);
    for (const { object, path: file, position } of files) {
      if (!members.has(object)) continue;
      const content = blobs.get(object);
      if (content === undefined) throw new Error(`Missing index blob for ${file}`);
      const target = stagingPath(staging, position, file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  const result = spawnSync(
    "mise",
    ["exec", `gitleaks@${gitleaks}`, "--", "gitleaks", "dir", staging, "--redact", "--no-banner"],
    { stdio: "inherit", shell: false },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(staging, { recursive: true, force: true });
}
