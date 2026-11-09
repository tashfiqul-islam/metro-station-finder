import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * First-visit JS limits: every JS file of the first visit (the entry chunk, the chunks it imports statically and
 * the public head script). These are the numbers METRO-12 set for the whole build, unchanged since METRO-104
 * (ADR-0020); METRO-116 (ADR-0023) only stops CSS from counting against them.
 */
export const FIRST_VISIT_JS_BUDGET = { raw: 250_000, gzip: 80_000 } as const;

/**
 * First-visit CSS limits (METRO-116, ADR-0023), sized from the measured 14,141 raw / 3,975 gzip with about 40
 * percent raw and 50 percent gzip margin. The owner confirms them in the PR.
 */
export const FIRST_VISIT_CSS_BUDGET = { raw: 20_000, gzip: 6_000 } as const;

/** A lazy screen: its dynamic-entry chunk and that chunk's CSS count against one fixed gzip limit. */
export interface ScreenLimit {
  readonly name: string;
  readonly gzip: number;
}

/**
 * Lazy screens by Vite manifest key (the source path of the dynamic entry; stable, unlike the hashed file
 * name). A new screen is added here with its own fixed limit, in the PR that adds it, with the owner's approval
 * (ADR-0023). Nearby measures 22,798 gzip; 30,000 leaves about 30 percent.
 */
export const LAZY_SCREEN_LIMITS: ReadonlyMap<string, ScreenLimit> = new Map([
  ["src/features/nearby/Nearby.tsx", { name: "nearby", gzip: 30_000 }],
]);

/** One gzip allowance for every lazy chunk that is not a screen. Measured 8,121; 12,000 leaves about 48 percent. */
export const SHARED_LAZY_ALLOWANCE = { gzip: 12_000 } as const;

/**
 * Lazy chunks that are not screens, by manifest key: the reveal helper, the Maps adapter, web-vitals (matched
 * without its version) and Rollup common chunks (key starts with an underscore). Any other lazy chunk is
 * unclassified and fails the gate.
 */
const SHARED_LAZY_KEYS: readonly RegExp[] = [
  /^src\/theme\/reveal\.ts$/u,
  /^src\/adapters\/maps\/index\.ts$/u,
  /(?:^|\/)node_modules\/(?:.+\/)?web-vitals\/dist\/web-vitals\.js$/u,
  /^_[^/]+$/u,
];

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

export const MANIFEST_PATH = ".vite/manifest.json";
/** One fixed message for every way the first-visit set cannot be computed. */
export const MANIFEST_FAILURE =
  "First-visit set cannot be computed: .vite/manifest.json is missing, unparsable, has no index.html entry, or names a file that is not built";

/** One fixed message when a built JS/CSS file is missing from the manifest (an orphan or a stale manifest). */
export const MANIFEST_STALE =
  "Bundle manifest is stale: a built JS or CSS file is not listed in .vite/manifest.json";

/** Fixed prefix; the keys of the unclassified chunks follow, in manifest order. */
export const UNCLASSIFIED_PREFIX =
  "Unclassified lazy chunk, add it to the per-screen limits or the shared allowance (ADR-0023): ";

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

const SHARED = "shared";
const isCode = (file: string) => /\.(js|css)$/u.test(file);

const total = (assets: readonly Asset[]) => ({
  raw: assets.reduce((sum, asset) => sum + asset.raw, 0),
  gzip: assets.reduce((sum, asset) => sum + asset.gzip, 0),
});

/**
 * Class of each lazy JS/CSS file: a screen name or "shared". Screens claim their files first, so a file two
 * lazy chunks list counts once. Chunks that match neither a screen nor a shared rule are returned as keys.
 */
function classifyLazy(manifest: Manifest, first: ReadonlySet<string>) {
  const classes = new Map<string, string>();
  const unclassified: string[] = [];
  const chunks = [...manifest].flatMap(([key, chunk]) => {
    const files = [chunk.file, ...chunk.css].filter((file) => isCode(file) && !first.has(file));
    return files.length === 0 ? [] : [{ key, files }];
  });
  for (const { key, files } of chunks) {
    const screen = LAZY_SCREEN_LIMITS.get(key);
    if (screen !== undefined) for (const file of files) classes.set(file, screen.name);
  }
  for (const { key, files } of chunks) {
    if (LAZY_SCREEN_LIMITS.has(key)) continue;
    if (!SHARED_LAZY_KEYS.some((rule) => rule.test(key))) unclassified.push(key);
    else for (const file of files) if (!classes.has(file)) classes.set(file, SHARED);
  }
  return { classes, unclassified };
}

