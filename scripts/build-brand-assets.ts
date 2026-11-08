import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { chromiumRasteriser, type Rasteriser } from "./brand-chromium.ts";
import { isRecord } from "./guards.ts";
import { imageSize } from "./image-size.ts";

/**
 * Brand and install assets (METRO-107). The vector sources live in `apps/web/brand/` (not shipped, not
 * imported by the app); this script turns them into the files the browser, phones and install prompts use,
 * in `apps/web/public/`. The generated files are committed, so a deploy never needs a browser.
 *
 * The pure parts (plan, ICO packing, manifest, lock) are tested with a fake rasteriser. The real one is
 * `brand-chromium.ts` (the repository's Playwright and Chromium, no new dependency); it is exercised by
 * `e2e/brand-assets.e2e.ts`, which regenerates everything and compares decoded pixels with the committed files.
 * Usage: `bun run scripts/build-brand-assets.ts --write | --check` (needs `playwright install chromium`).
 */
export const BRAND_DIR = "apps/web/brand";
export const PUBLIC_DIR = "apps/web/public";
export const LOCK_FILE = "assets.lock.json";

/** Text and copy outputs are compared byte for byte; PNG and ICO pixels may differ by this much per channel. */
export const PIXEL_TOLERANCE = 2;

/** True when both PNGs decode to the same size and no channel differs by more than PIXEL_TOLERANCE. */
export async function samePixels(
  rasteriser: Rasteriser,
  a: Uint8Array,
  b: Uint8Array,
): Promise<boolean> {
  const largest = await rasteriser.largestDifference(a, b);
  return largest >= 0 && largest <= PIXEL_TOLERANCE;
}

interface PngJob {
  readonly out: string;
  readonly source: string;
  readonly size: number;
}

/** Each PNG: the master it is drawn from and its pixel size. The apple-touch icon is opaque and full-bleed. */
export const PNG_JOBS: readonly PngJob[] = [
  { out: "apple-touch-icon.png", source: "apple-touch-icon.svg", size: 180 },
  { out: "icons/icon-192.png", source: "app-icon.svg", size: 192 },
  { out: "icons/icon-512.png", source: "app-icon.svg", size: 512 },
  { out: "icons/icon-maskable-192.png", source: "app-icon-maskable.svg", size: 192 },
  { out: "icons/icon-maskable-512.png", source: "app-icon-maskable.svg", size: 512 },
  { out: "icons/icon-monochrome-512.png", source: "icon-monochrome.svg", size: 512 },
];

/** The ICO holds a 16 and a 32 drawn from the micro mark and a 48 from the small mark. */
export const ICO_JOBS: readonly { readonly source: string; readonly size: number }[] = [
  { source: "mark-micro.svg", size: 16 },
  { source: "mark-micro.svg", size: 32 },
  { source: "mark-small.svg", size: 48 },
];

export const COPY_JOBS: readonly { readonly out: string; readonly source: string }[] = [
  { out: "favicon.svg", source: "favicon.svg" },
];

/** Files committed in public/ that no script can regenerate (app screenshots); locked by hash only. */
export const STATIC_FILES: readonly string[] = ["screenshots/narrow.webp", "screenshots/wide.webp"];

export const ROBOTS_TXT =
  "User-agent: *\nAllow: /\n# Add after deploy: Sitemap: <absolute URL of /sitemap.xml>\n";

/**
 * The web app manifest. No `serviceworker` member and no offline claim: the offline service worker is
 * METRO-106 and the manifest says only what ships today. `theme_color` and `background_color` come from the
 * approved handoff.
 */
export const MANIFEST = {
  name: "Metro Station Finder",
  short_name: "Metro",
  description: "Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare.",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  lang: "en",
  dir: "ltr",
  background_color: "#F2F6F6",
  theme_color: "#0B7A84",
  categories: ["navigation", "travel", "utilities"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/icons/icon-maskable-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-monochrome-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "monochrome",
    },
  ],
  screenshots: [
    {
      src: "/screenshots/wide.webp",
      sizes: "1280x800",
      type: "image/webp",
      form_factor: "wide",
      label: "Nearest station on desktop",
    },
    {
      src: "/screenshots/narrow.webp",
      sizes: "780x1688",
      type: "image/webp",
      form_factor: "narrow",
      label: "Nearest station on a phone",
    },
  ],
} as const;

