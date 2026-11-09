import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * The FIRST-VISIT limits: the entry chunk, every chunk it imports statically and the CSS of each (METRO-104,
 * ADR-0020). These are the numbers METRO-12 set for the whole build; they are unchanged and now apply to what
 * a first visit must load, so a lazy chunk does not count against them.
 */
export const FIRST_VISIT_BUDGET = { raw: 250_000, gzip: 80_000 } as const;

/**
 * Ceiling for ALL emitted JS and CSS, lazy chunks included. A growth tripwire, not a load budget. Chosen on
 * 2026-11-08 from the measured all-files size after the web-vitals chunk moved out of the first visit
 * (about 249 KB raw / 79 KB gzip): 400,000 / 125,000 is about 1.6 times that, room for a few lazy features
 * while a runaway still fails the gate. Revisit when it is half used; do not raise it to pass.
 */
export const ALL_FILES_CEILING = { raw: 400_000, gzip: 125_000 } as const;

/**
 * Classic scripts that `index.html` loads from `apps/web/public/` by their own name (METRO-105, ADR-0021).
 * Vite copies them unhashed and leaves them out of the manifest, but they are on the first-visit path, so they
 * count toward the first-visit total and are not orphans. One that `index.html` loads but the build lacks fails
 * the gate (`HEAD_SCRIPT_MISSING`); one that nothing references and that is absent is simply not counted.
 */
export const HEAD_SCRIPTS = ["theme-boot.js"] as const;

/** One fixed message when `index.html` loads a head script that is not in the build. */
export const HEAD_SCRIPT_MISSING =
  "A script that index.html loads from public/ is missing from the build";

/**
 * The offline shell worker, written beside `index.html` by `scripts/sw-plugin.ts` (METRO-106, ADR-0024). It is a
 * separate small build, so it is not in the Vite manifest and not an orphan. It is never on the first-visit path
 * (the page registers it after load and idle), so it counts toward the all-files ceiling only.
 */
export const WORKER_SCRIPTS = ["sw.js"] as const;

export const MANIFEST_PATH = ".vite/manifest.json";
/** One fixed message for every way the first-visit set cannot be computed. */
export const MANIFEST_FAILURE =
  "First-visit set cannot be computed: .vite/manifest.json is missing, unparsable, has no index.html entry, or names a file that is not built";

/** One fixed message when a built JS/CSS file is missing from the manifest (an orphan or a stale manifest). */
export const MANIFEST_STALE =
  "Bundle manifest is stale: a built JS or CSS file is not listed in .vite/manifest.json";

export interface Asset {
  /** Path relative to the build root, with forward slashes. */
  readonly path: string;
  readonly raw: number;
  readonly gzip: number;
}

export async function collectAssets(root: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(js|css)$/u.test(entry.name)) {
        const bytes = await readFile(path);
        assets.push({
          path: relative(root, path).replaceAll("\\", "/"),
          raw: bytes.length,
          gzip: gzipSync(bytes).length,
        });
      }
    }
  };
  await walk(root);
  assets.sort((a, b) => b.raw - a.raw || a.path.localeCompare(b.path));
  return assets;
}

interface Chunk {
  readonly file: string;
  readonly imports: readonly string[];
  readonly css: readonly string[];
  readonly isEntry: boolean;
}
export type Manifest = ReadonlyMap<string, Chunk>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Absent is an empty list; anything but an array of strings is null. */
function strings(value: unknown): readonly string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const items: unknown[] = value;
  return items.every((item): item is string => typeof item === "string") ? items : null;
}

/** Vite's `.vite/manifest.json` (Context7-verified, Vite 8). Null when missing or not the expected shape. */
export function parseManifest(text: string | null): Manifest | null {
  if (text === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const manifest = new Map<string, Chunk>();
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value)) return null;
    const file = value["file"];
    const imports = strings(value["imports"]);
    const css = strings(value["css"]);
    if (typeof file !== "string" || imports === null || css === null) return null;
    manifest.set(key, { file, imports, css, isEntry: value["isEntry"] === true });
  }
  return manifest;
}

/**
 * Files of the first visit: the `index.html` entry, the transitive closure of its static `imports` and the
 * `css` of each, each file once. `dynamicImports` are never followed. A visited set makes an import cycle
 * terminate. Null when there is no entry or an import names a key the manifest lacks.
 */
export function firstVisitFiles(manifest: Manifest): ReadonlySet<string> | null {
  const entry = manifest.get("index.html");
  if (entry?.isEntry !== true) return null;
  const files = new Set<string>();
  const seen = new Set<string>(["index.html"]);
  const pending: Chunk[] = [entry];
  for (let chunk = pending.pop(); chunk !== undefined; chunk = pending.pop()) {
    files.add(chunk.file);
    for (const file of chunk.css) files.add(file);
    for (const key of chunk.imports) {
      if (seen.has(key)) continue;
      seen.add(key);
      const next = manifest.get(key);
      if (next === undefined) return null;
      pending.push(next);
    }
  }
  return files;
}

