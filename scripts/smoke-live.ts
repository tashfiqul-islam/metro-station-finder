import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import type { Browser, CDPSession, ConsoleMessage, Page, Request } from "@playwright/test";

// The one reviewed script-to-app import (pinned by script-imports.test.ts): copy.ts has no imports.
import { copy } from "../apps/web/src/features/nearest-station/copy.ts";
import {
  MAX_TAB_STOPS,
  addTabStop,
  ciRefusal,
  focusIsIgnored,
  focusedEntry,
  liveReport,
  snapshotEntries,
  typingReachedWidget,
  widgetNodeIds,
} from "./smoke-live-report.ts";
import type { AccessibilityRun, AxEntry, LiveRun, TabEnd } from "./smoke-live-report.ts";

/**
 * Owner-run live check (METRO-88), never run by CI or an agent: `bun run smoke:live`. It builds the web app
 * (Vite reads VITE_GOOGLE_MAPS_API_KEY from the environment or the root .env; this script never reads or
 * prints it), serves the build with the real `_headers`, opens Chromium, makes ONE autocomplete selection
 * and ONE route request against real Google, and prints only CSP console messages, request counts, the
 * Maps version, the accessibility roles and names of the search widget and PASS or FAIL (see
 * smoke-live-report.ts). The accessibility reads (METRO-100) go over a DevTools session to the page's own
 * accessibility tree: local, no network request, no extra search. Only roles and names are kept. Chromium is headed unless SMOKE_LIVE_HEADLESS=1.
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

/** A DevTools call that has not answered by now is given up on, so a hung call cannot hang the run. */
const CDP_TIMEOUT_MS = 10_000;

async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, CDP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The page's accessibility nodes, or null when there is no session, the call fails or times out, or the
 * answer has no `nodes` list (the report then says the read failed).
 */
async function readTree(cdp: CDPSession | null): Promise<unknown> {
  if (cdp === null) return null;
  try {
    const { nodes } = await bounded(cdp.send("Accessibility.getFullAXTree"));
    return Array.isArray(nodes) ? nodes : null;
  } catch {
    return null;
  }
}

/**
 * The DOM node ids of the widget element and everything below it, shadow roots included (`pierce`), or null
 * when the element is not found or the call fails or times out. The accessibility nodes carry the same ids
 * (`backendDOMNodeId`), which is how the report is limited to the widget.
 */
async function readWidgetIds(cdp: CDPSession | null): Promise<ReadonlySet<number> | null> {
  if (cdp === null) return null;
  try {
    const { root } = await bounded(cdp.send("DOM.getDocument", { depth: -1, pierce: true }));
    return widgetNodeIds(root);
  } catch {
    return null;
  }
}

/** Presses Tab from the top of the page and records the focused role and name, up to the cap. */
async function walkTab(
  page: Page,
  cdp: CDPSession | null,
  widgetIds: ReadonlySet<number> | null,
): Promise<{ order: AxEntry[]; end: TabEnd }> {
  let order: readonly AxEntry[] = [];
  for (let press = 0; press < MAX_TAB_STOPS; press += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    const tree = await readTree(cdp);
    const focused = focusedEntry(tree, widgetIds);
    const step = addTabStop(
      order,
      focused,
      tree !== null,
      focused === null && focusIsIgnored(tree),
    );
    order = step.order;
    if (step.end !== null) return { order: [...order], end: step.end };
  }
  return { order: [...order], end: "cap reached" };
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
    placesDuringTabWalk: 0,
    routesRequests: 0,
    stationShown: false,
    routeShown: false,
    failedStep: null,
    accessibility: null,
  };
  // Everything after the server starts is inside try/finally, so a launch failure cannot orphan it.
  let browser: Browser | null = null;
  let cdp: CDPSession | null = null;
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
      // Accessibility, first read: the closed shadow root hides the input from locators, but the browser's
      // own tree should include it (Unverified; the report says when it does not). Tab does not search.
      step = "read the accessibility tree";
      // From here a read was attempted, so the report prints its lines (failed reads as such).
      let reads: AccessibilityRun = {
        afterAttach: null,
        afterSuggestions: null,
        tabOrder: [],
        tabEnd: "read failed",
      };
      run.accessibility = reads;
      cdp = await bounded(page.context().newCDPSession(page)).catch(() => null);
      const attached = await readTree(cdp);
      const attachedIds = await readWidgetIds(cdp);
      const walk = await walkTab(page, cdp, attachedIds);
      reads = {
        ...reads,
        afterAttach:
          attached === null || attachedIds === null
            ? null
            : snapshotEntries(attached, attachedIds, copy.searchHint),
        tabOrder: walk.order,
        tabEnd: walk.end,
      };
      run.accessibility = reads;
      // Focus alone might send a Places request. Count what arrived so far as the baseline, so a request
      // seen during the Tab walk cannot pass for typing. This excludes only the walk: a request caused by
      // host.click() itself would still satisfy the check, and a late walk request can arrive after this
      // snapshot. The report prints the walk count so the owner can see it.
      const baseline = run.placesRequests;
      run.placesDuringTabWalk = baseline;
      step = "focus the place search element and type the query";
      await host.click();
      await page.keyboard.type(QUERY, { delay: 120 });
      // Typing never throws when the inner input was not focused. A Places request proves the keys
      // arrived; wait a bounded time for one. No retry: each attempt would bill.
      const deadline = Date.now() + 10_000;
      while (!typingReachedWidget(baseline, run.placesRequests) && Date.now() < deadline) {
        await page.waitForTimeout(250);
      }
      if (!typingReachedWidget(baseline, run.placesRequests)) {
        step = "typing did not reach the widget (no Places request seen)";
        throw new Error("no places request");
      }
      await page.waitForTimeout(1500);
      // Second read, with the suggestions showing.
      const suggested = await readTree(cdp);
      const suggestedIds = await readWidgetIds(cdp);
      reads = {
        ...reads,
        afterSuggestions:
          suggested === null || suggestedIds === null
            ? null
            : snapshotEntries(suggested, suggestedIds, copy.searchHint),
      };
      run.accessibility = reads;
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
    if (cdp !== null) await bounded(cdp.detach()).catch(() => null);
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
