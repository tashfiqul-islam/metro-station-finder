import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { cleanGitEnv } from "./git-env.ts";

/**
 * Index-reading helpers for the secret scan (METRO-28). Blobs come from the git object database, never
 * from the working tree, and memory is bounded by one chunk of at most `CHUNK_BYTES` (a single blob larger
 * than that is read alone).
 */

export const CHUNK_BYTES = 64 * 1024 * 1024;

/** Per-object allowance for the `cat-file --batch` header and trailing newline. */
const FRAMING_BYTES = 256;

/**
 * Arguments for a git call on `root`. `--no-replace-objects` is a global option: a local `refs/replace`
 * entry must not change the bytes that are scanned (`GIT_NO_REPLACE_OBJECTS` is stripped with the other
 * `GIT_*` variables by `cleanGitEnv`, so the flag is the only guard).
 */
export function gitArgs(root: string, args: readonly string[]): string[] {
  return ["--no-replace-objects", "-C", root, ...args];
}

function runGit(root: string, args: readonly string[], input: string, maxBuffer: number): Buffer {
  const result = spawnSync("git", gitArgs(root, args), {
    input,
    env: cleanGitEnv(),
    maxBuffer,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.toString()}`);
  return result.stdout;
}

/** Parses `<oid> SP blob SP <size>` and fails visibly for anything else. */
function parseHeader(header: string, object: string): number {
  const [oid, type, size] = header.split(" ");
  if (oid !== object || type !== "blob" || size === undefined || !/^\d+$/u.test(size))
    throw new Error(`Index object is not a readable blob: ${object}`);
  return Number(size);
}

/** Size in bytes of every object, from `git cat-file --batch-check` (headers only, no contents). */
export function objectSizes(root: string, objects: readonly string[]): Map<string, number> {
  const unique = [...new Set(objects)];
  const sizes = new Map<string, number>();
  if (!unique.length) return sizes;
  const lines = runGit(
    root,
    ["cat-file", "--batch-check"],
    `${unique.join("\n")}\n`,
    unique.length * FRAMING_BYTES + 1024,
  )
    .toString("utf8")
    .split("\n");
  unique.forEach((object, position) => {
    sizes.set(object, parseHeader(lines[position] ?? "", object));
  });
  return sizes;
}

/**
 * Groups objects into chunks whose total size stays within `limit`. An object larger than `limit`
 * gets a chunk of its own, so no chunk exceeds `max(limit, largest object)`.
 */
export function planChunks(sizes: ReadonlyMap<string, number>, limit: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let total = 0;
  for (const [object, size] of sizes) {
    if (current.length && total + size > limit) {
      chunks.push(current);
      current = [];
      total = 0;
    }
    current.push(object);
    total += size;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Raw contents of one planned chunk from a single `git cat-file --batch`: stored bytes, with no smudge,
 * end-of-line conversion or textconv. `maxBuffer` is the exact size the plan promised plus framing, so an
 * object that changed size, a missing or non-blob object, or truncated output fails visibly.
 */
export function readChunk(
  root: string,
  chunk: readonly string[],
  sizes: ReadonlyMap<string, number>,
): Map<string, Buffer> {
  const expected = chunk.reduce((sum, object) => sum + (sizes.get(object) ?? 0), 0);
  const out = runGit(
    root,
    ["cat-file", "--batch"],
    `${chunk.join("\n")}\n`,
    expected + chunk.length * FRAMING_BYTES,
  );
  const blobs = new Map<string, Buffer>();
  let offset = 0;
  for (const object of chunk) {
    const eol = out.indexOf(0x0a, offset);
    if (eol < 0) throw new Error(`Truncated git cat-file output at ${object}`);
    const size = parseHeader(out.toString("utf8", offset, eol), object);
    if (size !== sizes.get(object)) throw new Error(`Index object changed size: ${object}`);
    const end = eol + 1 + size;
    if (end >= out.length || out[end] !== 0x0a)
      throw new Error(`Truncated git cat-file output at ${object}`);
    blobs.set(object, out.subarray(eol + 1, end));
    offset = end + 1;
  }
  return blobs;
}

/**
 * Where an index entry is staged: a directory named after its position in the listing, then its path.
 * Paths that differ only by case (or by Unicode normalisation) on a case-insensitive file system can
 * therefore never overwrite each other and hide a secret.
 */
export function stagingPath(staging: string, position: number, file: string): string {
  return join(staging, String(position), file);
}
