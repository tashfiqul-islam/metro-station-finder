# METRO-79: Vitest stage 2 (web component tests)

Evidence for [ADR-0016](../adr/0016-test-runner.md) stage 2 (ticket 2 of its follow-ups). Labels: **Repo-verified** (run here, output quoted), **Context7-verified**, **Web-verified**, **Unverified** (not measured). Base: `origin/feature/metro-rebuild` at `472a3a8`. Machine: Windows 11, Bun 1.4.4, Node 26.13.0, Vitest 5.1.0, Vite 8.3.5, happy-dom 21.0.4.

## What changed

- `apps/web/vitest.config.ts` is a project (`name: "web"`, `environment: "happy-dom"`, `include: ["src/**/*.test.{ts,tsx}"]`) that spreads `sharedTestOptions`. The root `vitest.config.ts` lists it in `projects` and adds `apps/web/src/**/*.{ts,tsx}` to `coverage.include` (test files excluded for both apps).
- `happy-dom` 21.0.4 is a direct exact devDependency (Vitest resolves the environment package from the project root; with the isolated linker it was not reachable as a transitive of the registrator). `@happy-dom/global-registrator` (same version) is removed. No other dependency changed, `trustedDependencies` is unchanged.
- The seven `apps/web/src/*.test.*` files import from `vitest` (`vi` for `jest`). `dom-test-env.ts` and `dom-test-env.test.ts` are deleted: no global swap exists anywhere. `main.test.tsx` stays as the one entry-file exception. No assertion was dropped or weakened.
- `bunfig.toml` `pathIgnorePatterns` is now `["apps/api/**", "apps/web/**"]`; `scripts/configuration.test.ts` fails if a root Vitest project directory is not ignored by Bun.
- `tsconfig.dom-test.json`: types `node`, `react`, `react-dom` (no Bun types, no `bun-types/test-globals`), includes `apps/web/src/**/*.test.ts(x)`. `tsconfig.test.json` now also excludes `apps/web/**` (it used to type the three web `*.test.ts` files with Bun types). `scripts/tsconfig.json` includes `apps/web/vitest.config.ts`. `tsc -b` is green and still builds nine projects; `scripts/tsconfig-projects.test.ts` and `scripts/tsc-build.test.ts` pass unchanged in shape (the fixture for the DOM-test project is still `apps/web/src/zz-fixture.test.tsx`).
- Port edits that were needed (all behaviour-preserving): `headers.test.ts` reads `public/_headers` with `join(import.meta.dirname, ...)` because happy-dom's `URL` rejects `file:` URLs ("The URL must be of scheme file", Repo-verified on the first run); `error-boundary.test.tsx` types its spy as `MockInstance<typeof console.error>`; `main.test.tsx` resets modules and imports `ErrorBoundary` dynamically after the reset so its `render` spy is on the instance `main.tsx` uses.

## In-file shuffle for the web project (Repo-verified)

A temporary probe (`apps/web/src/zz-probe.test.ts`: eight tests `a` to `h` push their name into an array, `afterAll` throws it) run with `vitest run --project web src/zz-probe --sequence.seed=N`, then deleted:

```
seed 1: Running tests with seed "1"   Error: ORDER ahcdebgf
seed 2: Running tests with seed "2"   Error: ORDER agcedfbh
seed 3: Running tests with seed "3"   Error: ORDER cahdfegb
```

Three seeds, three different orders inside one file. Negative control: with the `...sharedTestOptions` line removed from `apps/web/vitest.config.ts` (and the root still shuffling), seed 1 gave `ORDER abcdefgh`, source order, which is the METRO-77 defect. The config line was restored and the probe removed (`git status` shows neither).

## Guards, RED first (Repo-verified)

