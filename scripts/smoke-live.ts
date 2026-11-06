import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import type { ConsoleMessage, Request } from "@playwright/test";

import { liveReport } from "./smoke-live-report.ts";
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
  const browser = await chromium.launch({ headless: process.env["SMOKE_LIVE_HEADLESS"] === "1" });
  try {
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
      await page.goto(`${origin}/nearest`);
      step = "find the place search (is VITE_GOOGLE_MAPS_API_KEY set in the root .env?)";
      // Playwright locators pierce open shadow roots; whether Google's is open is part of what this proves.
      const input = page.locator("gmp-place-autocomplete input").first();
      await input.waitFor({ timeout: 30_000 });
      step = "type the query and select the first suggestion";
      await input.pressSequentially(QUERY, { delay: 120 });
      await page.waitForTimeout(1500);
      await input.press("ArrowDown");
      await input.press("Enter");
      step = "show the nearest station";
      await page.getByText("Straight-line distance").waitFor({ timeout: 30_000 });
      run.stationShown = true;
      step = "show the walking route";
      await page.getByText(/\d+(\.\d+)? (m|km), \d+ min/u).waitFor({ timeout: 30_000 });
      run.routeShown = true;
      const version: unknown = await page.evaluate("window.google?.maps?.version ?? null");
      run.version = typeof version === "string" ? version : null;
    } catch {
      run.failedStep = step;
    }
    run.cspMessages = csp;
  } finally {
    await browser.close();
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
