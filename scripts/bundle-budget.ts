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

/** A lazy screen: its dynamic-entry chunk, the chunks only it imports and their CSS share these limits. */
export interface ScreenLimit {
  readonly name: string;
  readonly raw: number;
  readonly gzip: number;
}

/**
 * Lazy screens by Vite manifest key (the source path of the dynamic entry; stable, unlike the hashed file
 * name). A new screen is added here with its own fixed limits, in the PR that adds it, with the owner's
 * approval (ADR-0023). Nearby measures 90,842 raw / 22,798 gzip (JS 41,730 / 14,647, CSS 49,112 / 8,151);
 * 120,000 / 30,000 leaves 32 percent over each.
 */
export const LAZY_SCREEN_LIMITS: ReadonlyMap<string, ScreenLimit> = new Map([
  ["src/features/nearby/Nearby.tsx", { name: "nearby", raw: 120_000, gzip: 30_000 }],
]);

/**
 * One allowance for everything lazy that no single screen owns: the shared roots below and every chunk two
 * or more roots import. Measured 20,435 raw / 9,179 gzip with the service worker registration chunk (METRO-106,
 * 2,164 / 1,041 of it); 27,000 / 12,000 leaves 32 percent raw and 31 percent gzip.
 */
export const SHARED_LAZY_ALLOWANCE = { raw: 27_000, gzip: 12_000 } as const;

/**
 * Lazy roots that are not screens, by manifest key: the reveal helper, the Maps adapter, the service worker registration and web-vitals. The
 * web-vitals key is `../../node_modules/.bun/web-vitals@<version>/node_modules/web-vitals/dist/web-vitals.js`
 * under Vite 8 with Bun's isolated install; the pattern ignores the version and any directory layout before
 * `web-vitals/dist`. A key in another format matches nothing, so the chunk is unclassified and fails closed.
 */
const SHARED_LAZY_ROOTS: readonly RegExp[] = [
  /^src\/theme\/reveal\.ts$/u,
  /^src\/adapters\/maps\/index\.ts$/u,
  /^src\/sw\/register\.ts$/u,
  /(?:^|\/)node_modules\/(?:.+\/)?web-vitals\/dist\/web-vitals\.js$/u,
];

/** Which lazy roots exist. Tests pass their own; the gate uses `LAZY_MODEL`. */
export interface LazyModel {
  readonly screens: ReadonlyMap<string, ScreenLimit>;
  readonly sharedRoots: readonly RegExp[];
}
export const LAZY_MODEL: LazyModel = {
  screens: LAZY_SCREEN_LIMITS,
  sharedRoots: SHARED_LAZY_ROOTS,
};

/** Fixed prefix; the keys of the unclassified chunks follow, in manifest order. */
export const UNCLASSIFIED_PREFIX =
  "Unclassified lazy chunk, add it to the per-screen limits or the shared allowance (ADR-0023): ";

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
 * The offline shell worker, written beside `index.html` by `scripts/sw-plugin.ts` (METRO-106, ADR-0024). Like the
 * head scripts it is an exact-name file from outside the Vite manifest, so it is not an orphan; unlike them it is
 * never on the first-visit path (the page registers it after load and idle). It has its own bucket and limit.
 * One that nothing built is simply not counted; one the app registers but the build lacks fails closed
 * (`WORKER_MISSING`).
 */
export const WORKER_SCRIPTS = ["sw.js"] as const;

/** The worker bucket: sized from the measured 3,824 raw / 1,730 gzip with about 55 percent raw margin. */
export const WORKER_LIMIT = { raw: 6_000, gzip: 2_800 } as const;

/** One fixed message when the built app registers `/sw.js` but the build has no such file. */
export const WORKER_MISSING = "The app registers /sw.js but the build has no sw.js";