- `scripts/configuration.test.ts` fixtures now copy `apps/web/vitest.config.ts` and loop the "no seed / no `shuffle: false`" and "must spread `sharedTestOptions`" rejections over it. Before the config existed 45 of 52 tests in the file failed with `ENOENT ... apps\web\vitest.config.ts`; after it, 53 pass (one new test: Bun ignores every root Vitest project directory). `validateVitestConfigs` already discovers every `apps/*/vitest.config.ts`, so no production code change was needed; the fixtures are what prove the web config is held to the rule.
- `scripts/types.test.ts`: the DOM-test project compiles DOM plus Vitest imports, and rejects `Bun` (TS2304 or TS2868, depending on the compiler's wording).
- `scripts/test-hygiene.test.ts`: the Vitest fixtures for every `jest/*` rule and the `bun:test` ban are unchanged and green; a new test reads the real web test files and fails if one does not import from `"vitest"` or uses `jest.` or `bun:test`.

## Coverage provider decision: istanbul for everything, one run, one lcov

Options: (A) one `vitest run --coverage` with istanbul for both projects and one `coverage/vitest/lcov.info`; (B) V8 for web and istanbul for API, two runs, two Vitest lcov files (workerd cannot do V8; Vitest cannot mix providers in one run, Web-verified in the Vitest coverage guide and Cloudflare known-issues, Context7-verified `/vitest-dev/vitest`). Chosen: A.

Measured (Repo-verified, 5 runs each, wall seconds including `mise exec` and `bunx` start-up):

| Run                                    | Wall s (5 runs)              |
| -------------------------------------- | ---------------------------- |
| A: istanbul, API and web in one run    | 2.29, 2.17, 2.03, 2.09, 2.12 |
| istanbul, API only                     | 2.02, 2.07, 2.00, 1.88, 2.05 |
| istanbul, web only                     | 1.45, 1.42, 1.37, 1.26, 1.28 |
| V8, web only (scratch copy, see below) | 1.10, 1.13, 1.15, 1.09, 1.16 |
| istanbul, web only (same scratch copy) | 1.18, 1.01, 1.06, 1.04, 1.06 |
| web, no coverage (same scratch copy)   | 1.03, 1.03, 1.05, 1.03, 1.06 |

Option B would cost a V8 web run (about 1.1 s) plus the API run (about 2.0 s), so about 3.1 s against about 2.1 s for A, and V8 was not faster than istanbul for this project (1.12 against 1.06 s, within noise of 1.03 s with no coverage). Correctness: the per-file branch counts are identical. Both providers give `App.tsx` 10/10, `error-boundary.tsx` 2/2, `main.tsx` 2/2, `report-error.ts` 5/5, `status-client.ts` 9/9 (28 of 28 branches, 100 percent lines and functions) on the final tests. The extra cost of B is a second provider package (`@vitest/coverage-v8`, pinned to match `vitest`), a second lcov file, a changed `LCOV_FILES`, `package.json` script and `quality.yml` artifact list, and a per-file gate configured twice. A keeps `scripts/coverage-scope.ts` (`LCOV_FILES`), the `test:vitest` script and the `coverage-lcov` artifact exactly as they were: Bun's file plus `coverage/vitest/lcov.info`.

Caveat found while measuring: V8 coverage reported zero files when run inside this worktree (path contains a `.claude` directory) and worked in a copy under another directory, so the V8 numbers above come from a scratch copy of `apps/web`, `packages/contracts` and the two configs outside the repository (Repo-verified; cause not investigated, Unverified). The temporary `@vitest/coverage-v8` install was reverted; `package.json` and `bun.lock` carry only the happy-dom swap.

## Per-file coverage, final (Repo-verified, `coverage/vitest/lcov.info`, istanbul, gate 90 for all three)

| File                              | Lines | Functions   | Branches    |
| --------------------------------- | ----- | ----------- | ----------- |
| `apps/api/src/app.ts`             | 100   | 100         | 100 (23/23) |
| `apps/api/src/index.ts`           | 100   | no function | no branch   |
| `apps/web/src/App.tsx`            | 100   | 100         | 100 (10/10) |
| `apps/web/src/error-boundary.tsx` | 100   | 100         | 100 (2/2)   |
| `apps/web/src/main.tsx`           | 100   | no function | 100 (2/2)   |
| `apps/web/src/report-error.ts`    | 100   | 100         | 100 (5/5)   |
| `apps/web/src/status-client.ts`   | 100   | 100         | 100 (9/9)   |

Totals: 89/89 statements, 51/51 branches, 25/25 functions, 78/78 lines. `index.ts` and `main.tsx` have no function records (a bare module body), which istanbul reports as 100 percent; the gate passes. No threshold was lowered, no ignore pattern or exemption was added; `scripts/coverage-scope.ts` needed no change and every web source file appears in the lcov.

### Branch gaps found by the gate and the tests written

On the straight port the gate failed: `main.tsx` 50 percent branches, `status-client.ts` 77.77, `App.tsx` 90 (exactly at the line but with an uncovered branch). Bun could not see any of this (no branch records). New tests (each targets one reported branch; mutation results are in the next section):

1. `main.tsx` fails loudly when the page has no `#root` element (the `throw new Error("Missing application root")` branch).
2. `status-client`: a response without a `content-type` header rejects as "Status response is not JSON" (the `?? ""` branch).
3. `status-client`: the client uses the global `fetch` when none is passed (the default-parameter branch).
4. `App`: unmounting before a failure arrives updates nothing and throws nothing (the `aborted` guard in the `catch`).

Test counts: the web project runs 38 tests (33 ported plus 5 new ones: the four above and the StrictMode test below); on Bun it had 35 (33 plus the 2 deleted `dom-test-env` tests). The API project is unchanged at 28, so Vitest runs 66 tests in 11 files.

### Mutation checks (Repo-verified, review follow-up)

Each source line was altered in turn, `vitest run --project web` run, and the source restored (the three source files show no diff afterwards). Output, trimmed:

```
=== M1 main.tsx: remove the missing-root throw
x METRO-79 main.tsx fails loudly when the page has no #root element
Tests  1 failed | 37 passed (38)
=== M2 status-client.ts: content-type fallback "" -> "application/json"
x FND-R4 a response without a content-type header rejects as not JSON
Tests  1 failed | 37 passed (38)
=== M3 status-client.ts: drop the default fetcher (default replaced by a rejecting stub)
x FND-R4 the client uses the global fetch when none is passed
Tests  1 failed | 37 passed (38)
=== M4 App.tsx: drop the aborted guard in the catch
x METRO-79 a failure from an aborted request cannot replace the state of the current one
Tests  1 failed | 37 passed (38)
```

M4 is the review finding. The first test written for the `aborted` guard ("unmounting before a failure arrives updates nothing") passed with the guard removed, because React 19 ignores a state update on an unmounted component and logs nothing: it is coverage-only, and its comment now says so (it is kept, not weakened). The guard itself is not dead code: under `StrictMode` the effect runs, is cleaned up (aborted) and runs again, so an aborted first request can settle while the second is pending and, without the guard, overwrite the state of the mounted component. The new test renders `App` in `StrictMode`, rejects the first (aborted) request's promise and asserts there is still no alert and the loading status shows; it is the only test that fails under M4. The success-side guard (`aborted` before the success `setState`) was not mutated here, so whether it is observable the same way is Unverified.

### Twelve seeds (Repo-verified, the ADR-0016 acceptance line)

`vitest run --project web --sequence.seed=N`, 38 tests each: seeds 11, 22, 33, 44, 55, 66, 77, 88, 99, 101, 202 and 303 all passed (`38 passed (38)` every time).

### Committed guard for in-file shuffle

`scripts/test-order.test.ts`, "METRO-79 the real web project config shuffles tests inside a file and reproduces by seed", merges the real `apps/web/vitest.config.ts` (through `mergeConfig`, overriding only `root` and `include`) with a throwaway order-coupled fixture under `.local/`, finds a seed that exposes the coupling, and checks the printed seed, a non-source order and reproduction by seed. RED check (Repo-verified): with `...sharedTestOptions` removed from the web config the test failed with "No seed in 1..50 exposed the coupling" (about 28 s, the full seed search); with it the test passes in a few seconds. The config was restored.

## Timings of `bun run check`, command by command (Repo-verified, Windows, one run, wall seconds)

Method: each command of the `check` chain run on its own with `mise exec -- bun ...`, timed with `Measure-Command` (Repo-verified, Windows, final tree, one run, all exit 0).

| Command                 | Seconds |
| ----------------------- | ------- |
| `scripts/tools.ts`      | 0.2     |
| `format:check`          | 0.4     |
| `lint`                  | 0.8     |
| `scripts/boundaries.ts` | 0.4     |
| `imports:check`         | 0.7     |
| `unused` (knip)         | 1.7     |
| `links:check`           | 0.2     |
| `branches:check`        | 0.2     |
| `types:check`           | 0.7     |
| `lint:workflows`        | 0.4     |
| `renovate:check`        | 0.6     |
| `bun test`              | 87.7    |
| `test:vitest`           | 2.1     |
| `coverage:scope`        | 0.2     |
| `typecheck` (`tsc -b`)  | 1.5     |
| Sum                     | 97.8    |

`bun test` is 90 percent of the chain (975 tests in 71 files, 86.65 s by its own clock; a first run of the same command on the earlier tree took 86.7 s). Its slowest files by JUnit time are all subprocess-bound script tests: `tsc-build.test.ts` 20.1 s, `layering.test.ts` 15.0 s, `gates.test.ts` 8.1 s, `git-isolation.test.ts` 7.8 s, `types.test.ts` 7.4 s, `hooks.test.ts` 6.7 s, `secrets-index.test.ts` 6.2 s, `commit-message.test.ts` 5.2 s. Vitest, both projects with istanbul, costs 2.1 s of the chain, and adding web to the API run adds about 0.1 s (2.0 s API only against 2.1 s for both, table above). So locally the Vitest stages are about 2 s of a 98 s check. The hosted `Checks` growth seen in [METRO-77](metro-77.md) (+66 to +69 s) is **not explained**: `bun test` lost the web files in that change and `Checks` still grew, so attributing it to the Bun script tests would be a guess. Unverified. What would verify it: per-step timing printed by CI around each command of `check`, compared over at least five runs. The workflow is not changed in this ticket. The hosted `Checks` run of PR #80 took 2 m 44 s, one run, not a median.

## Superseded text elsewhere

[ADR-0005](../adr/0005-test-strategy.md) (accepted, not edited) still says components are tested under Bun with `@happy-dom/global-registrator`; that sentence is superseded by ADR-0016 stage 2 and this ticket. Its "DOM and Bun types" wording for `tsconfig.dom-test.json` is likewise superseded: the project now has DOM, Node and React types and no Bun types.

## Not verified

Ubuntu (WSL) for the web project (the hosted Ubuntu `Checks` job passed); a `Checks` median (one hosted run per PR); the cause of V8 returning no files inside a `.claude` path; behaviour with the other Vitest 4.x line.
