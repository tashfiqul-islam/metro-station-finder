import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import type { Browser, ConsoleMessage, Request } from "@playwright/test";

import { ciRefusal, liveReport } from "./smoke-live-report.ts";
import type { LiveRun } from "./smoke-live-report.ts";

/**
 * Owner-run live check (METRO-88), never run by CI or an agent: `bun run smoke:live`. It builds the web app
 * (Vite reads VITE_GOOGLE_MAPS_API_KEY from the environment or the root .env; this script never reads or
 * prints it), serves the build with the real `_headers`, opens Chromium, makes ONE autocomplete selection
 * and ONE route request against real Google, and prints only CSP console messages, request counts, the
 * Maps version and PASS or FAIL (see smoke-live-report.ts). Chromium is headed unless SMOKE_LIVE_HEADLESS=1.
 */
const web = fileURLToPath(new URL("../apps/web", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const origin = "http://127.0.0.1:4173";
/** A neighbourhood name, not an address or a person's place. */
const QUERY = "Motijheel";

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("the preview server did not start");
}

async function main(): Promise<boolean> {
  const refusal = ciRefusal(process.env);
  if (refusal !== null) {
    process.stdout.write(`${refusal}\n`);
    return false;
  }
  // stdio is ignored: build and server output is of no use here and must never be able to echo a key.
  const build = spawnSync(process.execPath, [vite, "build"], { cwd: web, stdio: "ignore" });
  if (build.status !== 0) throw new Error("the build failed; run `bun run build` to see why");
  const server = spawn(process.execPath, [vite, "preview"], { cwd: web, stdio: "ignore" });
  const run: { -readonly [K in keyof LiveRun]: LiveRun[K] } = {
    version: null,
    cspMessages: [],
    placesRequests: 0,
    routesRequests: 0,
    stationShown: false,
    routeShown: false,
    failedStep: null,
  };
  // Everything after the server starts is inside try/finally, so a launch failure cannot orphan it.
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: process.env["SMOKE_LIVE_HEADLESS"] === "1" });
    await waitForServer();
    const page = await browser.newPage();
    const csp: string[] = [];
    page.on("console", (message: ConsoleMessage) => {
      const text = message.text();
      if (text.includes("Content Security Policy")) csp.push(text);
    });
    page.on("request", (request: Request) => {
      const { host } = new URL(request.url());
      if (host === "places.googleapis.com") run.placesRequests += 1;
      if (host === "routes.googleapis.com") run.routesRequests += 1;
    });
    let step = "open the page";
    try {
      await page.goto(`${origin}/`);
      step =
        "wait for the place search element (is VITE_GOOGLE_MAPS_API_KEY set, and did Maps load?)";
      // Google's PlaceAutocompleteElement keeps its input in a shadow root that is probably closed
      // (Unverified), so no locator can reach the input. Drive the host element like a user instead:
      // a click focuses the inner input, then the keyboard types into it.
      const host = page.locator("gmp-place-autocomplete").first();
      await host.waitFor({ state: "attached", timeout: 30_000 });
      // Read right away, so the version prints even when a later step fails.
      const version: unknown = await page.evaluate("window.google?.maps?.version ?? null");
      run.version = typeof version === "string" ? version : null;
      step = "focus the place search element and type the query";
      await host.click();
      await page.keyboard.type(QUERY, { delay: 120 });
      // Typing never throws when the inner input was not focused. A Places request proves the keys
      // arrived; wait a bounded time for one. No retry: each attempt would bill.
      const deadline = Date.now() + 10_000;
      while (run.placesRequests === 0 && Date.now() < deadline) await page.waitForTimeout(250);
      if (run.placesRequests === 0) {
        step = "typing did not reach the widget (no Places request seen)";
        throw new Error("no places request");
      }
      await page.waitForTimeout(1500);
      step = "choose the first suggestion (ArrowDown, Enter)";
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      step = "show the nearest station";
      await page.getByText("Straight-line distance").waitFor({ timeout: 30_000 });
      run.stationShown = true;
      step = "show the walking route";
      await page.getByText(/\d+(\.\d+)? (m|km), \d+ min/u).waitFor({ timeout: 30_000 });
      run.routeShown = true;
    } catch {
      run.failedStep = step;
    }
    run.cspMessages = csp;
  } finally {
    await browser?.close();
    server.kill();
  }
  const { lines, pass } = liveReport(run);
  process.stdout.write(`${lines.join("\n")}\n`);
  return pass;
}

try {
  process.exitCode = (await main()) ? 0 : 1;
} catch {
  // Only a fixed line: the cause could carry a URL.
  process.stdout.write("FAIL\nThe live check could not run (build, server or browser setup).\n");
  process.exitCode = 1;
}
