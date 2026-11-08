import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/** Totals over every emitted JS/CSS file (unchanged since METRO-12). */
export const TOTAL_BUDGET = { raw: 250_000, gzip: 80_000 } as const;

/**
 * The entry chunk, the module script `index.html` loads first (METRO-44 part C). Part C first set it to the
 * entry measured on `eefd080` (240,264 raw / 76,109 gzip) plus about 3 percent: 247,500 / 78,500. Part B of
 * METRO-44 (web-vitals, ADR-0019) puts a library in that chunk, so on 2026-11-08 the orchestrator, under the
 * owner's delegation, equalised ONLY this budget to the totals as an interim step (not a separate owner
 * decision): 250,000 / 80,000. The check is inert until the owner-approved redesign (Plane METRO-104: the
 * limits apply to the first-visit set from the Vite manifest, plus a ceiling for all chunks) replaces it. While the build is one chunk the entry is
 * 99.97 percent of the total, so the entry budget cannot be tighter than the totals and adds no protection
 * yet; it matters once code is split, because lazy chunks count toward the totals only. The totals above are
 * unchanged. Headroom after web-vitals: 1,059 raw / 787 gzip bytes.
 */
export const ENTRY_BUDGET = { raw: 250_000, gzip: 80_000 } as const;

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

/** A quoted attribute value, matched only as a whole attribute name (`src` never matches `data-src`). */
function attribute(tag: string, name: string): string | null {
  const found = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu").exec(tag);
  return found?.[1] ?? found?.[2] ?? null;
}

/**
 * The first `<script type="module" src>` of the page, as a path relative to the build root: a leading `/`
 * or `./` and any query or fragment are removed. Anything else (no match) returns null and fails closed.
 */
export function entryScript(html: string): string | null {
  for (const tag of html.match(/<script\b[^>]*>/giu) ?? []) {
    if (attribute(tag, "type")?.toLowerCase() !== "module") continue;
    const src = attribute(tag, "src");
    if (src !== null && src !== "") return src.replace(/[?#].*$/u, "").replace(/^(?:\.?\/)+/u, "");
  }
  return null;
}

export interface BudgetReport {
  readonly lines: string[];
  readonly problems: string[];
}

export function evaluateBundle(assets: readonly Asset[], html: string | null): BudgetReport {
  const lines = ["Production JS/CSS files, largest first (raw / gzip bytes):"];
  for (const { path, raw, gzip } of assets) lines.push(`  ${path}: ${raw} raw; ${gzip} gzip`);
  const problems: string[] = [];
  const raw = assets.reduce((sum, asset) => sum + asset.raw, 0);
  const gzip = assets.reduce((sum, asset) => sum + asset.gzip, 0);
  if (raw === 0) return { lines, problems: ["No production JS/CSS artifacts found"] };
  lines.push(`Production JS/CSS: ${raw} bytes raw; ${gzip} bytes gzip`);
  if (raw > TOTAL_BUDGET.raw || gzip > TOTAL_BUDGET.gzip)
    problems.push(
      `Bundle budget exceeded: ${TOTAL_BUDGET.raw} raw / ${TOTAL_BUDGET.gzip} gzip bytes`,
    );
  const script = html === null ? null : entryScript(html);
  const entry = assets.find((asset) => asset.path === script);
  if (entry === undefined) {
    problems.push(
      "Entry chunk not found: index.html names no module script among the built assets",
    );
    return { lines, problems };
  }
  lines.push(
    `Entry chunk ${entry.path}: ${entry.raw} bytes raw; ${entry.gzip} bytes gzip` +
      ` (budget ${ENTRY_BUDGET.raw} / ${ENTRY_BUDGET.gzip})`,
  );
  if (entry.raw > ENTRY_BUDGET.raw || entry.gzip > ENTRY_BUDGET.gzip)
    problems.push(
      `Entry chunk budget exceeded: ${ENTRY_BUDGET.raw} raw / ${ENTRY_BUDGET.gzip} gzip bytes`,
    );
  return { lines, problems };
}

export async function bundleMain(args: readonly string[]): Promise<number> {
  const root = resolve(args[0] ?? "apps/web/dist/client");
  const html = await readFile(join(root, "index.html"), "utf8").catch(() => null);
  const report = evaluateBundle(await collectAssets(root), html);
  for (const line of report.lines) console.log(line);
  for (const problem of report.problems) console.error(problem);
  return report.problems.length === 0 ? 0 : 1;
}
