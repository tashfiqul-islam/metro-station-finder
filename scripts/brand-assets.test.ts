import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  BRAND_DIR,
  LOCK_FILE,
  MANIFEST_JSON,
  PNG_JOBS,
  PUBLIC_DIR,
  lockProblems,
  manifestFiles,
  manifestProblems,
  unpackIco,
} from "./build-brand-assets.ts";
import { imageSize } from "./image-size.ts";

/**
 * METRO-107: the committed brand and install assets, checked as the repository holds them. These tests read
 * files only (no browser). The regeneration drift check, which needs Chromium, is `e2e/brand-assets.e2e.ts`.
 */
const root = join(import.meta.dir, "..");
const publicDir = join(root, PUBLIC_DIR);
const brandDir = join(root, BRAND_DIR);

const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(directory, entry.name))
      : [relative(publicDir, join(directory, entry.name)).replaceAll("\\", "/")],
  );
const bytes = (name: string): Uint8Array => readFileSync(join(publicDir, name));
const read = (directory: string, names: string[]): Map<string, Uint8Array> =>
  new Map(names.map((name) => [name, readFileSync(join(directory, name))]));
const manifest: unknown = JSON.parse(readFileSync(join(publicDir, "manifest.webmanifest"), "utf8"));

/**
 * Size cap per shipped file, in bytes: about 20 percent above the committed size, so a re-export that
 * balloons fails, and a new file in public/ must be listed here on purpose (no stray image, no font).
 */
const CAPS: Record<string, number> = {
  _headers: 2_000,
  ".assetsignore": 100,
  "apple-touch-icon.png": 22_000,
  "favicon.ico": 4_500,
  "favicon.svg": 1_200,
  "icons/icon-192.png": 30_000,
  "icons/icon-512.png": 165_000,
  "icons/icon-maskable-192.png": 13_000,
  "icons/icon-maskable-512.png": 110_000,
  "icons/icon-monochrome-512.png": 10_000,
  // METRO-105: third-party notices (fonts, icons) and the pre-paint theme script; fonts stay in src/, hashed.
  "licenses.txt": 14_500,
  "manifest.webmanifest": 2_000,
  // METRO-122: the 1200 x 630 share image (503,569 bytes committed; a link preview needs well under 5 MB).
  "og/og-default.png": 600_000,
  "robots.txt": 200,
  "theme-boot.js": 600,
};

