import { isRecord } from "./guards.ts";

/**
 * Renders SVG masters and compares PNGs. `build-brand-assets.ts` depends on this interface only; the real
 * implementation below runs Chromium from the repository's Playwright (no new dependency), and the tests
 * of the build script use a fake.
 */
export interface Rasteriser {
  /** Renders an SVG at `size` x `size` pixels on a transparent background and returns the PNG bytes. */
  render(svg: string, size: number): Promise<Uint8Array>;
  /** Largest per-channel difference between two decoded PNGs, or -1 when their sizes differ. */
  largestDifference(a: Uint8Array, b: Uint8Array): Promise<number>;
  close(): Promise<void>;
}

/** The slice of Playwright's Page the rasteriser uses, so a test can stand in for Chromium. */
export interface RasterPage {
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  setContent(html: string): Promise<void>;
  screenshot(options: {
    omitBackground: boolean;
    clip: { x: number; y: number; width: number; height: number };
  }): Promise<Uint8Array>;
  evaluate(expression: string): Promise<unknown>;
}

export interface RasterBrowser {
  newPage(): Promise<RasterPage>;
  close(): Promise<void>;
}

/**
 * Runs inside Chromium (kept as a string: it is not Node code). Decodes two base64 PNGs, draws them on
 * canvases and returns the largest per-channel difference, or -1 when the sizes differ.
 */
export const DIFF_SCRIPT = `async ([first, second]) => {
  const decode = async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  };
  const a = await decode(first);
  const b = await decode(second);
  if (a.width !== b.width || a.height !== b.height) return -1;
  let largest = 0;
  for (let index = 0; index < a.data.length; index += 1) {
    largest = Math.max(largest, Math.abs(a.data[index] - b.data[index]));
  }
  return largest;
}`;

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

export interface BrowserType {
  launch(): Promise<RasterBrowser>;
}

/**
 * Playwright's own typings need the DOM lib, which the Bun test project (tsconfig.test.json) does not have,
 * so Playwright is loaded by name and only the `chromium.launch` slice is used, checked at run time. Nothing
 * is launched here.
 */
export async function loadChromium(specifier = "@playwright/test"): Promise<BrowserType> {
  const loaded: unknown = await import(specifier);
  const chromium = isRecord(loaded) ? loaded["chromium"] : undefined;
  if (!isBrowserType(chromium)) throw new TypeError(`${specifier} does not export chromium.launch`);
  return chromium;
}

function isBrowserType(value: unknown): value is BrowserType {
  return isRecord(value) && typeof value["launch"] === "function";
}

/** Opens Chromium once and rasterises SVG masters with it. */
export async function chromiumRasteriser(browserType?: BrowserType): Promise<Rasteriser> {
  const browser = await (browserType ?? (await loadChromium())).launch();
  const page = await browser.newPage();
  return {
    async render(svg, size) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(
        `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
      );
      return page.screenshot({
        omitBackground: true,
        clip: { x: 0, y: 0, width: size, height: size },
      });
    },
    async largestDifference(a, b) {
      const largest = await page.evaluate(
        `(${DIFF_SCRIPT})(${JSON.stringify([toBase64(a), toBase64(b)])})`,
      );
      return typeof largest === "number" ? largest : -1;
    },
    close: () => browser.close(),
  };
}
