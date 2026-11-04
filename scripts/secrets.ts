import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, isAbsolute, posix } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanGitEnv } from "./git-env.ts";
import { gitleaksVersion } from "./tool-pins.ts";

const SYMLINK_MODE = "120000";
const GITLINK_MODE = "160000";

const history = process.argv[2] === "--history";
const root = resolve((history ? process.argv[3] : process.argv[2]) ?? ".");
if (history) {
  // Full Git history, redacted. Needs full clone depth (CI checks out with fetch-depth: 0); a shallow
  // clone would silently scan only part of the history, so it fails visibly instead.
  const shallow = execFileSync("git", ["-C", root, "rev-parse", "--is-shallow-repository"], {
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
const listing = execFileSync("git", ["-C", root, "ls-files", "-s", "-z"], {
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
 * Raw blob contents for the given object ids, read from the git object database with one
 * `git cat-file --batch` per chunk. Contents are exactly what is stored (no smudge, no end-of-line
 * conversion, no textconv). The working tree is never opened, so a symlink or edit there cannot
 * change what is scanned. A missing or non-blob object, or a size mismatch, fails visibly.
 */
function readBlobs(objects: readonly string[]): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();
  const unique = [...new Set(objects)];
  const chunkSize = 256;
  for (let start = 0; start < unique.length; start += chunkSize) {
    const chunk = unique.slice(start, start + chunkSize);
    const result = spawnSync("git", ["-C", root, "cat-file", "--batch"], {
      input: `${chunk.join("\n")}\n`,
      env: cleanGitEnv(),
      maxBuffer: 1024 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(`git cat-file --batch failed: ${result.stderr.toString()}`);
    const out = result.stdout;
    let offset = 0;
    for (const object of chunk) {
      const eol = out.indexOf(0x0a, offset);
      if (eol < 0) throw new Error(`Truncated git cat-file output at ${object}`);
      const [oid, type, size] = out.toString("utf8", offset, eol).split(" ");
      if (oid !== object || type !== "blob" || size === undefined || !/^\d+$/u.test(size))
        throw new Error(`Index object is not a readable blob: ${object}`);
      const end = eol + 1 + Number(size);
      if (end >= out.length || out[end] !== 0x0a)
        throw new Error(`Truncated git cat-file output at ${object}`);
      blobs.set(object, out.subarray(eol + 1, end));
      offset = end + 1;
    }
  }
  return blobs;
}

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
  const target = execFileSync("git", ["-C", root, "cat-file", "blob", link.object], {
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
  const blobs = readBlobs(
    listing.filter((e) => e.mode !== SYMLINK_MODE && e.mode !== GITLINK_MODE).map((e) => e.object),
  );
  for (const { mode, object, path: file } of listing) {
    if (mode === SYMLINK_MODE && symlinkTargetIsSafe({ object, path: file })) continue;
    if (mode === SYMLINK_MODE || mode === GITLINK_MODE)
      throw new Error(`Tracked symlink or submodule cannot be scanned safely: ${file}`);
    if (isAbsolute(file) || relative(root, resolve(root, file)).startsWith(".."))
      throw new Error(`Invalid tracked path: ${file}`);
    const target = join(staging, file);
    await mkdir(dirname(target), { recursive: true });
    const content = blobs.get(object);
    if (content === undefined) throw new Error(`Missing index blob for ${file}`);
    await writeFile(target, content);
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
