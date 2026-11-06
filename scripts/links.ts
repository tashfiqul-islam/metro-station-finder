import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanGitEnv } from "./git-env.ts";

export interface LinkProblem {
  file: string;
  line: number;
  message: string;
}

interface FoundLink {
  line: number;
  target: string;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/iu;
const FENCE = /^\s{0,3}(```+|~~~+)/u;
const INLINE_LINK = /\]\(\s*(<[^>]*>|(?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/gu;
const DEFINITION = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/u;

/** Yields each non-code line with its 1-based number; fenced blocks and inline code are blanked. */
function* proseLines(source: string): Generator<{ line: number; text: string; raw: string }> {
  let fence: string | undefined;
  const lines = source.split(/\r?\n/u);
  for (const [index, raw] of lines.entries()) {
    const marker = FENCE.exec(raw)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    yield {
      line: index + 1,
      raw,
      text: raw.replaceAll(/`+[^`]*`+/gu, (span) => " ".repeat(span.length)),
    };
  }
}

function unwrap(target: string): string {
  return target.startsWith("<") && target.endsWith(">") ? target.slice(1, -1) : target;
}

function findLinks(source: string): FoundLink[] {
  const found: FoundLink[] = [];
  for (const { line, text } of proseLines(source)) {
    const definition = DEFINITION.exec(text);
    if (definition?.[1]) found.push({ line, target: unwrap(definition[1]) });
    for (const match of text.matchAll(INLINE_LINK)) {
      if (match[1]) found.push({ line, target: unwrap(match[1]) });
    }
  }
  return found;
}

function slugOf(heading: string): string {
  return heading
    .replace(/\s+#+\s*$/u, "")
    .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replaceAll(/<[^>]+>/gu, "")
    .replaceAll(/[`*~]/gu, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s/gu, "-");
}

/** GitHub heading anchors for a Markdown document, duplicates suffixed `-1`, `-2`. */
export function githubSlugs(source: string): string[] {
  const seen = new Map<string, number>();
  const slugs: string[] = [];
  for (const { raw } of proseLines(source)) {
    const heading = /^\s{0,3}#{1,6}\s+(.*)$/u.exec(raw);
    if (!heading?.[1]) continue;
    const base = slugOf(heading[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.push(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

export function formatProblem(problem: LinkProblem): string {
  return `${problem.file}:${problem.line} ${problem.message}`;
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Checks relative links and heading anchors of the given root-relative Markdown files. */
export async function checkLinks(root: string, files: string[]): Promise<LinkProblem[]> {
  const problems: LinkProblem[] = [];
  const slugCache = new Map<string, string[]>();
  async function slugsFor(path: string): Promise<string[]> {
    const cached = slugCache.get(path);
    if (cached) return cached;
    const slugs = githubSlugs(await readFile(path, "utf8"));
    slugCache.set(path, slugs);
    return slugs;
  }

  for (const file of files) {
    const absolute = join(root, file);
    for (const { line, target } of findLinks(await readFile(absolute, "utf8"))) {
      if (SCHEME.test(target)) continue;
      const hash = target.indexOf("#");
      const withoutHash = hash === -1 ? target : target.slice(0, hash);
      const anchor = hash === -1 ? undefined : decode(target.slice(hash + 1));
      const pathPart = decode(withoutHash.split("?")[0] ?? "");
      const resolved = !pathPart
        ? absolute
        : pathPart.startsWith("/")
          ? resolve(root, `.${pathPart}`)
          : resolve(dirname(absolute), pathPart);
      const fromRoot = relative(root, resolved);
      if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
        problems.push({ file, line, message: `link escapes the repository: ${target}` });
        continue;
      }
      const info = await stat(resolved).catch(() => {});
      if (!info) {
        problems.push({ file, line, message: `missing link target: ${target}` });
        continue;
      }
      if (anchor && info.isFile() && resolved.toLowerCase().endsWith(".md")) {
        if (!(await slugsFor(resolved)).includes(anchor.toLowerCase()))
          problems.push({ file, line, message: `missing heading anchor: ${target}` });
      }
    }
  }
  return problems;
}

function trackedMarkdown(root: string): string[] {
  return execFileSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
      env: cleanGitEnv(),
    },
  )
    .split("\0")
    .filter((file) => file.endsWith(".md"));
}

/** CLI body: checks every Markdown file Git knows about and sets the exit code. */
export async function runLinkCheck(root: string): Promise<void> {
  const files = [];
  for (const file of trackedMarkdown(root))
    if (await stat(join(root, file)).catch(() => {})) files.push(file);
  const problems = await checkLinks(root, files);
  for (const problem of problems) console.error(formatProblem(problem));
  if (problems.length > 0) process.exitCode = 1;
  else console.log(`Links ok: ${files.length} Markdown files`);
}

/** Process entry: checks the repository at the first argument, or the one containing this script. */
export async function linkCheckMain(args: readonly string[]): Promise<void> {
  await runLinkCheck(resolve(args[0] ?? fileURLToPath(new URL("..", import.meta.url))));
}

if (import.meta.main) await linkCheckMain(process.argv.slice(2));