export const MANIFEST_JSON = `${JSON.stringify(MANIFEST, null, 2)}\n`;

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

/** Packs PNG images into one ICO file (PNG-in-ICO, 32 bits per pixel; sizes of 1 to 255). */
export function packIco(images: readonly { size: number; png: Uint8Array }[]): Uint8Array {
  const headerLength = 6 + 16 * images.length;
  const total = images.reduce((sum, image) => sum + image.png.length, headerLength);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = headerLength;
  images.forEach((image, index) => {
    const entry = 6 + 16 * index;
    view.setUint8(entry, image.size);
    view.setUint8(entry + 1, image.size);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(image.png, offset);
    offset += image.png.length;
  });
  return out;
}

/** The PNG images inside an ICO built by `packIco`, in order. Null when the directory is inconsistent. */
export function unpackIco(bytes: Uint8Array): Uint8Array[] | null {
  const info = imageSize(bytes);
  if (info?.format !== "ico") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const images: Uint8Array[] = [];
  for (let index = 0; index < info.sizes.length; index += 1) {
    const entry = 6 + 16 * index;
    const start = view.getUint32(entry + 12, true);
    const end = start + view.getUint32(entry + 8, true);
    if (end > bytes.length) return null;
    images.push(bytes.subarray(start, end));
  }
  return images;
}

/** Sets the root `width` and `height` so one master renders at any size. */
export function sized(svg: string, size: number): string {
  return svg.replace(
    /width="\d+(\.\d+)?" height="\d+(\.\d+)?"/u,
    `width="${size}" height="${size}"`,
  );
}

export type Files = ReadonlyMap<string, Uint8Array>;

/** Every generated file, keyed by its path under public/. `read` returns a master by its name in brand/. */
export async function buildAssets(
  rasteriser: Rasteriser,
  read: (name: string) => Promise<string>,
): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const job of COPY_JOBS) out.set(job.out, text(await read(job.source)));
  out.set("robots.txt", text(ROBOTS_TXT));
  out.set("manifest.webmanifest", text(MANIFEST_JSON));
  for (const job of PNG_JOBS) {
    out.set(job.out, await rasteriser.render(sized(await read(job.source), job.size), job.size));
  }
  const icons: { size: number; png: Uint8Array }[] = [];
  for (const job of ICO_JOBS) {
    icons.push({
      size: job.size,
      png: await rasteriser.render(sized(await read(job.source), job.size), job.size),
    });
  }
  out.set("favicon.ico", packIco(icons));
  return out;
}

export const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/** Code-unit order, so the lock text is the same on every machine (localeCompare depends on ICU data). */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function hashes(files: Files): Record<string, string> {
  const entries = [...files];
  entries.sort(([a], [b]) => byCodeUnit(a, b));
  return Object.fromEntries(entries.map(([name, bytes]) => [name, sha256(bytes)]));
}

/** The lock: the hash of every master, every generated file and every static file. */
export function lockText(sources: Files, outputs: Files, statics: Files): string {
  const lock = { sources: hashes(sources), outputs: hashes(outputs), static: hashes(statics) };
  return `${JSON.stringify(lock, null, 2)}\n`;
}

/**
 * Problems found by comparing the committed files with the lock: a master edited without regenerating, a
 * generated file edited or replaced by hand, a file added or removed. Empty when they agree.
 */