const percent = (used: number, limit: number) => Math.round((used / limit) * 100);

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
  if (manifest === null || files === null || [...files].some((file) => !onDisk.has(file)))
    return { lines: [], problems: [MANIFEST_FAILURE] };
  // Every emitted file must be known to the manifest, as a chunk `file` or in a `css` list.
  const listed = new Set<string>(heads);
  for (const chunk of manifest.values()) {
    listed.add(chunk.file);
    for (const file of chunk.css) listed.add(file);
  }
  if (assets.some((asset) => !listed.has(asset.path)))
    return { lines: [], problems: [MANIFEST_STALE] };
  // Fail closed: a lazy chunk that is neither a known screen nor shared has no limit, so it cannot pass.
  const { classes, unclassified } = classifyLazy(manifest, files);
  if (unclassified.length > 0)
    return { lines: [], problems: [UNCLASSIFIED_PREFIX + unclassified.join(", ")] };

  const sorted = [...assets];
  sorted.sort((a, b) => b.raw - a.raw || a.path.localeCompare(b.path));
  const lines = ["Production JS/CSS files, largest first (raw / gzip bytes):"];
  for (const { path, raw, gzip } of sorted) {
    const kind = files.has(path) ? "first-visit" : `lazy (${classes.get(path) ?? SHARED})`;
    lines.push(`  ${path}: ${raw} raw; ${gzip} gzip; ${kind}`);
  }
  const first = assets.filter((asset) => files.has(asset.path));
  const js = total(first.filter((asset) => asset.path.endsWith(".js")));
  const css = total(first.filter((asset) => asset.path.endsWith(".css")));
  lines.push(
    `First-visit JS: ${js.raw} bytes raw; ${js.gzip} bytes gzip (budget ${FIRST_VISIT_JS_BUDGET.raw} / ${FIRST_VISIT_JS_BUDGET.gzip})`,
    `First-visit CSS: ${css.raw} bytes raw; ${css.gzip} bytes gzip (budget ${FIRST_VISIT_CSS_BUDGET.raw} / ${FIRST_VISIT_CSS_BUDGET.gzip})`,
  );
  const problems: string[] = [];
  if (js.raw > FIRST_VISIT_JS_BUDGET.raw || js.gzip > FIRST_VISIT_JS_BUDGET.gzip)
    problems.push(
      `Bundle budget exceeded for the first visit JS: ${FIRST_VISIT_JS_BUDGET.raw} raw / ${FIRST_VISIT_JS_BUDGET.gzip} gzip bytes`,
    );
  if (css.raw > FIRST_VISIT_CSS_BUDGET.raw || css.gzip > FIRST_VISIT_CSS_BUDGET.gzip)
    problems.push(
      `Bundle budget exceeded for the first visit CSS: ${FIRST_VISIT_CSS_BUDGET.raw} raw / ${FIRST_VISIT_CSS_BUDGET.gzip} gzip bytes`,
    );
  const gzipOf = (name: string) =>
    total(sorted.filter((asset) => !files.has(asset.path) && classes.get(asset.path) === name))
      .gzip;
  for (const { name, gzip: limit } of LAZY_SCREEN_LIMITS.values()) {
    const used = gzipOf(name);
    lines.push(
      `Lazy screen ${name}: ${used} bytes gzip (limit ${limit}; ${percent(used, limit)} percent used)`,
    );
    if (used > limit) problems.push(`Lazy screen limit exceeded for ${name}: ${limit} gzip bytes`);
  }
  const shared = gzipOf(SHARED);
  const allowance = SHARED_LAZY_ALLOWANCE.gzip;
  lines.push(
    `Shared lazy: ${shared} bytes gzip (allowance ${allowance}; ${percent(shared, allowance)} percent used)`,
  );
  if (shared > allowance) problems.push(`Shared lazy allowance exceeded: ${allowance} gzip bytes`);
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
