# Vitest spike, November 2026 (METRO-74)

Evidence for [ADR-0016](../adr/0016-test-runner.md): should unit and integration tests move from `bun test` to Vitest? Measured on this repository on 2026-11-06. Spike code is **not** in this pull request; the exact files and commands are recorded below so every number can be reproduced.

Labels: **Repo-verified** (run here, output quoted), **Context7-verified** (Context7 docs for `/vitest-dev/vitest`, `/cloudflare/workers-sdk`, Oxlint), **Web-verified** (official site fetched 2026-11-06; page text treated as data), **Unverified** (not measured; stated so the reader does not rely on it).

## Environment

| Item     | Value                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Base     | `c98f407` (`origin/feature/metro-rebuild`), branch `ticket/metro-74-vitest-spike`                                        |
| OS       | Windows 11 Pro 10.0.26300; Intel Core i5-13600K (14 cores, 20 threads); 32 GB RAM. Ubuntu and WSL were **not** measured. |
| Runtimes | Bun 1.4.4, Node 26.13.0 (via `mise exec --`), Vite 8.3.5, Oxlint 1.90.0, happy-dom 21.0.4                                |
| Spike    | `vitest` 4.1.12 and 5.1.0, `@vitest/coverage-v8` and `-istanbul` (same versions), `@cloudflare/vitest-plugin` 1.5.0      |

Versions (Repo-verified with `bun pm view` against the npm registry, 2026-11-06): `vitest` latest 5.1.0 (published 2026-11-02), the 4.x line ends at 4.1.12 (2026-10-15); `@cloudflare/vitest-plugin` latest 1.6.0 (2026-11-05), 1.5.1 (2026-11-03), 1.5.0 (2026-11-02). The plugin 1.5.0 was chosen because 1.6.0 (published 2026-11-05) was inside the repository's 3-day release cooldown (`bunfig.toml` `minimumReleaseAge`, [maintenance](../agents/maintenance.md)) and 1.5.1 (published 2026-11-03T11:50Z) was on the boundary: the spike ran about 2026-11-06 00:35 local time and the local UTC offset was not recorded, so whether 1.5.1 was just inside or just outside is not proven. All spike installs were exact pins (`bun add -d --exact`) and `bun` accepted them.

Compatibility matrix (Repo-verified from the registry, Web-verified from the Cloudflare page "Write your first test"):

