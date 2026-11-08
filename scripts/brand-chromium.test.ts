import {
  DIFF_SCRIPT,
  chromiumRasteriser,
  loadChromium,
  type RasterBrowser,
  type RasterPage,
} from "./brand-chromium.ts";
import { expectRejection } from "./test-support.ts";

/** A page that records what the rasteriser asked of it; the real browser run is `e2e/brand-assets.e2e.ts`. */
function fakeBrowser(answer: unknown) {
  const calls: string[] = [];
  const page: RasterPage = {
    setViewportSize: ({ width, height }) => {
      calls.push(`viewport ${width}x${height}`);
      return Promise.resolve();
    },
    setContent: (html) => {
      calls.push(`content ${html}`);
      return Promise.resolve();
    },
    screenshot: (options) => {
      calls.push(`screenshot ${JSON.stringify(options)}`);
      return Promise.resolve(Uint8Array.from([1, 2, 3]));
    },
    evaluate: (expression) => {
      calls.push(`evaluate ${expression}`);
      return Promise.resolve(answer);
    },
  };
  const browser: RasterBrowser = {
    newPage: () => Promise.resolve(page),
    close: () => {
      calls.push("close");
      return Promise.resolve();
    },
  };
  return { browser, calls };
}

describe("chromiumRasteriser", () => {
  test("renders an SVG at the requested size on a transparent background", async () => {
    const { browser, calls } = fakeBrowser(0);
    const rasteriser = await chromiumRasteriser({ launch: () => Promise.resolve(browser) });
    const png = await rasteriser.render("<svg/>", 192);
    expect(png).toEqual(Uint8Array.from([1, 2, 3]));
    expect(calls).toEqual([
      "viewport 192x192",
      'content <html><body style="margin:0;background:transparent"><svg/></body></html>',
      'screenshot {"omitBackground":true,"clip":{"x":0,"y":0,"width":192,"height":192}}',
    ]);
  });

  test("asks the page for the largest difference, passing both images as base64", async () => {
    const { browser, calls } = fakeBrowser(4);
    const rasteriser = await chromiumRasteriser({ launch: () => Promise.resolve(browser) });
    expect(await rasteriser.largestDifference(Uint8Array.from([1]), Uint8Array.from([2]))).toBe(4);
    expect(calls).toEqual([`evaluate (${DIFF_SCRIPT})(["AQ==","Ag=="])`]);
  });

  test("reads an answer that is not a number as a size mismatch", async () => {
    const { browser } = fakeBrowser("nope");
    const rasteriser = await chromiumRasteriser({ launch: () => Promise.resolve(browser) });
    expect(await rasteriser.largestDifference(new Uint8Array(), new Uint8Array())).toBe(-1);
  });

  test("closes the browser", async () => {
    const { browser, calls } = fakeBrowser(0);
    const rasteriser = await chromiumRasteriser({ launch: () => Promise.resolve(browser) });
    await rasteriser.close();
    expect(calls).toEqual(["close"]);
  });
});

describe("loadChromium", () => {
  test("finds chromium.launch in Playwright without launching a browser", async () => {
    expect(typeof (await loadChromium()).launch).toBe("function");
  });

  test("refuses a module that has no chromium.launch", async () => {
    await expectRejection(loadChromium("node:path"), "node:path does not export chromium.launch");
  });
});
