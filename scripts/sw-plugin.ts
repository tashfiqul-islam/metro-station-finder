import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Build step of the offline shell worker (METRO-106, ADR-0024): after the client build is on disk it lists
 * the shell, checks the list against Vite's manifest, derives the version from the content and writes
 * `sw.js` beside `index.html`. The worker source itself (`apps/web/src/sw/`) is bundled by the caller,
 * which injects `bundle`, so this module stays free of Vite and testable with a plain directory.
 */

export interface WorkerConfig {
  readonly version: string;
  readonly precache: readonly string[];
  readonly kill: boolean;
}

/**
 * Build output that is never part of the offline shell. `sw.js` is excluded because it is the worker.
 * `favicon.ico` is excluded because a script cannot fetch it under Playwright Chromium (`fetch("/favicon.ico")`
 * fails with a network error while `/favicon.ico?x=1` and every other icon succeed; cause Unverified), which
 * would fail the whole install. The page also declares `favicon.svg` and `apple-touch-icon.png`, both cached.
 */
const NOT_SHELL = new Set([
  "sw.js",
  "favicon.ico",
  // The large, maskable and monochrome PNG icons are only read by an install prompt, online (METRO-106 review):
  // about 250 KB the offline shell does not need. `icons/icon-192.png` and `apple-touch-icon.png` stay.
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/icon-monochrome-512.png",
  "_headers",
  ".assetsignore",
  "robots.txt",
  "licenses.txt",
  "wrangler.json",
  ".dev.vars",
]);
const NOT_SHELL_DIRECTORIES = new Set([".vite"]);

const PLACEHOLDER_VERSION = "000000000000";

/** Fixed message: the file list never goes into it. */
export const SHELL_MISMATCH =
  "The offline shell list does not match .vite/manifest.json: a built file is missing from the output";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every build file as a path relative to `root`, with forward slashes. */
export async function listFiles(root: string, directory = root): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!NOT_SHELL_DIRECTORIES.has(entry.name)) found.push(...(await listFiles(root, path)));
    } else {
      found.push(path.slice(root.length + 1).replaceAll("\\", "/"));
    }
  }
  return found;
}

/** URL paths of the shell: "/" first (index.html), then every other file, sorted. No source maps. */
export function shellPaths(files: readonly string[]): string[] {
  const paths = files
    .filter((file) => !NOT_SHELL.has(file) && !file.endsWith(".map") && file !== "index.html")
    .map((file) => `/${file}`);
  paths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return files.includes("index.html") ? ["/", ...paths] : paths;
}

/** Every file Vite's manifest names (chunk `file`, `css`, `assets`) as a URL path. Null when unreadable. */
export function manifestPaths(text: string): string[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const paths: string[] = [];
  for (const chunk of Object.values(data)) {
    if (!isRecord(chunk)) return null;
    for (const key of ["file", "css", "assets"]) {
      const value = chunk[key];
      if (typeof value === "string") paths.push(`/${value}`);
      else if (Array.isArray(value)) {
        const items: unknown[] = value;
        for (const item of items) {
          if (typeof item !== "string") return null;
          paths.push(`/${item}`);
        }
      }
    }
  }
  return paths;
}

/** Version: a hash of every shell path and its bytes, so any changed file gives a new cache name. */
export function versionOf(entries: readonly (readonly [string, Uint8Array])[]): string {
  const hash = createHash("sha256");
  for (const [path, bytes] of entries) {
    hash.update(`${path}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest("hex").slice(0, 12);
}

export interface WorkerBuild {
  /** Bundles `apps/web/src/sw/sw.ts` with the config baked in; returns the script text. */
  readonly bundle: (config: WorkerConfig) => Promise<string>;
  /** Build the kill-switch worker instead of the shell worker (ADR-0024). */
  readonly kill: boolean;
}

/** Computes the config of a finished client build and writes `sw.js` into it. Returns the config. */
export async function writeWorker(root: string, build: WorkerBuild): Promise<WorkerConfig> {
  const precache = shellPaths(await listFiles(root));
  const manifest = await readFile(join(root, ".vite", "manifest.json"), "utf8").catch(() => null);
  const listed = manifest === null ? null : manifestPaths(manifest);
  if (listed === null || !listed.every((path) => precache.includes(path))) {
    throw new Error(SHELL_MISMATCH);
  }
  const entries = await Promise.all(
    precache.map(
      async (path) =>
        [path, await readFile(join(root, path === "/" ? "index.html" : path.slice(1)))] as const,
    ),
  );
  // The version covers the worker's own bytes too: a release that changes only the worker logic (or switches
  // the kill flag) must not reuse the cache name of the worker that is live. The bundle contains its version,
  // so it is built once with a fixed placeholder, hashed, and built again with the real one.
  const text = new TextEncoder();
  const draft = await build.bundle({ version: PLACEHOLDER_VERSION, precache, kill: build.kill });
  const version = versionOf([
    ...entries,
    ["worker", text.encode(draft)],
    ["kill", text.encode(String(build.kill))],
  ]);
  const config: WorkerConfig = { version, precache, kill: build.kill };
  await writeFile(join(root, "sw.js"), await build.bundle(config));
  return config;
}

/** The Vite plugin: runs once, after the client environment has been written. */
export function serviceWorkerPlugin(build: WorkerBuild) {
  return {
    name: "metro-service-worker",
    apply: "build" as const,
    applyToEnvironment: (environment: { readonly name: string }): boolean =>
      environment.name === "client",
    writeBundle: {
      order: "post" as const,
      handler: async (options: { readonly dir?: string | undefined }): Promise<void> => {
        if (options.dir === undefined) throw new Error(SHELL_MISMATCH);
        await writeWorker(options.dir, build);
      },
    },
  };
}