describe("brand assets on disk (METRO-107)", () => {
  test("every file in public/ is expected and under its size cap", () => {
    const files = walk(publicDir);
    expect(new Set(files)).toEqual(new Set(Object.keys(CAPS)));
    for (const file of files) {
      expect(statSync(join(publicDir, file)).size, file).toBeLessThanOrEqual(CAPS[file] ?? 0);
    }
  });

  test("the only file under og/ is the share image, generated from its outlined-text master (METRO-122)", () => {
    expect(walk(publicDir).filter((file) => file.startsWith("og/"))).toEqual(["og/og-default.png"]);
  });

  test("the manifest on disk is the one the script writes, and is valid", () => {
    expect(readFileSync(join(publicDir, "manifest.webmanifest"), "utf8")).toBe(MANIFEST_JSON);
    expect(manifestProblems(manifest)).toEqual([]);
  });

  test("every file the manifest names exists with the type and the pixel size it declares", () => {
    const files = manifestFiles(manifest);
    expect(files).toHaveLength(5);
    for (const file of files) {
      const size = imageSize(bytes(file.src.slice(1)));
      const declared = /^(\d+)x(\d+)$/u.exec(file.sizes);
      expect(`image/${size?.format}`, file.src).toBe(file.type);
      expect(size?.sizes, file.src).toEqual([
        { width: Number(declared?.[1]), height: Number(declared?.[2]) },
      ]);
    }
  });

  test("favicon.ico holds 16, 32 and 48 pixel images", () => {
    expect(imageSize(bytes("favicon.ico"))?.sizes.map((size) => size.width)).toEqual([16, 32, 48]);
  });

  test("the offline claim appears only in the manifest description, and only because the worker is in the build", () => {
    for (const file of ["robots.txt", "favicon.svg"]) {
      expect(readFileSync(join(publicDir, file), "utf8"), file).not.toMatch(/offline/iu);
    }
    // The manifest carries exactly one mention, the pinned sentence (manifestProblems enforces the wording).
    const text = readFileSync(join(publicDir, "manifest.webmanifest"), "utf8");
    expect(text.match(/offline/giu)).toHaveLength(1);
    // Backed by the worker, wired end to end: the build step is a Vite plugin, the app starts the registration.
    // (The earlier version of this test only checked that the worker files exist, which proved nothing; the real
    // proof that the worker is built and registered is the built-output test in `e2e/station-picker.e2e.ts`.)
    expect(readFileSync(join(root, "apps/web/vite.config.ts"), "utf8")).toContain(
      "serviceWorkerPlugin({",
    );
    expect(readFileSync(join(root, "apps/web/src/main.tsx"), "utf8")).toContain(
      "startServiceWorker();",
    );
    for (const entry of readdirSync(brandDir).filter((name) => name.endsWith(".svg"))) {
      expect(readFileSync(join(brandDir, entry), "utf8"), entry).not.toMatch(/offline/iu);
    }
  });

  /**
   * What each layer catches. This lock (masters and text outputs, by SHA-256) catches a master edited
   * without regenerating and a hand-edited svg, manifest or robots.txt. It cannot see PNG or ICO bytes
   * (they differ between Chromium builds and operating systems), so for those this file checks existence,
   * decoded size and size cap, and `e2e/brand-assets.e2e.ts` regenerates them in Chromium and compares
   * decoded pixels: that is the layer that catches a swapped or hand-edited icon.
   */
  const masters = readdirSync(brandDir).filter((name) => name.endsWith(".svg"));
  const textOutputs = ["favicon.svg", "robots.txt", "manifest.webmanifest"];
  const lock = readFileSync(join(brandDir, LOCK_FILE), "utf8");

  test("the committed masters and text outputs agree with assets.lock.json", () => {
    expect(lockProblems(lock, read(brandDir, masters), read(publicDir, textOutputs))).toEqual([]);
  });

  test("tamper: an edited master or an edited text output fails the lock", () => {
    const editedMasters = read(brandDir, masters);
    editedMasters.set(
      "app-icon.svg",
      Uint8Array.from([...(editedMasters.get("app-icon.svg") ?? []), 32]),
    );
    expect(lockProblems(lock, editedMasters, read(publicDir, textOutputs))).toEqual([
      "sources/app-icon.svg differs from assets.lock.json",
    ]);
    const editedOutputs = read(publicDir, textOutputs);
    editedOutputs.set(
      "robots.txt",
      Uint8Array.from([...(editedOutputs.get("robots.txt") ?? []), 32]),
    );
    expect(lockProblems(lock, read(brandDir, masters), editedOutputs)).toEqual([
      "outputs/robots.txt differs from assets.lock.json",
    ]);
  });

  test("the share image is 1200 x 630, the size its og:image:width and og:image:height declare", () => {
    expect(PNG_JOBS.filter((job) => job.height !== undefined)).toEqual([
      { out: "og/og-default.png", source: "og-default.svg", size: 1200, height: 630 },
    ]);
    expect(imageSize(bytes("og/og-default.png"))?.sizes).toEqual([{ width: 1200, height: 630 }]);
  });

  test("the share image master is 1200 x 630 vector shapes only, in the approved palette (METRO-122)", () => {
    const svg = readFileSync(join(brandDir, "og-default.svg"), "utf8");
    expect(svg).toContain('width="1200" height="630" viewBox="0 0 1200 630"');
    // Text is outlined paths, and nothing is fetched, filtered, masked or referenced.
    expect(svg).not.toMatch(
      /<(?:text|tspan|image|use|filter|mask|pattern|foreignObject|style|script|font)[\s>]|xlink|data:|url\((?!#)/iu,
    );
    // Every colour is a token (#060A0A #F2F3F5 #9AA0AB #3FD5C8 #8CC8FF #1D6FB8 #141619 #075760 #101215),
    // the preview pane #1A1D21, or one of the three documented non-tokens (#020404 #000000 #FFFFFF).
    const allowed = new Set([
      "#060A0A",
      "#F2F3F5",
      "#9AA0AB",
      "#3FD5C8",
      "#8CC8FF",
      "#1D6FB8",
      "#141619",
      "#075760",
      "#101215",
      "#1A1D21",
      "#020404",
      "#000000",
      "#FFFFFF",
    ]);
    const used = new Set((svg.match(/#[0-9A-Fa-f]{3,8}\b/gu) ?? []).map((c) => c.toUpperCase()));
    expect([...used].filter((colour) => !allowed.has(colour))).toEqual([]);
    expect(svg).not.toMatch(/offline/iu);
  });

  test("every generated PNG exists at its declared pixel size", () => {
    for (const job of PNG_JOBS) {
      expect(imageSize(bytes(job.out))?.sizes, job.out).toEqual([
        { width: job.size, height: job.height ?? job.size },
      ]);
    }
  });

  test("each image inside favicon.ico really has the size its directory entry claims", () => {
    const ico = bytes("favicon.ico");
    const declared = imageSize(ico)?.sizes ?? [];
    const inner = unpackIco(ico) ?? [];
    expect(inner).toHaveLength(3);
    expect(inner.map((png) => imageSize(png))).toEqual(
      declared.map((size) => ({ format: "png", sizes: [size] })),
    );
  });

  test("nothing in the app source reaches a brand asset, so none can enter the first-visit bundle", () => {
    const sources = readdirSync(join(root, "apps/web/src"), { recursive: true, encoding: "utf8" })
      .filter((name) => /\.(ts|tsx|css)$/u.test(name))
      .map((name) => readFileSync(join(root, "apps/web/src", name), "utf8"));
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      // A reach into apps/web/brand, a root-path asset URL, the manifest, or a raster file.
      expect(source).not.toMatch(
        /\.\.\/brand\/|["'(]\/(?:icons|screenshots)\/|manifest\.webmanifest|\.(?:png|ico|webp)["')]/u,
      );
    }
  });
});

describe("index.html head (METRO-107)", () => {
  const html = readFileSync(join(root, "apps/web/index.html"), "utf8");

  test("links the favicons, apple-touch icon and manifest, all same-origin and all present", () => {
    for (const rel of [
      '<link rel="icon" href="/favicon.ico" sizes="48x48" />',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
      '<link rel="manifest" href="/manifest.webmanifest" />',
    ]) {
      expect(html).toContain(rel);
    }
    for (const [, href] of html.matchAll(
      /<link rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/gu,
    )) {
      expect(statSync(join(publicDir, (href ?? "").slice(1))).isFile(), href).toBe(true);
    }
    // The only absolute URLs are the canonical, og:url and og:image tags, written as the origin token that
    // `scripts/site-origin.ts` fills in (checked in `scripts/site-origin.test.ts`); the page itself names none.
    expect(html).not.toMatch(/(?:src|href|content)="https?:\/\//u);
  });

  test("sets a light and a dark theme colour by media query, each naming its scheme and its own colour (METRO-119)", () => {
    const tags = [...html.matchAll(/<meta\s+name="theme-color"[^>]*>/gu)].map((match) => match[0]);
    expect(tags).toHaveLength(2);
    for (const [scheme, colour] of [
      ["light", "#F2F6F6"],
      ["dark", "#060A0A"],
    ] as const) {
      const tag = tags.find((candidate) => candidate.includes(`data-scheme="${scheme}"`)) ?? "";
      expect(tag).toContain(`content="${colour}"`);
      expect(tag).toContain(`media="(prefers-color-scheme: ${scheme})"`);
      // theme-boot.js overwrites content for a chosen theme; theme.ts restores System from data-system.
      expect(tag).toContain(`data-system="${colour}"`);
    }
  });

  test("the theme colours are the page background tokens in both themes (METRO-119)", () => {
    const tokens = readFileSync(join(root, "apps/web/src/styles/tokens.css"), "utf8").toLowerCase();
    const light = /:root\s*\{[^}]*?--color-bg:\s*(#[0-9a-f]{6})/u.exec(tokens)?.[1];
    const dark = /:root\[data-theme="dark"\]\s*\{[^}]*?--color-bg:\s*(#[0-9a-f]{6})/u.exec(
      tokens,
    )?.[1];
    expect(html.toLowerCase()).toContain(`content="${light ?? "missing"}"`);
    expect(html.toLowerCase()).toContain(`content="${dark ?? "missing"}"`);
    expect([light, dark]).toEqual(["#f2f6f6", "#060a0a"]);
  });

  test("adds no inline style or script, so the CSP is unchanged", () => {
    expect(html).not.toMatch(/<style|style="|<script(?![^>]*\bsrc=)/u);
  });
});