export interface BudgetReport {
  readonly lines: string[];
  readonly problems: string[];
}

const total = (assets: readonly Asset[]) => ({
  raw: assets.reduce((sum, asset) => sum + asset.raw, 0),
  gzip: assets.reduce((sum, asset) => sum + asset.gzip, 0),
});

export function evaluateBundle(
  assets: readonly Asset[],
  manifestText: string | null,
  indexHtml: string | null = null,
): BudgetReport {
  if (total(assets).raw === 0)
    return { lines: [], problems: ["No production JS/CSS artifacts found"] };
  const manifest = parseManifest(manifestText);
  const chunks = manifest === null ? null : firstVisitFiles(manifest);
  const onDisk = new Set(assets.map((asset) => asset.path));
  const heads = HEAD_SCRIPTS.filter((script) => onDisk.has(script));
  if (HEAD_SCRIPTS.some((script) => !onDisk.has(script) && indexHtml?.includes(`src="/${script}"`)))
    return { lines: [], problems: [HEAD_SCRIPT_MISSING] };
  const files = chunks === null ? null : new Set([...chunks, ...heads]);
  if (files === null || [...files].some((file) => !onDisk.has(file)))
    return { lines: [], problems: [MANIFEST_FAILURE] };
  // Every emitted file must be known to the manifest, as a chunk `file` or in a `css` list.
  const listed = new Set<string>([...heads, ...WORKER_SCRIPTS]);
  for (const chunk of manifest?.values() ?? []) {
    listed.add(chunk.file);
    for (const file of chunk.css) listed.add(file);
  }
  if (assets.some((asset) => !listed.has(asset.path)))
    return { lines: [], problems: [MANIFEST_STALE] };

  const sorted = [...assets];
  sorted.sort((a, b) => b.raw - a.raw || a.path.localeCompare(b.path));
  const lines = ["Production JS/CSS files, largest first (raw / gzip bytes):"];
  for (const { path, raw, gzip } of sorted)
    lines.push(`  ${path}: ${raw} raw; ${gzip} gzip; ${files.has(path) ? "first-visit" : "lazy"}`);
  const first = total(assets.filter((asset) => files.has(asset.path)));
  const all = total(assets);
  lines.push(
    `First-visit JS/CSS: ${first.raw} bytes raw; ${first.gzip} bytes gzip (budget ${FIRST_VISIT_BUDGET.raw} / ${FIRST_VISIT_BUDGET.gzip})`,
    `All JS/CSS: ${all.raw} bytes raw; ${all.gzip} bytes gzip (ceiling ${ALL_FILES_CEILING.raw} / ${ALL_FILES_CEILING.gzip})`,
  );
  const usedRaw = all.raw / ALL_FILES_CEILING.raw;
  const usedGzip = all.gzip / ALL_FILES_CEILING.gzip;
  lines.push(
    `Ceiling used: ${Math.round(usedRaw * 100)} percent raw; ${Math.round(usedGzip * 100)} percent gzip`,
  );
  if (Math.max(usedRaw, usedGzip) > 0.5)
    lines.push(
      "Note: all files use more than half of the ceiling. Growth tripwire: revisit the ceiling (ADR-0020).",
    );
  const problems: string[] = [];
  if (first.raw > FIRST_VISIT_BUDGET.raw || first.gzip > FIRST_VISIT_BUDGET.gzip)
    problems.push(
      `Bundle budget exceeded for the first visit: ${FIRST_VISIT_BUDGET.raw} raw / ${FIRST_VISIT_BUDGET.gzip} gzip bytes`,
    );
  if (all.raw > ALL_FILES_CEILING.raw || all.gzip > ALL_FILES_CEILING.gzip)
    problems.push(
      `Bundle ceiling exceeded for all files: ${ALL_FILES_CEILING.raw} raw / ${ALL_FILES_CEILING.gzip} gzip bytes`,
    );
  return { lines, problems };
}

export async function bundleMain(args: readonly string[]): Promise<number> {
  const root = resolve(args[0] ?? "apps/web/dist/client");
  const manifest = await readFile(join(root, MANIFEST_PATH), "utf8").catch(() => null);
  const indexHtml = await readFile(join(root, "index.html"), "utf8").catch(() => null);
  const report = evaluateBundle(await collectAssets(root), manifest, indexHtml);
  for (const line of report.lines) console.log(line);
  for (const problem of report.problems) console.error(problem);
  return report.problems.length === 0 ? 0 : 1;
}