- `@cloudflare/vitest-plugin` peer dependency `vitest ^4.1.0 || ^5.0.0` (Repo-verified, registry). The docs say "The `@cloudflare/vitest-plugin` package requires Vitest 4.1 or later" (Web-verified, <https://developers.cloudflare.com/workers/testing/vitest-integration/get-started/write-your-first-test/>).
- Rename (Web-verified 2026-11-06): the Cloudflare changelog <https://developers.cloudflare.com/changelog/post/2026-08-19-vitest-plugin/> says version 1 of the integration is published as `@cloudflare/vitest-plugin`, "formerly named `@cloudflare/vitest-pool-workers`", dated August 19, 2026, with the Vitest configuration API unchanged. The Vitest 3 to 4 migration guide <https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-from-vitest-3-to-vitest-4/> requires Vitest 4 (`vitest@^4.1.0`) and describes the older package name.
- "Cloudflare recommends Vitest for Workers tests" is the framing of the integration page <https://developers.cloudflare.com/workers/testing/vitest-integration/>, which documents `@cloudflare/vitest-plugin` as the way to run Vitest tests inside the Workers runtime (Web-verified; that page does not use the word "recommend", so treat the wording as the ticket's summary).
- `vitest` 5.1.0 `engines.node` `^22.12.0 || ^24.0.0 || >=26.0.0` (Node 26.13.0 satisfies it); peer `vite ^6.4.0 || ^7.0.0 || ^8.0.0` (Vite 8.3.5 satisfies it). Both are Repo-verified, and both Vitest majors ran on Vite 8.3.5 and Node 26.13.0 with no peer warning.
- The plugin pulls its own `wrangler`, `miniflare` and `workerd` (Repo-verified in `node_modules/.bun`: three miniflare, two workerd and three wrangler copies after the spike install, next to the repository's `wrangler` 4.156.0). The workerd that runs the tests is therefore not guaranteed to be the one `wrangler`/`@cloudflare/vite-plugin` ships.
- Direct dependencies added: four (`vitest`, `@cloudflare/vitest-plugin`, `@vitest/coverage-v8`, `@vitest/coverage-istanbul`). `bun add` reported "63 packages installed" for the first add (transitive included; the second add of Vitest 5.1.0 installed 13 more).
- Install scripts (Repo-verified): `bun install --frozen-lockfile` in this worktree before and after the spike packages printed "Blocked 1 postinstall"; `bun pm untrusted` lists `workerd` (`node install.js`, once per workerd version), blocked in both. `trustedDependencies` stayed `[]`, no package was trusted, and the workerd tests still ran on Windows (the platform binary comes from `@cloudflare/workerd-windows-64`, not the postinstall). Not checked: whether Ubuntu needs the postinstall. `bun install --frozen-lockfile` passed on the spike-free branch; the spike's lockfile grew by 108 lines.

## Spike setup (not committed)

A local clone of the branch in a scratch directory, branch `scratch/metro-74-spike`, with `package.json` and `bun.lock` modified by:

```text
mise exec -- bun install --frozen-lockfile
mise exec -- bun add -d --exact vitest@4.1.12 @vitest/coverage-v8@4.1.12 @vitest/coverage-istanbul@4.1.12 @cloudflare/vitest-plugin@1.5.0
mise exec -- bun add -d --exact vitest@5.1.0 @vitest/coverage-v8@5.1.0 @vitest/coverage-istanbul@5.1.0
```

Spike files (all new; the originals were copied beside them as `*.vt.test.*`, so `bun test` baselines ran on the untouched originals in this worktree):

- `vitest.config.ts`: `test.sequence.shuffle: true`, `test.projects` `scripts` (node) and `web` (`environment: "happy-dom"`), `coverage` provider `v8`, `thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 }`, explicit `coverage.include`.
- `apps/api/vitest.config.ts`: `plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.vitest.jsonc" } })]`, coverage provider `istanbul`, same thresholds. `apps/api/wrangler.vitest.jsonc` is the Worker config with `assets: { directory: "../web/public", binding: "ASSETS" }` (the real config gets its assets directory from `@cloudflare/vite-plugin`, which the test pool does not run).
- `scripts/ci-results.vt.test.ts` (sample 3a), `scripts/tsc-build.vt.test.ts` (sample 3b), `apps/web/src/App.vt.test.tsx` (sample 1), `apps/api/src/index.vt.test.ts` (sample 2) and `apps/api/src/workerd-entry.vt.test.mts` (extra workerd proof).

Port edits, complete list: add `import { expect, test } from "vitest"` (and `afterAll, afterEach, beforeAll, vi` for the web file); `Bun.spawnSync(cmd, opts)` to `spawnSync(cmd[0], cmd.slice(1), opts)` from `node:child_process` (`exitCode` is `status`); `Bun.sleep` to a `setTimeout` promise; `import.meta.dir` to `import.meta.dirname`; `jest.spyOn`/`jest.restoreAllMocks` to `vi.spyOn`/`vi.restoreAllMocks`; **delete** the `dom-test-env` import, the `enableDomGlobals`/`restoreBunGlobals` calls and the dynamic-import ordering in the web test. No assertion was changed or removed.

Commands run, from the spike directory unless noted:

```text
mise exec -- bun run vitest run --project scripts scripts/ci-results.vt.test.ts
mise exec -- bun run vitest run --project web
mise exec -- bun run vitest run                       # in apps/api
mise exec -- bun run vitest run --project scripts scripts/tsc-build.vt.test.ts
mise exec -- bun run vitest run --coverage            # root (v8) and apps/api (istanbul)
mise exec -- bun --bun run vitest run ...             # Vitest on the Bun runtime
mise exec -- bun test <file>                          # in this worktree, bunfig.toml as committed
```

## 1. The three samples run (Repo-verified)

| Sample                                                | Result under Vitest 4.1.12 and 5.1.0                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web: `App.test.tsx` in happy-dom                      | 8 of 8 pass with no `dom-test-env.ts` and no global swap.                                                                                                                                                                                                                                                                           |
| API in workerd: `index.test.ts`                       | 8 of 8 pass (7 ported plus 1 new) inside workerd through `cloudflareTest`. The new test asserts `navigator.userAgent` is exactly `Cloudflare-Workers` after calling the real entry with `exports.default.fetch`, so the code does run in workerd, not Bun or Node. Windows needed no workaround.                                    |
| Scripts: `ci-results.test.ts` and `tsc-build.test.ts` | `ci-results`: 50 of 50 pass (it spawns `node` with `spawnSync`). `tsc-build`: 14 of 14 pass after the spike's own files stopped breaking `tsc -b` (see below); it creates, links and removes directory copies and spawns `bun run tsc -b`, and its `EBUSY` retry (`removeWithRetry`) was exercised unchanged on Node `fs/promises`. |

Two traps found while porting:

1. The first `tsc-build` run failed on `tsc -b` exit 1 (Repo-verified): `apps/api/src/index.vt.test.ts(2,25): error TS2307: Cannot find module 'cloudflare:workers'`. A workerd test needs its own TypeScript project (`@cloudflare/vitest-plugin/types` plus the generated Workers types), not the Bun-typed `tsconfig.test.json`; adding the plugin's types to the Bun-typed project produced `Cannot find name 'Fetcher'` and similar errors. The existing `apps/api/test-env.d.ts` already documents the same conflict. This is a real migration cost, and `tsc-build.test.ts` is what caught it.
2. Under Node, tests that call `Bun.YAML`, `Bun.TOML`, `Bun.JSONC`, `Bun.file` or `Bun.write` cannot run. Counted with `git grep` on the base: 81 test files (`scripts` 62, `apps` 12, `packages` 7); test files use `Bun.spawnSync` 62 times, `Bun.YAML` 14, `Bun.TOML` 3, `Bun.JSON` 3, `Bun.write`, `Bun.which`, `Bun.version`, `Bun.sleep`, `Bun.file` and `Bun.JSONC` once each; 14 test files use `import.meta.dir`; 13 use `jest.*` mocks. Five non-test scripts (`configuration.ts`, `hooks-status.ts`, `mise-lock.ts`, `tool-pins.ts`, `tools.ts`) call `Bun.*` too. Vitest runs on the Bun runtime (below), which removes most of this cost.

## 2. Wall time (Repo-verified, Windows, `mise exec -- bun ...`, each cell is one run)

Every row includes `mise exec` and `bun run` start-up for both runners. "Bun, coverage on" is the committed `bunfig.toml` (coverage is on by default there); "Bun, coverage off" uses `bun --config=<scratch bunfig with only randomize = true>`. Vitest runs had coverage off unless stated.

| Sample (5 runs each)             | Bun, coverage on         | Bun, coverage off        | Vitest 4.1.12, node      | Vitest 5.1.0, node       | Vitest 5.1.0, `bun --bun`    |
| -------------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ---------------------------- |
| Web `App.test.tsx` (s)           | 0.33 0.40 0.40 0.38 0.39 | 0.38 0.38 0.39 0.40 0.38 | 1.15 1.18 1.17 1.18 1.10 | 1.01 1.05 1.03 1.05 1.04 | 0.73 0.63 0.62 0.61 (4 runs) |
| API `index.test.ts` (s)          | 0.12 0.12 0.11 0.11 0.11 | 0.12 0.13 0.11 0.11 0.12 | 3.07 1.96 1.98 2.00 1.99 | 1.72 1.70 1.68 1.70 1.67 | not timed                    |
| Scripts `ci-results.test.ts` (s) | 0.40 0.39 0.40 0.42 0.41 | 0.40 0.39 0.41 0.43 0.43 | 0.81 0.85 0.83 0.83 0.85 | 0.77 0.74 0.79 0.77 0.76 | 0.51 0.47 0.48 0.51 (4 runs) |

Precision: these are wall-clock times of single process launches on one machine, not statistics. Cells within a batch agree to about 5 to 10 percent, but a later batch of the same command ran about 50 percent slower (see cold against warm below), so read every ratio as "roughly", and read a difference under 50 percent as noise. Medians: web Bun 0.39 s against Vitest 1.17 s (4.1.12) or 1.04 s (5.1.0) or 0.62 s on Bun; API Bun 0.11 s against Vitest 1.99 s or 1.70 s (workerd start-up, with an extra first-run cost of 1.1 s on 4.1.12); `ci-results` Bun 0.40 s against Vitest 0.83 s or 0.77 s or 0.49 s on Bun. The API figure for Bun covers the in-process Hono `app.request()` test only; it proves nothing about workerd.

Subprocess-bound file, `tsc-build.test.ts` (3 runs each, Bun with coverage off): Bun 17.43 19.51 19.92 s; Vitest 4.1.12 20.77 20.75 19.64 s. Equal within run-to-run noise: the time is `tsc -b` in a spawned process.

Full suite, Bun only (the committed `bun test`, coverage on, 4 runs): 81.5, 89.3, 108.6, 90.2 s; 967 tests across 81 files pass. The spread (27 s) shows the noise floor. The suite was **not** migrated, so a full-suite Vitest time is **Unverified**; the evidence above says the long files are subprocess-bound (`tsc-build` alone is about 20 s), where both runners are equal, while small files cost Vitest roughly 0.4 to 1.9 s each more in start-up when run alone. Whether parallel workers hide that over 81 files was not measured.

Cold against warm (Vitest 4.1.12; `node_modules/.vite` and `.vitest` removed first): web 1.72 s cold, 1.71 s warm; API 2.81 s cold, 2.77 s warm. No cache effect. These runs came after a coverage batch and are about 0.5 s slower than the earlier 1.17 s and 1.99 s, so batch-to-batch drift is about 50 percent and differences under that are noise. Bun has no comparable cache; a repeated run is the same speed.

With coverage (Vitest 4.1.12; exit 1 expected because only sample files were included): root v8 27.33, 24.34, 19.20 s (includes `tsc-build`); API istanbul 2.66, 3.28, 3.53 s against 1.99 s without coverage.

The third-party claim that Bun is 2 to 3 times faster is **Unverified as a whole-suite claim** and not supported here: for single small files Bun was 2 to 18 times faster (dominated by Vitest and workerd start-up), for the subprocess-bound file it was equal, and for the full suite it was not measured.

## 3. Coverage and the per-file gate

Bun today (Repo-verified, `bun test scripts/ci-results.test.ts apps/web/src/App.test.tsx`): columns `% Funcs`, `% Lines` only; `ci-results.ts` 85.71 funcs, 80.77 lines (uncovered 42-45, 49); `error-boundary.tsx` 0.00 funcs, 29.63 lines; `status-client.ts` 100 funcs, 92.31 lines (line 16). No branch column. Source for "Bun cannot measure branches": Repo-verified lcov check recorded in [testing](../agents/testing.md) (METRO-50, Bun 1.4.4 writes no `BRF`/`BRH`/`BRDA`) and `scripts/coverage.test.ts`; that the feature is an open Bun pull request ([oven-sh/bun#46534](https://github.com/oven-sh/bun/pull/46534)) was Web-verified on 2026-11-05 by that ticket and not re-checked here, and its merge status is Unverified.

Vitest 4.1.12, provider v8, root config (Repo-verified, 3 files):

```text
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
App.tsx            |     100 |       90 |     100 |     100 | 22
...-boundary.tsx   |      10 |        0 |       0 |   11.11 | 24-40
status-client.ts   |   85.71 |    66.66 |     100 |   83.33 | 16
ci-results.ts      |      70 |    70.83 |   85.71 |   73.33 | 43-45,49
ERROR: Coverage for lines (73.33%) does not meet global threshold (90%) for scripts/ci-results.ts
```

- **Branches are measured per file**, and `App.tsx` shows the gap Bun hides: 100 percent lines and functions, 90 percent branches, with line 22 named. Vitest v8 reported lower line numbers than Bun for `ci-results.ts` (73.33 against 80.77), but the two runs used different file sets (Bun ran two test files and loaded dependencies such as `guards.ts`; Vitest ran the configured `include` only), so this is not a clean comparison of the two providers and no conclusion about provider accuracy is drawn. What the numbers do show: on the sampled files several already sit under 90 percent on branches (`status-client.ts` 66.66, `ci-results.ts` 70.83), so the new branch gate would fail today until tests are added or the owner approves and records a re-baseline (see the ADR, Consequences).
- **The gate is expressible**: `coverage.thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 }` fails with one `ERROR:` line per file and per metric, naming the file (exit 1). Context7-verified: `perFile` is `boolean | { lines, functions, branches, statements }`, and a glob pattern can carry its own `perFile` (globs do not inherit the top-level one).
- **Different file universe**: Bun measures only files a test loads. Vitest reports exactly `coverage.include` and counts an unloaded file as 0 percent: adding `scripts/bundle.ts` to `include` printed `bundle.ts | 0 | 0 | 0 | 0 | 5-27` and failed the gate (Repo-verified). The repository forbids `coveragePathIgnorePatterns`; the equivalent is an explicit `include` plus a reviewed `exclude`, which turns today's "unloaded files are unmeasured" ([testing](../agents/testing.md)) into a visible list.
- **Subprocess-run code stays invisible** in both runners: `ci-results.ts` lines 43-45 and 49 (the CLI entry exercised only by `spawnSync("node", ...)`) are uncovered in Bun and in Vitest v8.
- **Workerd needs a second coverage run.** Web-verified (Cloudflare "known issues" page, <https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/>): "Native code coverage via V8 is not supported"; use Istanbul. Repo-verified: the API project with istanbul reported `app.ts` at 78.26 percent statements, **47.82 percent branches**, 83.33 percent functions, 78.57 percent lines (uncovered 57-58, 103-109, 112-113); with `--coverage.provider=v8` Vitest also printed a report (78.26 percent branches, 66.66 percent functions) although Cloudflare's page says it is unsupported, so the v8 figures are not trusted. Vitest cannot mix providers in one run, so the Worker project is a separate invocation, and its lcov must be merged or uploaded beside the other. Only the 7 index tests were ported, so the low percentages are the sample, not the suite.
- **Cost of istanbul** (Repo-verified): the API run took 3.28 s median with coverage against 1.99 s without.
- **Unexplained** (Repo-verified observation, cause Unverified): `apps/api/src/index.ts` was in `coverage.include` but did not appear in the istanbul table (nor in the v8 one). It is one line, `export default createApp();`. I did not find out whether Vitest drops it or the plugin does, so a per-file gate on `index.ts` must not be promised until that is explained.

## 4. Randomised order with a printed seed (Repo-verified)

`test.sequence.shuffle: true` prints `Running tests with seed "1793903739219"` at the start of every run. Same seed gives the same order and a different seed a different order: three runs of the web file with `--sequence.seed=42`, `42` and `43`, test names compared without durations, gave identical order for the first two and a different one for the third. Files are shuffled too (`shuffle: { files, tests }` form exists; Context7-verified). It matches the Bun behaviour in [testing](../agents/testing.md); the seed is printed at the top rather than in the summary, and the reproduce flag is `--sequence.seed=N`. `scripts/configuration.ts` and `scripts/test-order.test.ts` look for Bun's `randomize` in `bunfig.toml` and would need to read `vitest.config.ts`.

## 5. Isolation and the happy-dom swap (Repo-verified for one file; Unverified for the suite)

The web sample passes with `environment: "happy-dom"` set per project and no `dom-test-env.ts`: Vitest gives each test file its own environment and module graph (default `isolate`), so React and Testing Library bind to the right globals and the 36 replaced Bun globals never leak into other files. This removes the `await import(...)` ordering and the `enableDomGlobals`/`restoreBunGlobals` pairs ([testing](../agents/testing.md), METRO-58). Not run: the other 11 web and app tests (`main.test.tsx` imports an entry file that runs on import) and a mixed run; the claim that the swap can be dropped everywhere is Repo-verified for `App.test.tsx` only. That per-file isolation may be part of why small files start slower than on Bun, which shares one process and module cache; this is **Unverified** (I did not profile start-up, and environment and workerd boot are other candidates).

## 6. Vite 8.3.5 and Node 26.13.0

Both Vitest majors installed against the repository's Vite 8.3.5 with no peer error and ran under Node 26.13.0 (Repo-verified). The `.tsx` sample compiled with the default Oxc transform; configuring `esbuild.jsx` on Vite 8 prints "Both esbuild and oxc options were set... esbuild options will be ignored" (Repo-verified), so do not set it. `import.meta.dirname` works on Node 26.

## 7. Vitest on the Bun runtime (Repo-verified, unplanned)

`bun --bun run vitest run ...` also worked for the scripts sample (50 of 50), the web sample (8 of 8) and the workerd project (8 of 8, `Duration 1.25s`), and was faster than Node for the first two (table in section 2: 0.49 s against 0.77 s, 0.62 s against 1.04 s). Consequence: tests can keep calling `Bun.YAML`, `Bun.TOML` and `Bun.spawnSync` and run through `bun --bun`, so the port is mostly the test API (`vi`, imports), not the runtime APIs. The scripts themselves still run under Node in `package.json` (`node scripts/format.ts`, and so on); only the test runner would choose the runtime. Note what this does and does not close: under `bun --bun` the web and scripts tests still run on Bun's runtime, so the gap "tests run on Bun, not where the code runs" is closed only for the API, which runs in workerd through the plugin (the workerd project ran in workerd under both Node and `bun --bun`). Whether `bun --bun` Vitest is stable across all 81 files and on Ubuntu CI is **Unverified**.

## 8. Lint fit (Repo-verified, Oxlint 1.90.0)

- A fixture file importing from `"vitest"` with an assertion-free test, a conditional `expect`, `test.only` and an argument-less `toThrow()` is flagged by `jest/expect-expect`, `jest/no-conditional-expect`, `jest/no-focused-tests` and `jest/require-to-throw-message`, and identically by the same four rules under the `vitest` plugin (`vitest/...`). So the `jest/*` rules in `.oxlintrc.json` keep working unchanged once files import from `vitest`: the METRO-50 blindness (rules cannot see `bun:test`) disappears with the Bun import.
- The spike's own files tripped `import/first`, `promise/param-names` and `typescript/no-unsafe-*` (on `cloudflare:workers`, missing types) because of the shim and the missing Worker test project, not because of Vitest.
- `eslint/no-restricted-imports` bans `bun:test`; after a migration the ban still stops a regression, and `scripts/test-hygiene.test.ts` fixtures need `import ... from "vitest"` (they currently rely on Bun's injected globals). Vitest's `globals` option is off by default; the safest setting is to keep it off and import explicitly, which is what the lint rules need. `oxlint --rules` printed nothing here, so the full list of `vitest/*` rules in 1.90.0 is **Unverified**; the four above are Repo-verified.

## 8a. Branch gate cost (derived from section 3)

Two of the four sampled files are already under 90 percent branches (`status-client.ts` 66.66, `ci-results.ts` 70.83) and `error-boundary.tsx` is at 0 in this partial run (the rest of its tests were not ported). Extrapolating to all 81 files is **Unverified**, but it is the expected dominant migration cost: every file under 90 percent branches needs new tests, or an owner-approved, recorded re-baseline.

## 9. Windows behaviour

No `EBUSY` failure occurred in the 3 Bun and 4 Vitest `tsc-build` runs recorded above (the Vitest failure was `tsc -b`, not `EBUSY`) (Repo-verified; the flake is intermittent, so this proves nothing about its rate). The retry helper works unchanged under Node. Workerd started on Windows without extra setup. Not measured: WSL and Ubuntu.

## 10. CI impact (estimate, Unverified)

Baseline ([CI timings](ci-timings-2026-11.md)): `Checks` median 1 m 50 s (max 2 m 29 s), `Build and smoke` 2 m 49 s, longest path to the gate about 190 s; step durations were not collected, so the share spent in `bun test` is unknown. An estimate, not a measurement: Vitest adds a few seconds of start-up per project (three projects: scripts, web, workerd plus a separate API coverage run) and about 60 packages to install (`63 packages installed` on the spike), so `Checks` would plausibly grow by roughly 5 to 20 s on the hosted ubuntu runner, and shrink if branch gating replaces any separate check. The `Cloudflare preview` and Playwright jobs are untouched. Re-measure with the first migration ticket's pull request; no workflow was changed or pushed here.

## 11. What the spike did not cover

The other 78 test files; Ubuntu or WSL; `@vitest/browser-playwright` real-browser component mode (not run: the web sample passed in happy-dom and the ticket scoped e2e out); a full-suite Vitest wall time; the repository's coverage tooling (`scripts/coverage-scope.ts`, the `coverage-lcov` CI artifact) against a merged istanbul and v8 lcov.