export function lockProblems(
  lock: string,
  sources: Files,
  outputs: Files,
  statics: Files,
): string[] {
  let expected: unknown;
  try {
    expected = JSON.parse(lock);
  } catch {
    return [`${LOCK_FILE} is not valid JSON`];
  }
  const problems: string[] = [];
  const sections: [string, Files][] = [
    ["sources", sources],
    ["outputs", outputs],
    ["static", statics],
  ];
  for (const [section, files] of sections) {
    const recorded = isRecord(expected) ? expected[section] : undefined;
    if (!isRecord(recorded)) {
      problems.push(`${LOCK_FILE} has no "${section}" section`);
      continue;
    }
    const actual = hashes(files);
    for (const name of new Set([...Object.keys(recorded), ...Object.keys(actual)])) {
      if (recorded[name] !== actual[name])
        problems.push(`${section}/${name} differs from ${LOCK_FILE}`);
    }
  }
  return problems;
}

/** Fresh output against the committed file: bytes for text, decoded pixels for PNG and ICO. */
export async function sameOutput(
  rasteriser: Rasteriser,
  name: string,
  fresh: Uint8Array,
  committed: Uint8Array | null,
): Promise<boolean> {
  if (committed === null) return false;
  if (name.endsWith(".png")) return samePixels(rasteriser, fresh, committed);
  if (name.endsWith(".ico")) {
    const a = unpackIco(fresh);
    const b = unpackIco(committed);
    if (a === null || b === null || a.length !== b.length) return false;
    for (const [index, image] of a.entries()) {
      if (!(await samePixels(rasteriser, image, b[index] ?? new Uint8Array()))) return false;
    }
    return true;
  }
  return sha256(fresh) === sha256(committed);
}

export interface BrandDeps {
  readonly root: string;
  readonly rasteriser: Rasteriser;
  readonly log: (line: string) => void;
}

async function readAll(
  directory: string,
  names: readonly string[],
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const name of names) files.set(name, await readFile(join(directory, name)));
  return files;
}

/** The names of the SVG masters in brand/. */
export async function listMasters(root: string): Promise<string[]> {
  const names = (await readdir(join(root, BRAND_DIR))).filter((name) => name.endsWith(".svg"));
  names.sort(byCodeUnit);
  return names;
}

/**
 * `--write` regenerates the files and the lock; `--check` regenerates in memory and fails when a committed
 * file differs (decoded pixels for PNG and ICO) or the lock is out of date. Returns the exit code.
 */
export async function brandMain(args: readonly string[], deps: BrandDeps): Promise<number> {
  const mode = args[0];
  if (mode !== "--write" && mode !== "--check") {
    deps.log("Usage: build-brand-assets.ts --write | --check");
    return 2;
  }
  const brand = join(resolve(deps.root), BRAND_DIR);
  const pub = join(resolve(deps.root), PUBLIC_DIR);
  const masters = await readAll(brand, await listMasters(deps.root));
  const fresh = await buildAssets(deps.rasteriser, (name) =>
    Promise.resolve(new TextDecoder().decode(masters.get(name))),
  );
  const statics = await readAll(pub, STATIC_FILES);
  if (mode === "--write") {
    for (const [name, bytes] of fresh) {
      await mkdir(dirname(join(pub, name)), { recursive: true });
      await writeFile(join(pub, name), bytes);
    }
    await writeFile(join(brand, LOCK_FILE), lockText(masters, fresh, statics));
    deps.log(`Wrote ${fresh.size} files to ${PUBLIC_DIR} and ${LOCK_FILE}`);
    return 0;
  }
  const problems: string[] = [];
  const committed = new Map<string, Uint8Array>();
  for (const [name, bytes] of fresh) {
    const existing = await readFile(join(pub, name)).catch(() => null);
    if (existing !== null) committed.set(name, existing);
    if (!(await sameOutput(deps.rasteriser, name, bytes, existing))) {
      problems.push(`${PUBLIC_DIR}/${name} differs from the regenerated output`);
    }
  }
  const lock = await readFile(join(brand, LOCK_FILE), "utf8").catch(() => "");
  problems.push(...lockProblems(lock, masters, committed, statics));
  for (const problem of problems) deps.log(problem);
  if (problems.length === 0) deps.log(`${fresh.size} generated files match the masters`);
  return problems.length === 0 ? 0 : 1;
}

