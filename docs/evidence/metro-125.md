# METRO-125: intermittent test failures under load

Labels: **Repo-verified** (measured in this worktree, command and numbers given), **Unverified** (not measured). Base: `origin/feature/metro-rebuild` at `576d921`. Machine: Windows 11, 20 logical cores, Playwright 1.64.1, Chromium bundled with it. Hosted run examined: 42604600580 (push of `576d921`).

## Findings

| Symptom                                                                                                                              | Cause                                                                                                                                                                                                                                                      | Fix                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `offline-shell` "a second tab ... offered the reload": `waitForEvent("load")` timed out after Reload (Pixel 7, attempt 1)            | The web-vitals beacon (`POST /api/vitals`, sent on the first input, which is the Reload press) reaches the old worker while Chromium is stopping it for the takeover. The worker restarts; the waiting worker stays waiting. Repo-verified, below.         | `install` registers a static route: `/api/*` goes to the network with no fetch event, so no worker start (`apps/web/src/sw/worker.ts`).                   |
| `headers.e2e.ts:197` and `:212` shown as failed (`✘`) on the same run                                                                | Not failures. Both are `test.fail()` tests that prove the fixture catches an error; Playwright's list reporter prints `✘` for an expected failure and counts it as passed. The log says `1 failed, 176 passed` and the only failure is the offline test.   | None needed. No product or fixture defect.                                                                                                                |
| `NearestStation` focus assertions (METRO-120, METRO-113) fail about 1 run in 10 to 20 under load, in different tests                 | `findBy*` returns on the DOM change; Testing Library then drains with `setTimeout(0)`, while React runs passive effects (the focus move) in a Scheduler macrotask. Which runs first depends on load, so focus was still on `<body>`. Repo-verified, below. | `apps/web/vitest.setup.ts` follows every async query with an empty `act`, which flushes the pending effects. No assertion changed.                        |
| `AppRoutes.map` "the shell's map slot shows the line map": `findByRole` timed out at 1,000 ms                                        | The first `import()` of the screen loads and transforms its whole module graph: about 0.4 s alone, over 1 s on a loaded machine. The 1 s default cannot cover it.                                                                                          | The test loads the same two modules in `beforeAll` (30 s hook timeout); the `findBy` then waits only for the lazy boundary and the render.                |
| `location.e2e.ts` "every state passes axe": 15 s alone, over the 30 s test timeout when loaded                                       | Six states in one test, each reloading the page and running axe.                                                                                                                                                                                           | One test per state, theme and size (24 tests, same steps and assertions).                                                                                 |
| `smoke-live-report` and `reviewer-record` wall-clock budgets (`cleanName` 200 ms, wide tree 500 ms, 5,000 images 1 s, long body 2 s) | One timing of one run: a slow moment on a loaded machine fails an algorithm that is fine.                                                                                                                                                                  | `fastestMs` (`scripts/test-timing.ts`, own test) takes the fastest of five runs. The budgets are unchanged; a quadratic algorithm is slow in every round. |

`line-map.e2e.ts` and `station-picker.e2e.ts` axe tests were checked: one theme per test, 2.7 s and 5.6 s on the hosted run. They need no split.

## The takeover race: how the cause was found

Reproduction needed 12 Playwright workers on this machine (4 workers with 24 busy processes gave 0 of 320). Metric `M`:

```
CI=true bun run smoke -- e2e/offline-shell.e2e.ts -g "second tab" --project=chromium --project=mobile-chrome --repeat-each=100 --reporter=line --workers=12
```

Before: 33 of 200 failed (chromium 11 of 100, mobile-chrome 22 of 100; an earlier chromium-only run: 4 of 100). A diagnostic copy of the test, polling the registration for 6 s after the click and reading CDP `ServiceWorker.workerVersionUpdated` events, showed in every real failure (Repo-verified, 4 captured):

