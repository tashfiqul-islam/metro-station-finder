# ADR-0016: Test runner for unit and integration tests

- Status: Accepted (owner accepted on 2026-11-06 the go for the API and web projects; scripts and packages are decided later by the stated criterion)
- Date: 2026-11-06
- Ticket and specification: METRO-74; measurements in [the Vitest spike](../evidence/vitest-spike-2026-11.md)

## Context

Unit, component and in-process API tests run on `bun test` ([ADR-0005](0005-test-strategy.md), [testing](../agents/testing.md)). Known gaps:

- Bun cannot measure branch coverage (METRO-50: lcov has `DA`, `FNF`, `FNH`, `LF`, `LH` only), so the per-file 90 percent gate in `bunfig.toml` covers lines and functions.
- Bun runs all files in one process, which forced the happy-dom global swap in `apps/web/src/dom-test-env.ts`.
- The API tests run on Bun, not on workerd, where the Worker runs ([ADR-0002](0002-runtime-topology.md)).
- The `jest/*` lint rules cannot see `bun:test` imports, so tests use injected globals and a ban on the import.

Cloudflare documents Vitest through `@cloudflare/vitest-plugin` for running Worker tests inside the Workers runtime (Web-verified: <https://developers.cloudflare.com/workers/testing/vitest-integration/>). The plugin requires Vitest 4.1 or later, and it replaced `@cloudflare/vitest-pool-workers` on 2026-08-19 (Web-verified: <https://developers.cloudflare.com/changelog/post/2026-08-19-vitest-plugin/>). The owner asked whether to move.

A spike on this repository (Windows 11, Bun 1.4.4, Node 26.13.0, Vite 8.3.5) ported one web, one workerd and two scripts tests and measured the rest. Every number and its label is in the [evidence file](../evidence/vitest-spike-2026-11.md). The findings that matter:

- **Branches and the per-file gate.** Branches are measured per file, and `thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 }` expressed our gate and failed naming each file (Repo-verified). `App.tsx` is 100 percent lines and functions but 90 percent branches, the gap Bun hides.
- **Workerd.** The API test ran inside workerd on Windows with no workaround; `navigator.userAgent` was `Cloudflare-Workers` (Repo-verified).
- **Web DOM.** The web test passed with the happy-dom swap deleted (Repo-verified for `App.test.tsx` only).
- **Compatibility.** Vitest 4.1.12 and 5.1.0 with plugin 1.5.0 ran on Vite 8.3.5 and Node 26.13.0, and also under `bun --bun` (Repo-verified). Under `bun --bun` the web and scripts tests still run on Bun's runtime; only the API on workerd is a real change of runtime.
- **Lint.** The `jest/*` rules flag weak tests in files that import `vitest` (Repo-verified, Oxlint 1.90.0), so the blindness to `bun:test` ends with the Bun import.
- **Order.** `sequence.shuffle` prints a seed and `--sequence.seed=N` reproduces the order (Repo-verified).
- **Speed, single files.** Vitest is slower: web 0.39 s on Bun against 1.04 to 1.17 s; API 0.11 s against 1.7 to 2.0 s (Repo-verified, roughly, with up to 50 percent drift between batches). The subprocess-bound `tsc-build` file is equal (about 20 s).
- **Speed, whole suite.** Not measured for Vitest (Unverified). Bun takes 81 to 109 s. The claim "Bun is 2 to 3 times faster" is not supported as a whole-suite statement.
- **Coverage cost.** Workerd coverage must be istanbul, in a separate run from v8 (Web-verified, and the second run was Repo-verified).
- **TypeScript cost.** The workerd tests need their own TypeScript project (Repo-verified: `tsc -b` failed on `cloudflare:workers` under Bun types).
- **Supply-chain cost.** The plugin brings its own wrangler, miniflare and workerd copies (Repo-verified), adds four direct dependencies, and its `workerd` postinstall stays blocked (`trustedDependencies` unchanged).
- **Not covered.** Ubuntu, the other 78 test files, and a full-suite run.

## Decision

We will move the API and web test projects to Vitest (stages 1 and 2 below) and keep Bun as package manager and script runtime. We will decide the `scripts` and `packages` projects (stages 3 and 4) only after the full-suite Vitest time is measured, against the criterion below. Stopping after web is a valid end state: Bun would then keep running `scripts` and `packages` under the existing gate.

`bun test` stays in `check` for every project not yet moved, so no test file runs under neither runner.

- **Versions.** The newest Vitest the release cooldown allows when each ticket starts, pinned exactly (the spike passed on 4.1.12 and 5.1.0), with the plugin and both coverage packages pinned to match.
- **Gate.** The per-file 90 percent gate for lines and functions stays. A 90 percent per-file branch threshold is added in the stage that moves a project. "No threshold is weakened" means no existing number is lowered; it does not mean the new branch gate passes today (see Consequences).
- **Order.** Randomised with a printed seed (`sequence.shuffle`), no fixed seed, no retries.
- **Imports.** Test files import from `vitest` (globals stay off) so the `jest/*` rules see them.
- **E2E.** Playwright is unchanged.

Proposed criterion for stages 3 and 4 (numbers are a proposal for the owner to confirm or change). Continue only if all hold, measured on the same machine after stage 2:

1. Full-suite wall time with Vitest (all projects, coverage on, median of 5 runs) is at most 1.25 times the Bun median measured in the same session.
2. The CI `Checks` job median over at least 5 runs, with both runners present, grows by at most 30 s from the 1 m 50 s baseline in [CI timings](../evidence/ci-timings-2026-11.md).
3. Running the `scripts` tests under Vitest with the 90 percent branch gate leaves at most 20 source files under the gate (a tractable amount of new tests). If more, the owner chooses between more tests and an explicit, recorded re-baseline.

If any fails, stop after stage 2 and record a no-go note in [testing](../agents/testing.md). The owner accepted this ADR on 2026-11-06 for the API and web projects. The criterion numbers above are still a proposal for stage 3 and the owner confirms them then. Ticket 1 landed as METRO-77 and ticket 2 as METRO-79 (both in Plane); tickets 3 and 4 below are drafts and have not been created.

## Consequences

Easier: branch coverage under the same per-file gate; Worker code tested in the real runtime; no happy-dom global swap or import-order trick; lint rules see every test.

The branch gate is the dominant cost. Adding a 90 percent per-file branch gate (and v8 line numbers, which cannot be compared cleanly with Bun's, because the spike's two coverage runs used different file sets) means many existing files need new tests, or an owner-approved, recorded re-baseline. In the spike, `status-client.ts` was at 66.66 percent branches and `ci-results.ts` at 70.83. Extrapolation to all files is Unverified, but the 62 `scripts` test files are where most of the effort will be.

Other costs:

- About 63 more installed packages (four direct), and a second set of wrangler, miniflare and workerd copies (three, two and three versions in the spike).
- Bun's lcov and the Vitest lcov are uploaded beside each other. One istanbul run covers `apps/api` and `apps/web` (decided in METRO-79, see [the evidence](../evidence/metro-79.md)), so there is no separate v8 run.
- One more TypeScript project for the workerd tests.
- Small test files start slower.
- A migration that touches 81 test files (`scripts` 62; 62 `Bun.spawnSync` calls and 14 `import.meta.dir` uses across the suite).

Must be revisited:

- when the CI cost is first measured (first ticket's pull request; the 5 to 20 s estimate is Unverified);
- when Bun ships branch coverage (the tripwire in `scripts/coverage.test.ts` fires; the case for Vitest then rests on workerd and isolation);
- at each Vitest or plugin major.

## Alternatives considered

1. **Stay on Bun.** Not chosen for the API and web projects. It is faster for small files and equal for subprocess-bound ones, but it leaves the branch gate, workerd fidelity and the DOM swap unsolved. Bun branch support is only an open pull request ([oven-sh/bun#46534](https://github.com/oven-sh/bun/pull/46534), Web-verified 2026-11-05 by METRO-50, merge status Unverified). It remains the right call for `scripts` and `packages` if the criterion above fails, and for everything if the owner values speed and simplicity over the three gaps; this ADR then becomes Rejected and nothing else changes.
2. **Vitest for every project.** This is stages 3 and 4. It is not committed to now because the full-suite time and the branch-gate effort are unmeasured.
3. **`node:test`.** Not spiked, so not rejected on evidence. Reasons it was not pursued: the plugin that runs Worker tests in workerd is a Vitest plugin, and I found no `node:test` equivalent (Unverified); any per-file branch threshold support was not checked. Reconsider if Vitest fails the criterion and the owner still wants a non-Bun runner.
4. **Vitest browser mode with Playwright for components.** Out of scope and not run; revisit after the web stage.

## Confirmation

Today: `scripts/adr.test.ts` checks this ADR's shape. Nothing else enforces the decision until a ticket lands (None, policy). When stages land, the gates are:

- the `vitest.config.ts` thresholds (`perFile: true`, lines, functions, branches at 90) fail that stage's `check`;
- `scripts/configuration.ts` and `scripts/test-order.test.ts` fail when `sequence.shuffle` is off or a fixed `seed` is set in a Vitest config (added in ticket 1, so ordering is enforced from the first Vitest file);
- `scripts/test-hygiene.test.ts` fixtures import `vitest` and prove each `jest/*` rule rejects a weak test;
- `eslint/no-restricted-imports` keeps rejecting `bun:test`;
- the tripwire in `scripts/coverage.test.ts` is removed only in the final stage, if there is one.

## Follow-up ticket drafts (tickets 1 and 2 created in Plane; 3 and 4 are not)

Common acceptance for every ticket: per-file 90 percent lines and functions kept, a 90 percent branch threshold for the project it moves, randomised order with a printed seed, no weakened assertion or lowered number, exact pins within the cooldown, and lint rules re-pointed. Order is dependency order: 1, then 2, then the go/no-go in 3, then 4. There is no separate lint ticket: lint is part of ticket 1.

1. **Vitest foundation and the workerd API project.** Created in Plane as the next implementation ticket.
   - Scope:
     - add `vitest`, `@cloudflare/vitest-plugin`, `@vitest/coverage-istanbul` (exact pins, matching versions);
     - root `vitest.config.ts` with projects, and the `apps/api` project with `cloudflareTest`;
     - a Worker test `wrangler` config (assets directory, same `compatibility_date`);
     - a separate TypeScript project for Worker tests with `@cloudflare/vitest-plugin/types` and the generated Worker types;
     - port the 5 `apps/api/src/*.test.ts` files and add one `exports.default.fetch` test;
     - run Vitest beside `bun test` in `check` and CI;
     - a version-sync check or a Renovate group that keeps `wrangler`, `vitest` and the plugin's `miniflare` and `workerd` together, because the spike resolved three wrangler, three miniflare and two workerd copies;
     - ordering enforced from the first Vitest file: `scripts/configuration.ts` and `scripts/test-order.test.ts` re-pointed to fail when a Vitest config lacks `sequence.shuffle` or sets a fixed `seed`;
     - lint: `scripts/test-hygiene.test.ts` fixtures importing `vitest` for each `jest/*` rule, so vitest-importing files are covered from day one while Bun files keep the existing fixtures.
   - Preconditions: run the three spike samples on ubuntu (the hosted runner image) and record the result, including whether the `workerd` postinstall must run there.
   - Acceptance:
     - the workerd proof test passes;
     - `app.ts` meets the per-file thresholds including branches;
     - for `index.ts`, either it appears in the coverage table and meets the thresholds, or the evidence explains why it does not and the gate is stated without it (in the spike it was absent from both tables, cause Unverified);
     - seed printed;
     - `tsc -b` includes the new project and `scripts/tsc-build.test.ts` expectations are updated;
     - lcov uploaded as a CI artifact;
     - the old API `bun test` files removed in the same pull request;
     - the CI `Checks` delta measured and recorded.
2. **Web component tests on Vitest.** Created in Plane and implemented as METRO-79 ([evidence](../evidence/metro-79.md)).
   - Scope: `apps/web` project with `environment: "happy-dom"`; port the 7 `apps/web/src/*.test.*` files; delete `dom-test-env.ts` and `dom-test-env.test.ts`; update `tsconfig.dom-test.json` (Vitest and DOM types, no Bun types); keep `main.test.tsx` as the one entry-file exception.
   - Acceptance: no global swap anywhere; per-file thresholds including branches for every web source file; run on 12 seeds as before; the "Component test DOM" paragraph in [testing](../agents/testing.md) replaced.
3. **Go or no-go on `scripts` and `packages`, then the scripts tests.** (Draft note added with METRO-82: re-measure the stage 3 go/no-go criteria against `bun test --parallel=4` on the hosted runner, which is what `check` runs now, not against serial Bun. The Bun baseline moved: locally on 20 cores serial Bun took 95.3 s and `--parallel=4` 37.4 s (about 2.5x), while on the hosted runner the change is small and within run-to-run noise (`bun test` rows 63.8, 98.6, 78.5 and 92.4 s parallel against 98.7 and 80.0 s serial), see [the METRO-82 evidence](../evidence/metro-82.md). The 1.25 times threshold and the 30 s CI growth limit are unchanged proposals for the owner to confirm.) First step is only measurement: run the `scripts` and `packages` tests under Vitest (try Node and `bun --bun` for the pool runtime), measure full-suite wall time and the files under the branch gate, and compare with the criterion in the Decision.
   - If the criterion holds: port the 62 `scripts` tests (shared `spawnSync` helper in `scripts/test-support.ts`, `import.meta.dirname`, `vi` for `jest`, keep the `EBUSY` retry); define `coverage.include` and a reviewed `exclude` for the files no test loads (`bundle.ts`, `dependency-parser.ts`, `format.ts`, `secrets.ts`, `tools.ts`, `scaffold-status.ts`); add tests for files under the branch gate or get a recorded owner re-baseline.
   - If it fails: stop. Record a no-go in [testing](../agents/testing.md) with the measured numbers. Stopping after web is a valid end state.
4. **Packages on Vitest and remove Bun test.** Only after a go in ticket 3.
   - Scope: port `packages/core` and `packages/contracts` tests; delete `bun test` from `check`, the `[test]` coverage settings in `bunfig.toml` and `bun-types/test-globals` in `tsconfig.test.json`; remove the tripwire in `scripts/coverage.test.ts`; re-point `scripts/coverage-scope.ts` and docs ([testing](../agents/testing.md), [quality gates](../agents/quality-gates.md), [development](../development.md)).
   - Acceptance: `bun run check` green with one runner; the `bun:test` ban and every `jest/*` rule still proven by `scripts/test-hygiene.test.ts`.