/** The command line: opens the rasteriser, runs `--write` or `--check`, and always closes it. */
export async function cliMain(
  args: readonly string[],
  open: () => Promise<Rasteriser>,
  deps: Omit<BrandDeps, "rasteriser">,
): Promise<number> {
  const rasteriser = await open();
  try {
    return await brandMain(args, { ...deps, rasteriser });
  } finally {
    await rasteriser.close();
  }
}

const ICON_SIZES = /^(\d+)x(\d+)$/u;
const PURPOSES = new Set(["any", "maskable", "monochrome"]);
const REQUIRED_ICONS: readonly [string, string][] = [
  ["192x192", "any"],
  ["512x512", "any"],
  ["192x192", "maskable"],
  ["512x512", "maskable"],
  ["512x512", "monochrome"],
];

/** The icon and screenshot members of a manifest: the parts that name files. */
export interface ManifestFile {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
}

function members(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  const items: unknown[] = value;
  return items.filter(isRecord);
}

/** Schema problems of a parsed manifest (what installability and this ticket require). Empty when valid. */
export function manifestProblems(data: unknown): string[] {
  if (!isRecord(data)) return ["manifest is not an object"];
  const problems: string[] = [];
  for (const key of ["name", "short_name", "start_url", "scope", "id", "display"]) {
    if (typeof data[key] !== "string" || data[key] === "") problems.push(`${key} is missing`);
  }
  for (const key of ["theme_color", "background_color"]) {
    const value = data[key];
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/u.test(value)) {
      problems.push(`${key} is not a #RRGGBB colour`);
    }
  }
  if (data["display"] !== "standalone") problems.push("display is not standalone");
  if ("serviceworker" in data) problems.push("manifest names a service worker (METRO-106)");
  if (/offline/iu.test(JSON.stringify(data))) problems.push("manifest makes an offline claim");
  const icons = members(data, "icons");
  const seen = new Set<string>();
  for (const icon of icons) {
    const size = typeof icon["sizes"] === "string" ? ICON_SIZES.exec(icon["sizes"]) : null;
    const purpose = icon["purpose"];
    if (typeof icon["src"] !== "string" || !icon["src"].startsWith("/"))
      problems.push("icon src is not a root path");
    if (size === null || size[1] !== size[2])
      problems.push(`icon ${String(icon["src"])} sizes is not square`);
    if (icon["type"] !== "image/png") problems.push(`icon ${String(icon["src"])} is not image/png`);
    if (typeof purpose !== "string" || !PURPOSES.has(purpose)) {
      problems.push(
        `icon ${String(icon["src"])} purpose is not exactly one of any, maskable, monochrome`,
      );
    } else seen.add(`${String(icon["sizes"])} ${purpose}`);
  }
  for (const [size, purpose] of REQUIRED_ICONS) {
    if (!seen.has(`${size} ${purpose}`)) problems.push(`no ${purpose} icon at ${size}`);
  }
  for (const shot of members(data, "screenshots")) {
    if (typeof shot["src"] !== "string" || !shot["src"].startsWith("/"))
      problems.push("screenshot src is not a root path");
    if (shot["form_factor"] !== "wide" && shot["form_factor"] !== "narrow")
      problems.push("screenshot form_factor is not wide or narrow");
    if (typeof shot["label"] !== "string" || shot["label"] === "")
      problems.push("screenshot has no label");
  }
  return problems;
}

/** Every file a manifest names (icons and screenshots) with the size and type it declares. */
export function manifestFiles(data: unknown): ManifestFile[] {
  if (!isRecord(data)) return [];
  return [...members(data, "icons"), ...members(data, "screenshots")].map((entry) => ({
    src: String(entry["src"]),
    sizes: String(entry["sizes"]),
    type: String(entry["type"]),
  }));
}

const args = process.argv.slice(2);
const cliDeps = { root: process.cwd(), log: console.log };
if (import.meta.main) process.exitCode = await cliMain(args, chromiumRasteriser, cliDeps);
