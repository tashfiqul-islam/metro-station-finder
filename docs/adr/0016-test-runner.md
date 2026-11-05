# ADR-0016: Test runner for unit and integration tests

- Status: Proposed (recommendation: go, staged; awaits the owner's acceptance)
- Date: 2026-11-06
- Ticket and specification: METRO-74; measurements in [the Vitest spike](../evidence/vitest-spike-2026-11.md)

## Context

Unit, component and in-process API tests run on `bun test` ([ADR-0005](0005-test-strategy.md), [testing](../agents/testing.md)). Known gaps: Bun cannot measure branch coverage (METRO-50: lcov has `DA`, `FNF`, `FNH`, `LF`, `LH` only), so the per-file 90 percent gate in `bunfig.toml` covers lines and functions; Bun runs all files in one process, which forced the happy-dom global swap in `apps/web/src/dom-test-env.ts`; the API tests run on Bun, not on workerd, where the Worker runs ([ADR-0002](0002-runtime-topology.md)); and `jest/*` lint rules cannot see `bun:test` imports, so tests use injected globals and a ban on the import.

Cloudflare recommends Vitest through `@cloudflare/vitest-plugin` for Worker tests (Web-verified; requires Vitest 4.1 or later). The owner asked whether to move. A spike on this repository (Windows 11, Bun 1.4.4, Node 26.13.0, Vite 8.3.5) ported one web, one workerd and two scripts tests and measured the rest. Every number and its label is in the [evidence file](../evidence/vitest-spike-2026-11.md); the facts that decide this:

- Branches are measured per file and `perFile` expresses our gate: `thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 }` failed naming each file (Repo-verified). `App.tsx` is 100 percent lines and functions but 90 percent branches, the gap Bun hides.
- The workerd test ran inside workerd on Windows with no workaround (`navigator.userAgent` is `Cloudflare-Workers`); the web test passed with the happy-dom swap deleted (Repo-verified, one file).
- Vitest ran on Vite 8.3.5 and Node 26.13.0, both majors 4.1.12 and 5.1.0 with plugin 1.5.0, and also under `bun --bun` (Repo-verified).
- The `jest/*` lint rules flag weak tests in files that import `vitest`, so the METRO-50 blindness ends with the Bun import (Repo-verified, Oxlint 1.90.0).
- Randomised order prints a seed and `--sequence.seed=N` reproduces it (Repo-verified).
- Costs: Vitest is slower per file alone (web 0.39 s Bun against 1.04 to 1.17 s; API 0.11 s against 1.7 to 2.0 s; Repo-verified), the subprocess-bound `tsc-build` file is equal (about 20 s), and a full-suite Vitest time was not measured (Unverified). Workerd coverage must be istanbul in a separate run (Web-verified, observed), the workerd tests need their own TypeScript project (Repo-verified: `tsc -b` failed on `cloudflare:workers` under Bun types), and the plugin brings its own wrangler, miniflare and workerd copies (Repo-verified). The "Bun is 2 to 3 times faster" claim did not hold as a whole-suite statement and is Unverified.

## Decision

We will move unit and integration tests from `bun test` to Vitest, in stages, and keep Bun as package manager and script runtime. Order: the API project on workerd first, then the web project, then `scripts`, `packages/core` and `packages/contracts`. `bun test` stays in `check` until the last stage lands, so there is never a window where a test file runs under neither runner.

- Version: the newest Vitest the release cooldown allows at the time of each ticket, pinned exactly (the spike passed on 4.1.12 and 5.1.0; 5.1.0 was 4 days old at spike time), with `@cloudflare/vitest-plugin`, `@vitest/coverage-v8` and `@vitest/coverage-istanbul` pinned to match.
- The gate does not weaken: per-file 90 percent for lines and functions stays, and a 90 percent per-file branch threshold is added in the same stage that moves a project (METRO-50 follow-through). If a file cannot reach 90 percent branches, the test is improved; no threshold is lowered and no path is excluded without a reviewed `exclude` entry and a reason.
- Order stays randomised with a printed seed (`sequence.shuffle`), no fixed seed, no retries.
- Test files import from `vitest` (globals stay off) so the `jest/*` rules see them.
- Scripts may run Vitest on the Bun runtime (`bun --bun`) while they call `Bun.YAML`, `Bun.TOML` and `Bun.spawnSync`; ADR amendments are needed only if that proves unstable in the scripts stage.
- Playwright E2E is unchanged.

This ADR is a plan and a recommendation until the owner accepts it; tickets below are drafts and have not been created.

## Consequences

Easier: branch coverage under the same per-file gate; Worker code tested in the real runtime; no happy-dom global swap or import-order trick; lint rules see every test; a path to Vitest browser mode for components later (not evaluated).

Harder: about 60 more installed packages and a second set of wrangler, miniflare and workerd copies; two coverage runs (v8 and istanbul) whose lcov must be merged or uploaded beside each other; one more TypeScript project for the workerd tests; small tests start slower; a longer, wider-touching migration of 81 test files (62 in `scripts`, 62 `Bun.spawnSync` calls, 14 `import.meta.dir`).

Must be revisited: when the CI cost is first measured (first ticket's pull request, estimate 5 to 20 s on `Checks`, Unverified); when Bun ships branch coverage (the tripwire in `scripts/coverage.test.ts` fires; the case for the move then rests on workerd and isolation, which remain); at each Vitest or plugin major.

## Alternatives considered

1. **Stay on Bun.** Rejected as the end state, not because it is slower: it is faster for small files and equal for subprocess-bound ones. It leaves the branch gate, workerd fidelity and the DOM swap unsolved, and branch support in Bun is only an open pull request ([oven-sh/bun#46534](https://github.com/oven-sh/bun/pull/46534), Web-verified 2026-11-05). It remains the right call if the owner values speed and simplicity over those three gaps; this ADR then becomes Rejected and nothing else changes.
2. **Vitest only for `apps/api` and `apps/web`, Bun for the rest.** The first two stages of the decision are this option, and it is an acceptable resting place. It is not the target because 62 of 81 test files and all repository tooling would keep no branch gate and keep two runners, two lint stories and two order mechanisms indefinitely.
3. **`node:test`.** Rejected: it does not run in workerd, has no per-file coverage threshold of the same shape here (Unverified), and gives no gain over Vitest on the three gaps; not spiked.
4. **Vitest browser mode with Playwright for components now.** Out of scope for this decision and not run; revisit after the web stage.

## Confirmation

Today: `scripts/adr.test.ts` checks this ADR's shape. When stages land, the gates are: `vitest.config.ts` thresholds (`perFile: true`, lines, functions, branches at 90) fail the stage's `check`; `scripts/configuration.ts` and `scripts/test-order.test.ts` are re-pointed to fail when `sequence.shuffle` is off or a fixed `seed` is set; `scripts/test-hygiene.test.ts` fixtures import `vitest` and keep proving each `jest/*` rule rejects a weak test; `eslint/no-restricted-imports` keeps rejecting `bun:test`; the tripwire in `scripts/coverage.test.ts` is removed only in the final stage. Until the owner accepts, nothing enforces this decision (None, policy).

## Follow-up ticket drafts (not created in Plane)

Each ticket: keeps per-file 90 percent lines and functions, adds a 90 percent branch threshold for the project it moves, randomised order with a printed seed, no weakened assertion or threshold, exact pins within the cooldown, lint rules re-pointed. Order is dependency order; the first is blocked on the owner accepting this ADR.

1. **Vitest foundation and the workerd API project.** Scope: add `vitest`, `@cloudflare/vitest-plugin`, `@vitest/coverage-istanbul`; root `vitest.config.ts` with projects; `apps/api` project with `cloudflareTest`; a Worker test `wrangler` config (assets directory, same `compatibility_date`); a separate TypeScript project for Worker tests with `@cloudflare/vitest-plugin/types` and generated Worker types; port the 5 `apps/api/src/*.test.ts` files; add one `exports.default.fetch` test; run Vitest beside `bun test` in `check` and in CI; record the measured CI delta in the evidence. Acceptance: workerd proof test passes; branch, line and function thresholds per file for `app.ts` and `index.ts`; seed printed; `tsc -b` includes the new project and `scripts/tsc-build.test.ts` expectations updated; lcov for the API stage is uploaded as a CI artifact; the old API `bun test` files removed in the same pull request. Order: 1.
2. **Web component tests on Vitest.** Scope: `apps/web` project with `environment: "happy-dom"`; port the 7 `apps/web/src/*.test.*` files; delete `dom-test-env.ts` and `dom-test-env.test.ts`; update `tsconfig.dom-test.json` (Vitest and DOM types, no Bun types); keep `main.test.tsx` as the one entry-file exception. Acceptance: no global swap anywhere; per-file thresholds incl. branches for every web source file; run on 12 seeds as before; docs/agents/testing.md "Component test DOM" paragraph replaced. Order: 2, after 1.
3. **Scripts tests on Vitest.** Scope: port the 62 `scripts` tests; decide Node or `bun --bun` as the pool runtime by measuring (spike: both work for a sample); replace `Bun.spawnSync` with a shared helper in `scripts/test-support.ts`, `import.meta.dir` with `import.meta.dirname`, `jest.*` with `vi.*`; keep the `EBUSY` retry; define `coverage.include` and a reviewed `exclude` for the files no test loads (`bundle.ts`, `dependency-parser.ts`, `format.ts`, `secrets.ts`, `tools.ts`, `scaffold-status.ts`) so the unmeasured set is explicit. Acceptance: full-suite wall time measured against the Bun baseline (81.5 to 108.6 s on the spike machine) and recorded; branch threshold met per file or tests added; no test skipped. Order: 3, may split in halves by file group.
4. **Packages on Vitest and remove Bun test.** Scope: port `packages/core` and `packages/contracts` tests; delete `bun test` from `check`, `bunfig.toml` `[test]` coverage settings, `bun-types/test-globals` in `tsconfig.test.json`; remove the tripwire in `scripts/coverage.test.ts`; re-point `scripts/configuration.ts`, `scripts/test-order.test.ts`, `scripts/coverage-scope.ts` and docs ([testing](../agents/testing.md), [quality gates](../agents/quality-gates.md), [development](../development.md)). Acceptance: `bun run check` green with one runner; `bun:test` ban and `jest/*` rules still proven by `scripts/test-hygiene.test.ts` against `vitest` imports. Order: 4, after 2 and 3.
5. **Lint rules for Vitest.** Scope: switch the `jest/*` override to import-aware fixtures (or the `vitest` plugin with the same rule names), keep every justification comment, keep `bun:test` banned. Acceptance: each rule has a failing fixture in `scripts/test-hygiene.test.ts`. Can ship with 1 and tighten in 4.
