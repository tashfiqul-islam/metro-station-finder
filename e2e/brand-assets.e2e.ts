import { readFileSync } from "node:fs";
import { join } from "node:path";

import { chromiumRasteriser } from "../scripts/brand-chromium";
import { cliMain, manifestFiles } from "../scripts/build-brand-assets";
import { firstVisitFiles, parseManifest } from "../scripts/bundle-budget";
import { OG_IMAGE_PATH, SITE_ORIGIN } from "../scripts/site-origin";
import { expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-107 brand and install assets, through the built app served as every journey is served (workerd
 * static assets): content types, caching, the favicon drawn by the browser, nothing in the first visit.
 * The regeneration check needs Chromium and so runs on the chromium project only (playwright.config.ts).
 */
const root = process.cwd();
const publicFile = (path: string): Buffer => readFileSync(join(root, "apps/web/public", path));

const TYPES: Record<string, RegExp> = {
  "/manifest.webmanifest": /^application\/manifest\+json|^application\/json/u,
  "/favicon.svg": /^image\/svg\+xml/u,
  "/favicon.ico": /^image\/(x-icon|vnd\.microsoft\.icon)/u,
  "/apple-touch-icon.png": /^image\/png/u,
  "/icons/icon-192.png": /^image\/png/u,
  "/icons/icon-512.png": /^image\/png/u,
  "/icons/icon-maskable-192.png": /^image\/png/u,
  "/icons/icon-maskable-512.png": /^image\/png/u,
  "/icons/icon-monochrome-512.png": /^image\/png/u,
  "/og/og-default.png": /^image\/png/u,
  "/robots.txt": /^text\/plain/u,
};

test.describe("brand assets (METRO-107)", () => {
  test("METRO-107 regenerating from the masters reproduces the committed files", async () => {
    const lines: string[] = [];
    const code = await cliMain(["--check"], chromiumRasteriser, {
      root,
      log: (line) => lines.push(line),
    });
    expect(lines).toEqual(["11 generated files match the masters"]);
    expect(code).toBe(0);
  });

  for (const [path, type] of Object.entries(TYPES)) {
    test(`METRO-107 ${path} is served as the real file, with its type and no immutable caching`, async ({
      request,
    }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(type);
      // Unhashed names must revalidate: the immutable rule is for /assets/* only.
      expect(response.headers()["cache-control"] ?? "").not.toContain("immutable");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      // The SPA fallback would answer a missing file with index.html and a 200; the bytes prove it is the file.
      expect(Buffer.compare(await response.body(), publicFile(path.slice(1)))).toBe(0);
    });
  }

  test("METRO-107 every manifest file is served, and the shipped HTML links the icons and manifest", async ({
    request,
  }) => {
    const manifest: unknown = await (await request.get("/manifest.webmanifest")).json();
    for (const file of manifestFiles(manifest)) {
      expect((await request.get(file.src)).status(), file.src).toBe(200);
    }
    const html = await (await request.get("/")).text();
    for (const href of [
      "/favicon.ico",
      "/favicon.svg",
      "/apple-touch-icon.png",
      "/manifest.webmanifest",
    ]) {
      expect(html, href).toContain(`href="${href}"`);
    }
    expect(html.match(/name="theme-color"/gu)).toHaveLength(2);
  });

  test("METRO-122 the shipped HTML has the canonical link, og:url and og:image on one origin, with no token left", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toContain("%SITE_ORIGIN%");
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_ORIGIN}/" />`);
    expect(html).toContain(`<meta property="og:image" content="${SITE_ORIGIN}${OG_IMAGE_PATH}" />`);
  });

  test("METRO-107 the browser draws favicon.svg (its inline style is fine under the page CSP)", async ({
    page,
  }) => {
    await installMapsStub(page);
    await page.goto("/");
    const painted = await page.evaluate(async () => {
      const image = new Image();
      image.src = "/favicon.svg";
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      if (context === null) return -1;
      context.drawImage(image, 0, 0, 64, 64);
      const { data } = context.getImageData(0, 0, 64, 64);
      let opaque = 0;
      for (let index = 3; index < data.length; index += 4)
        if ((data[index] ?? 0) > 128) opaque += 1;
      return opaque;
    });
    // The mark's line and ring cover a few hundred of the 4096 pixels; blank or a failed style is near 0.
    expect(painted).toBeGreaterThan(300);
  });

  test("METRO-107 no image, icon or manifest file is part of the first-visit bundle set", () => {
    const manifest = parseManifest(
      readFileSync(join(root, "apps/web/dist/client/.vite/manifest.json"), "utf8"),
    );
    expect(manifest).not.toBeNull();
    const files = [...(firstVisitFiles(manifest ?? new Map()) ?? [])];
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => !/\.(js|css)$/u.test(file))).toEqual([]);
  });
});
