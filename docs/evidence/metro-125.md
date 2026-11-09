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

Fix and measurement (same command `M`): 0 of 200 failed. The whole spec, `--repeat-each=10`, chromium and mobile-chrome, 12 workers: 340 passed. After the 3 s reading pause and the settle comment were removed from the spec (a sleep used as synchronisation): `--repeat-each=15`, same projects and workers: 510 passed. A Chromium-only test (`METRO-125 in Chromium an API request leaves a stopped worker stopped, and a shell file starts it`) pins the behaviour. It stops the worker with CDP `ServiceWorker.stopWorker`, sends `POST /api/vitals` and `GET /api/other` from the page, and reads the worker's running status from `ServiceWorker.workerVersionUpdated`: it must still be `stopped` once both are answered; a shell file fetch is the control and must start it (`running`). An earlier version of this test used `Response.fromServiceWorker()`, which is false for `/api/*` even without the route (the worker never answers it), so it could not fail; the review caught that. Proof for the current test (`-g METRO-125 --project=chromium --project=mobile-chrome --repeat-each=20 --workers=6`): with the `routeApiToNetwork` call temporarily removed, 40 of 40 failed (`Expected: "stopped"`, `Received: "running"`); restored, 40 of 40 passed.

Transitional case: static routes are registered by the worker version being installed, so the update that first delivers this fix still runs the old worker, without routes, during its takeover. A person who presses Reload on that one update with the beacon in flight can still meet the race: the page shows the fixed failure words after 5 s, stays usable, and the next visit applies the update. A cheap mitigation in `register.ts` (for example, Reload first waiting for the beacon's chunk to report, or retrying the takeover) was not built; it needs an owner decision, since it changes what the Reload press does. The rule `/api/*` does not match `/api` itself; no such endpoint exists today.

What is not covered: another request sent in the same window can still restart the worker; and whether a real Chrome without a debugger recovers when its own idle timer stops the restarted worker is Unverified (no real-browser run). Firefox and WebKit have no static routing API (Unverified for WebKit 26) and keep the pass-through; the race was never seen there.

## Vitest: focus after `findBy`

Reproduction: a copy of `NearestStation.test.tsx` whose METRO-120 cases ran 800 times, with 24 busy processes (`vitest run --coverage.enabled=false --sequence.seed=N`). Before: seeds 5 to 10 failed 1, 4, 2, 2, 2, 1 times (12 of 5,220 tests); each failure was `expected <body> to be <button>` (focus not yet moved). After the setup file: the same seeds, same load: 0 of 5,220. The real file, 30 seeds (101 to 130) under 24 busy processes: 0 failed.

`AppRoutes.map`: under 40 busy processes the test failed 8 of 8 runs before (1,027 to 1,148 ms, the 1 s limit) and 0 of 30 after.

The same cold `import()` made two more tests fail: `AppRoutes.test.tsx` (METRO-93, `findByRole` at about 1,049 ms) and `main.test.tsx` (METRO-58, `vi.waitFor`, 1 s default). Both now load the screen's two modules in `beforeAll` (30 s hook timeout); `main.test.tsx` calls `vi.resetModules()` in the test, which keeps the transform cache the warm-up filled. The METRO-93 pending status is still seen first (checked: the test passes with its assertions unchanged). Under 40 busy processes, 16 runs each (`vitest run --coverage.enabled=false --sequence.seed=N <file>`): `AppRoutes.test.tsx` failed 10 of 16 before, 0 of 16 after; `main.test.tsx` failed 11 of 16 before, 0 of 16 after. Other `apps/web` tests with a lazy chunk were checked: only these four files (`AppRoutes`, `AppRoutes.map`, `AppRoutes.failure`, `main`) render the real lazy boundary; `AppRoutes.failure.test.tsx` mocks the screen to reject at once (the other import cannot delay a rejection) and `lazy-feature.test.tsx` uses fake loaders, so neither waits on a cold graph.

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

## Machine load seen during the final smoke runs

Another agent's `bun run check` shared this machine with five default-worker (10) smoke runs on the tree before the last Vitest edits: three of the five failed once or more, each in a different test (the lab LCP at 2,620 ms against 2,500 ms; a Firefox heading not visible within 5 s; three tests in Firefox and mobile-chrome), and the five runs before that, on a quiet machine, all passed. Load-driven, not caused by this change (none involves the worker, the beacon, the split axe tests or the Vitest setup), but it shows that the lab LCP test measures while nine other browsers run: isolating it (its own Playwright project after the others) would change `playwright.config.ts` and the workflow's `--project` policy and needs an owner decision; not done here.

## Review follow-ups

- `location.e2e.ts`: `open()` waits for `locate(page)` to be visible, so the per-state reload and its visibility check the split removed are covered by the fresh page. The diff of the base against this change (`git diff -w`) shows the 24 test bodies keep every step and assertion; only the loop, the title and the reload moved. The split raises the page-open count: six opens per theme and size instead of one open and five reloads, about the same number of page loads, with more context set-ups.
- `AppRoutes.map.test.tsx`: the two `beforeAll` imports (`./features/nearby/Nearby`, `./adapters/maps`) are the exact dynamic imports of the lazy boundary in `AppRoutes.tsx`.
- One pre-push attempt failed on a single `net::ERR_NO_BUFFER_SPACE` console error in a split axe test (Windows socket buffers under the hook's parallel load). It did not recur in five smoke runs or the next attempt. Cause Unverified.

## Re-verification by the second implementer

Re-proof of the Chromium API test on the tree at `8c9834f`: with the `routeApiToNetwork` call replaced by `Promise.resolve()`, `-g METRO-125 --project=chromium --project=mobile-chrome --repeat-each=10 --workers=6` failed 20 of 20; restored (`git diff` clean), 20 of 20 passed. The race metric `M` on the same tree: 200 passed.

Five shuffled four-project runs on `8c9834f`: one passed (789 passed, 24 skipped); the other four each failed one test, each a different one, none touching the worker, the beacon or the Vitest setup. Causes: `web-vitals-lab` LCP over budget while nine other browsers ran; two axe `color-contrast` failures of 1.48 on a `.notice` in Firefox (axe read the text mid-way through the notice's 280 ms rise); a Firefox `downloadable font ... NS_BINDING_ABORTED` console error; a `heading not found within 5 s` with `net::ERR_NO_BUFFER_SPACE` (a Windows socket-buffer error, the same one noted below). Fixed here: the shared guard in `e2e/fixtures.ts` now waits for finite animations to finish (`animationsSettled`) before axe runs; no rule, tag or threshold changed. The font abort, the buffer error and the LCP measurement are load effects of this Windows machine and are Unverified as to cause; nothing was weakened for them.

### Follow-up review fixes and the runs after them

- `axeBuilder(page).analyze()` itself now waits (`animationsSettled` in `e2e/fixtures.ts`), so the guard and every direct call site (about 20) are covered with no call site or axe configuration changed. The wait polls on animation frames until no finite animation is running or pending, ignores paused and infinite ones, and is bounded (5 s, Playwright's timeout error, never a hang). Three tests in `accessibility.e2e.ts` prove it: a running finite fade is awaited (without the wait, 10 of 10 runs on Chromium and Firefox failed on `color-contrast`; with it, 0 of 10), and a paused finite animation and an infinite one do not hang it.
- The API test now does a CDP round trip (`ServiceWorker.enable` again, which reports every version's status) before it reads the status, and asserts exactly one version. It still passes 20 of 20 with the route, and fails 20 of 20 (`Received: "running"`) with `routeApiToNetwork` replaced by `Promise.resolve()`. The `POST /api/vitals` with `{}` raises no console error (the guard passed 20 of 20); the skip reason string is unchanged.
- Firefox logged `downloadable font: download failed ... NS_BINDING_ABORTED` when `place-search` axe tests reloaded the page with a font still loading. They now wait for `document.fonts.ready` first. Stress (`-g "pass axe" --project=firefox --repeat-each=30 --workers=12`): the font error appeared once in 120 runs before and 0 in 120 after. That stress also shows `Nearest Metro station` heading not visible within 5 s on Firefox at 12 workers (1 of 120 before, 3 of 120 after): cold-load starvation of the machine, not changed here; Unverified cause.
- ADR-0024: a repeated sentence in the takeover bullet was removed. The "Other tabs" bullet's opening fragment and the repeated "Playwright route stubs" bullet are in the base at `576d921`, not in this PR's diff, and were left alone.
- Five shuffled four-project runs on `cc9994c` (before the follow-ups): 789 passed, 24 skipped, 0 failed, each (5.8 to 6.0 min).

`animationsSettled` uses `document.getAnimations()`, which covers the main document only, not iframes; no e2e spec uses iframes today.

Runs on the final tree: five consecutive clean runs were NOT reached. Of the runs after `cc9994c`, one failed on the Firefox font abort (fixed above), one on a Firefox process crash (`RenderCompositorSWGL failed mapping default framebuffer`, `page.evaluate: Target page, context or browser has been closed`; not a test or product defect, cause Unverified), and one on the lab LCP budget (2,600 ms against 2,500 ms with nine other browsers running). The lab LCP test measures while the whole suite runs; running it alone after the others needs a Playwright project/dependency change that is the owner's decision (see above). No budget was changed.

## Checks not run

Hosted CI on this branch; Firefox and WebKit stress runs of the update flow (the race was seen in Chromium only); a real-device run of the takeover; a Linux run of the stress (the failure was reproduced on Windows, the hosted failure on Linux).
