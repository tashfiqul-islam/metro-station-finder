import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

/** Totals over every emitted JS/CSS file (unchanged since METRO-12). */
export const TOTAL_BUDGET = { raw: 250_000, gzip: 80_000 } as const;

/**
 * The entry chunk, the module script `index.html` loads first (METRO-44 part C). Measured 2026-11-08 at
 * 238,537 bytes raw / 75,555 gzip on the base of this change; the ticket reports 243,513 / 77,335 once the
 * vitals beacon (part B) lands. The limits sit about 1.6 percent (raw) and 1.5 percent (gzip) above the
 * larger figure: room for a small change, while a new dependency (typically several kilobytes) fails here
 * before it can spend the shared total.
 */
export const ENTRY_BUDGET = { raw: 247_500, gzip: 78_500 } as const;

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

/** The first `<script type="module" src>` of the page, as a path relative to the build root. */
export function entryScript(html: string): string | null {
  for (const tag of html.match(/<script\b[^>]*>/giu) ?? []) {
    if (!/\btype=["']module["']/iu.test(tag)) continue;
    const src = /\bsrc=["']([^"']+)["']/iu.exec(tag)?.[1];
    if (src !== undefined) return src.replace(/^\/+/u, "");
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