/** The registration call the app makes, as it appears in a minified chunk. */
export const WORKER_REGISTRATION = /register\(\s*[`"']\/sw\.js[`"']/u;

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

const SHARED = "shared";
const isCode = (file: string) => /\.(js|css)$/u.test(file);

const total = (assets: readonly Asset[]) => ({
  raw: assets.reduce((sum, asset) => sum + asset.raw, 0),
  gzip: assets.reduce((sum, asset) => sum + asset.gzip, 0),
});

/**
 * Class of each lazy JS/CSS file: a screen name or "shared". Each root (a screen or a shared root) owns its
 * own file, its CSS and the static `imports` closure below it, minus first-visit files. A file reached from
 * two or more roots is shared. Chunks no root reaches are returned as keys. `dynamicImports` are never
 * followed: a dynamic entry is a root or it is unclassified.
 */
function classifyLazy(manifest: Manifest, first: ReadonlySet<string>, model: LazyModel) {
  const owners = new Map<string, Set<string>>();
  const bucketOf = new Map<string, string>();
  const reached = new Set<string>();
  for (const root of manifest.keys()) {
    const bucket =
      model.screens.get(root)?.name ??
      (model.sharedRoots.some((rule) => rule.test(root)) ? SHARED : null);
    if (bucket === null) continue;
    bucketOf.set(root, bucket);
    const seen = new Set<string>([root]);
    const pending = [root];
    for (let key = pending.pop(); key !== undefined; key = pending.pop()) {
      const chunk = manifest.get(key);
      if (chunk === undefined) continue;
      reached.add(key);
      for (const file of [chunk.file, ...chunk.css]) {
        if (!isCode(file) || first.has(file)) continue;
        owners.set(file, (owners.get(file) ?? new Set<string>()).add(root));
      }
      for (const next of chunk.imports) {
        if (seen.has(next)) continue;
        seen.add(next);
        pending.push(next);
      }
    }
  }
  const classes = new Map<string, string>();
  for (const [file, roots] of owners)
    classes.set(file, roots.size === 1 ? (bucketOf.get([...roots][0] ?? "") ?? SHARED) : SHARED);
  const unclassified = [...manifest]
    .filter(
      ([key, chunk]) =>
        !reached.has(key) && [chunk.file, ...chunk.css].some((f) => isCode(f) && !first.has(f)),
    )
    .map(([key]) => key);
  return { classes, unclassified };
}

const percent = (used: number, limit: number) => ((used * 100) / limit).toFixed(1);

interface Size {
  readonly raw: number;
  readonly gzip: number;
}

/** One line per bucket: raw and gzip use against that bucket's limits. */
const bucketLine = (label: string, noun: string, used: Size, limit: Size) =>
  `${label}: ${used.raw} bytes raw (${noun} ${limit.raw}; ${percent(used.raw, limit.raw)} percent used); ${used.gzip} bytes gzip (${noun} ${limit.gzip}; ${percent(used.gzip, limit.gzip)} percent used)`;

export function evaluateBundle(
  assets: readonly Asset[],
  manifestText: string | null,
  indexHtml: string | null = null,
  model: LazyModel = LAZY_MODEL,
  registersWorker = false,
): BudgetReport {
  if (total(assets).raw === 0)
    return { lines: [], problems: ["No production JS/CSS artifacts found"] };
  const manifest = parseManifest(manifestText);
  const chunks = manifest === null ? null : firstVisitFiles(manifest);
  const onDisk = new Set(assets.map((asset) => asset.path));
  const heads = HEAD_SCRIPTS.filter((script) => onDisk.has(script));
  if (HEAD_SCRIPTS.some((script) => !onDisk.has(script) && indexHtml?.includes(`src="/${script}"`)))
    return { lines: [], problems: [HEAD_SCRIPT_MISSING] };
  const workers = WORKER_SCRIPTS.filter((script) => onDisk.has(script));
  if (registersWorker && workers.length === 0) return { lines: [], problems: [WORKER_MISSING] };
  const files = chunks === null ? null : new Set([...chunks, ...heads]);
  if (manifest === null || files === null || [...files].some((file) => !onDisk.has(file)))
    return { lines: [], problems: [MANIFEST_FAILURE] };
  // Every emitted file must be known to the manifest, as a chunk `file` or in a `css` list.
  const listed = new Set<string>([...heads, ...workers]);
  for (const chunk of manifest.values()) {
    listed.add(chunk.file);
    for (const file of chunk.css) listed.add(file);
  }
  if (assets.some((asset) => !listed.has(asset.path)))
    return { lines: [], problems: [MANIFEST_STALE] };
  // Fail closed: a lazy chunk no screen or shared root reaches has no limit, so it cannot pass.
  const { classes, unclassified } = classifyLazy(manifest, files, model);
  if (unclassified.length > 0)
    return { lines: [], problems: [UNCLASSIFIED_PREFIX + unclassified.join(", ")] };

  const sorted = [...assets];
  sorted.sort((a, b) => b.raw - a.raw || a.path.localeCompare(b.path));
  const lines = ["Production JS/CSS files, largest first (raw / gzip bytes):"];
  for (const { path, raw, gzip } of sorted) {
    const kind = files.has(path)
      ? "first-visit"
      : workers.some((worker) => worker === path)
        ? "worker"
        : `lazy (${classes.get(path) ?? SHARED})`;
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
  const usedBy = (name: string) =>
    total(sorted.filter((asset) => classes.get(asset.path) === name));
  for (const { name, raw, gzip } of model.screens.values()) {
    const used = usedBy(name);
    lines.push(bucketLine(`Lazy screen ${name}`, "limit", used, { raw, gzip }));
    if (used.raw > raw || used.gzip > gzip)
      problems.push(`Lazy screen limit exceeded for ${name}: ${raw} raw / ${gzip} gzip bytes`);
  }
  const shared = usedBy(SHARED);
  lines.push(bucketLine("Shared lazy", "allowance", shared, SHARED_LAZY_ALLOWANCE));
  if (shared.raw > SHARED_LAZY_ALLOWANCE.raw || shared.gzip > SHARED_LAZY_ALLOWANCE.gzip)
    problems.push(
      `Shared lazy allowance exceeded: ${SHARED_LAZY_ALLOWANCE.raw} raw / ${SHARED_LAZY_ALLOWANCE.gzip} gzip bytes`,
    );
  if (workers.length > 0) {
    const worker = total(sorted.filter((asset) => workers.some((name) => name === asset.path)));
    lines.push(bucketLine("Worker", "limit", worker, WORKER_LIMIT));
    if (worker.raw > WORKER_LIMIT.raw || worker.gzip > WORKER_LIMIT.gzip)
      problems.push(
        `Worker limit exceeded: ${WORKER_LIMIT.raw} raw / ${WORKER_LIMIT.gzip} gzip bytes`,
      );
  }
  return { lines, problems };
}

export async function bundleMain(args: readonly string[]): Promise<number> {
  const root = resolve(args[0] ?? "apps/web/dist/client");
  const manifest = await readFile(join(root, MANIFEST_PATH), "utf8").catch(() => null);
  const indexHtml = await readFile(join(root, "index.html"), "utf8").catch(() => null);
  const assets = await collectAssets(root);
  // The app registers the worker if any built chunk (not the worker itself) makes the registration call.
  const scripts = assets.filter(
    (asset) => asset.path.endsWith(".js") && !WORKER_SCRIPTS.some((name) => name === asset.path),
  );
  const sources = await Promise.all(
    scripts.map(async (asset) => readFile(join(root, asset.path), "utf8")),
  );
  const registersWorker = sources.some((source) => WORKER_REGISTRATION.test(source));
  const report = evaluateBundle(assets, manifest, indexHtml, LAZY_MODEL, registersWorker);
  for (const line of report.lines) console.log(line);
  for (const problem of report.problems) console.error(problem);
  return report.problems.length === 0 ? 0 : 1;
}
