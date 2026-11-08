import type { Page } from "@playwright/test";

import { isRecord } from "../scripts/guards";
import {
  describeVitals,
  evaluateVitals,
  type LayoutShift,
  type VitalsMeasurement,
} from "../scripts/vitals-lab";
import { expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * Lab web-vitals check (METRO-44 part C): the built app, served as every other journey is served, with the
 * Maps script stubbed (no Google request), must paint its largest element within 2500 ms and shift at most
 * 0.1. Chromium only (playwright.config.ts): see docs/evidence/metro-44c.md for the browsers' support.
 *
 * Collection: an init script starts two PerformanceObservers before any page script runs
 * (`largest-contentful-paint` and `layout-shift`, both `buffered: true`) and records the entries.
 * Settle: after `load`, the shell heading is visible, fonts are ready and two animation frames have run,
 * the page counts as settled once no new LCP or layout-shift entry has arrived for QUIET_MS (observed
 * entries, not a guessed sleep), capped at SETTLE_CAP_MS; hitting the cap fails the test instead of
 * measuring a page that never went quiet. No user input is sent, so no entry is excluded as input-driven.
 */
const QUIET_MS = 500;
const SETTLE_CAP_MS = 10_000;

declare global {
  interface Window {
    vitalsLab: { lcp: number[]; shifts: unknown[]; lastEntryAt: number };
  }
}

async function observe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = { lcp: [] as number[], shifts: [] as unknown[], lastEntryAt: performance.now() };
    Reflect.set(window, "vitalsLab", state);
    const watch = (type: string, onEntry: (entry: PerformanceEntry) => void) => {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) onEntry(entry);
        state.lastEntryAt = performance.now();
      }).observe({ type, buffered: true });
    };
    watch("largest-contentful-paint", (entry) => state.lcp.push(entry.startTime));
    watch("layout-shift", (entry) => {
      if (!("value" in entry && "hadRecentInput" in entry)) return;
      // Typed unknown here; `isShift` validates every recorded entry on the Node side.
      state.shifts.push({
        startTime: entry.startTime,
        value: entry.value,
        hadRecentInput: entry.hadRecentInput,
      });
    });
  });
}

/** Waits for the quiet window described above; resolves false when the cap is reached first. */
async function settle(page: Page): Promise<boolean> {
  return page.evaluate(
    async ({ quietMs, capMs }) => {
      const state = window.vitalsLab;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await document.fonts.ready;
      const start = performance.now();
      state.lastEntryAt = Math.max(state.lastEntryAt, start);
      return new Promise<boolean>((resolve) => {
        const tick = () => {
          const now = performance.now();
          if (now - state.lastEntryAt >= quietMs) resolve(true);
          else if (now - start >= capMs) resolve(false);
          else setTimeout(tick, 50);
        };
        tick();
      });
    },
    { quietMs: QUIET_MS, capMs: SETTLE_CAP_MS },
  );
}

function isShift(item: unknown): item is LayoutShift {
  return (
    isRecord(item) &&
    typeof item["startTime"] === "number" &&
    typeof item["value"] === "number" &&
    typeof item["hadRecentInput"] === "boolean"
  );
}

/** The one measurement helper, used by the real check and by both negative proofs. */
async function measure(page: Page): Promise<VitalsMeasurement> {
  expect(
    await settle(page),
    `the page stayed quiet for ${QUIET_MS} ms within ${SETTLE_CAP_MS} ms`,
  ).toBe(true);
  const raw: unknown = JSON.parse(
    await page.evaluate(() => JSON.stringify(Reflect.get(window, "vitalsLab"))),
  );
  if (!isRecord(raw) || !Array.isArray(raw["lcp"]) || !Array.isArray(raw["shifts"]))
    throw new Error("the vitals observers recorded nothing");
  const lcp = raw["lcp"].findLast((value): value is number => typeof value === "number");
  return { lcp: lcp ?? null, shifts: raw["shifts"].filter(isShift) };
}

async function load(page: Page): Promise<void> {
  await observe(page);
  await installMapsStub(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
}

function report(measurement: VitalsMeasurement): ReturnType<typeof evaluateVitals> {
  const verdict = evaluateVitals(measurement);
  const line = describeVitals(verdict);
  // Printed so the hosted log carries the numbers; annotated so the HTML report does too.
  console.log(line);
  test.info().annotations.push({ type: "web-vitals-lab", description: line });
  return verdict;
}

test.describe("lab web vitals (METRO-44 part C)", () => {
  test("METRO-44 / loads within LCP 2500 ms and CLS 0.1", async ({ page }) => {
    await load(page);
    const verdict = report(await measure(page));
    expect(verdict.problems, describeVitals(verdict)).toEqual([]);
  });

  test("METRO-44 control: a main script delayed by 3 s is reported as an LCP failure", async ({
    page,
  }) => {
    await page.route("**/assets/index-*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
    await load(page);
    const verdict = report(await measure(page));
    expect(verdict.lcp ?? 0).toBeGreaterThan(2500);
    expect(verdict.problems.some((problem) => problem.startsWith("LCP "))).toBe(true);
  });

  test("METRO-44 control: a late inserted block is reported as a CLS failure", async ({ page }) => {
    await load(page);
    expect(evaluateVitals(await measure(page)).problems).toEqual([]);
    await page.evaluate(() => {
      const block = document.createElement("div");
      // The app is a fixed full-viewport shell, so a block added to <body> would shift nothing. Put the block at
      // the top of the panel's scroll content, which moves all of the visible panel. At 2,000 px it is taller than
      // the longest viewport side (1,280 px), so the full shift distance counts and the score clears 0.1 with margin.
      block.style.height = "2000px";
      document.querySelector(".panel__body")?.prepend(block);
    });
    const verdict = report(await measure(page));
    expect(verdict.cls).toBeGreaterThan(0.1);
    expect(verdict.problems.some((problem) => problem.startsWith("CLS "))).toBe(true);
  });
});