- The new worker `installed` and stayed `waiting`; `skipWaiting()` evaluated inside it never resolved (`HUNG` after 2.5 s), and a second skip-waiting message 6 s later changed nothing. Both workers answered `evaluate`, so neither was stuck in the debugger.
- Timeline (ms from the first CDP event): v1 `installed` at 1,976; click at about 5,466; `POST /api/vitals` at 5,629; v0 (the old active worker) `stopping` at 5,424, `stopped` at 5,433, `starting` at 5,433, `running` at 5,479. The old worker was stopped for the takeover and started again at once, with no request of the test's own in between.
- The hosted failure fits: its trace has the same `POST /api/vitals` right after the click, and the page never reloaded.

The beacon is not a coincidence: web-vitals reports LCP on the first input, and the Reload press is the first input of the page. Chromium's activation waits for the old worker to have no work; the restart arrives after it decided to stop it, and Playwright's attach keeps the restarted worker from being stopped by the idle timer (Unverified: the exact Chromium path; the observed states are Repo-verified).

Fix and measurement (same command `M`): 0 of 200 failed. The whole spec, `--repeat-each=10`, chromium and mobile-chrome, 12 workers: 340 passed. After the 3 s reading pause and the settle comment were removed from the spec (a sleep used as synchronisation): `--repeat-each=15`, same projects and workers: 510 passed. A new Chromium-only test (`METRO-125 ... an API request goes to the network without the worker`) pins the behaviour: a shell file is answered by the worker, `/api/other` is not (`Response.fromServiceWorker()`).

What is not covered: another request sent in the same window can still restart the worker; and whether a real Chrome without a debugger recovers when its own idle timer stops the restarted worker is Unverified (no real-browser run). Firefox and WebKit have no static routing API (Unverified for WebKit 26) and keep the pass-through; the race was never seen there.

## Vitest: focus after `findBy`

Reproduction: a copy of `NearestStation.test.tsx` whose METRO-120 cases ran 800 times, with 24 busy processes (`vitest run --coverage.enabled=false --sequence.seed=N`). Before: seeds 5 to 10 failed 1, 4, 2, 2, 2, 1 times (12 of 5,220 tests); each failure was `expected <body> to be <button>` (focus not yet moved). After the setup file: the same seeds, same load: 0 of 5,220. The real file, 30 seeds (101 to 130) under 24 busy processes: 0 failed.

`AppRoutes.map`: under 40 busy processes the test failed 8 of 8 runs before (1,027 to 1,148 ms, the 1 s limit) and 0 of 30 after.

## Scripts

Under 22 busy processes, `bun test` of the file 12 times: `smoke-live-report.test.ts` at the base failed 11 of 12 runs; after, 0 of 12. `reviewer-record.test.ts` did not fail at either revision (0 of 12), and keeps the helper for the 2 s budget. Under 40 busy processes the whole machine ran about 130 times slower than idle (a 15 ms call took about 2 s) and every version failed: that is a broken machine, not a flake, and no budget should survive it.

## Coverage

Command: `bun run check` (Bun: 100 percent lines and functions per file; Vitest istanbul: 90 percent per file for lines, functions and branches). No threshold edited, no exclusion added. Vitest totals, base against this change:

| Metric     | Base `576d921`    | This change       |
| ---------- | ----------------- | ----------------- |
| Statements | 99.71 (1378/1382) | 99.71 (1380/1384) |
| Branches   | 98.48 (779/791)   | 98.48 (779/791)   |
| Functions  | 99.44 (359/361)   | 99.44 (360/362)   |
| Lines      | 100 (1198/1198)   | 100 (1200/1200)   |

The uncovered statements, branches and functions are the same ones as at the base (none in a file this change touched except the existing `worker.ts` line 98, now 102). Bun: all files 100.00 functions and 100.00 lines, including the new `scripts/test-timing.ts`.

## Full smoke

`CI=true bun run smoke -- --shuffle` (all four projects, default workers), five runs in a row on the final tree: each 789 passed, 24 skipped, 0 failed, 5.9 to 6.7 minutes. `bun run check` and `bun run build` passed on the same tree.

## Checks not run

Hosted CI on this branch; Firefox and WebKit stress runs of the update flow (the race was seen in Chromium only); a real-device run of the takeover; a Linux run of the stress (the failure was reproduced on Windows, the hosted failure on Linux).
