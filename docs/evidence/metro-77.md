# METRO-77: Vitest stage 1 (workerd API project)

Evidence for [ADR-0016](../adr/0016-test-runner.md) stage 1 (ticket 1 of its follow-ups). Labels: **Repo-verified** (run here, output quoted), **Context7-verified**, **Web-verified**, **Unverified** (not measured). Base: `origin/feature/metro-rebuild` at `536e111`.

## Versions chosen (Repo-verified, `bun pm view`, 2026-11-06 04:17 UTC)

Release cooldown (`bunfig.toml` `minimumReleaseAge`, 3 days) cut-off: 2026-11-03 04:17 UTC.

| Package                     | Pinned | Published (UTC)  | Newer, rejected                                                         |
| --------------------------- | ------ | ---------------- | ----------------------------------------------------------------------- |
| `vitest`                    | 5.1.0  | 2026-11-02 16:12 | none (5.1.0 is latest)                                                  |
| `@vitest/coverage-istanbul` | 5.1.0  | 2026-11-02 16:11 | none                                                                    |
| `@cloudflare/vitest-plugin` | 1.5.0  | 2026-11-02 15:39 | 1.5.1 (2026-11-03 11:50) and 1.6.0 (2026-11-05) are inside the cooldown |

All three are exact pins (`bun add -d --exact`), and `bun install --frozen-lockfile` passes. The spike passed on `vitest` 4.1.12 and 5.1.0 with plugin 1.5.0; 5.1.0 was chosen as the newest allowed. The plugin's peer range is `vitest ^4.1.0 || ^5.0.0` (Repo-verified in the spike). The lockfile resolves the plugin's own `wrangler` 4.156.2 and `miniflare` 5.20261102.0-beta, both on `workerd` 1.20261102.1, next to the repository's `wrangler` 4.156.0 (`workerd` 1.20261023.1 for build and preview). That is a version skew by design until Renovate moves the `cloudflare` group; `scripts/vitest-sync.test.ts` keeps it to one major.minor and to one workerd inside the plugin. Unverified: whether it matters for behaviour (the Worker tests run on the plugin's workerd, the deployed Worker on Cloudflare's).

Configuration API checked against Context7 (`/cloudflare/workers-sdk`, the plugin's fixtures) and the installed package types: `cloudflareTest({ wrangler: { configPath } })` from `@cloudflare/vitest-plugin`, `exports` from `cloudflare:workers` (the `cloudflare:test` `SELF` and `env` exports are marked deprecated in the installed types, Repo-verified). Context7-verified.

## Ubuntu precondition (Repo-verified, local WSL; NOT the hosted runner image)

Machine: WSL 2 distro "Ubuntu", Ubuntu 26.04 LTS, Linux 6.6.114.1-microsoft-standard-WSL2 x86_64, Bun 1.4.4, Node 26.13.0 (mise). The work tree was copied (tracked and new files) to `~/metro-77` on the Linux file system and committed to a scratch Git repository there. `mise install --locked` failed in WSL because the user's global mise config asks for `go@latest`, which is not in `mise.lock`; Bun and Node were already installed with the pinned versions, so only they were exercised (other tools such as gitleaks and actionlint were not run on Linux).

| Sample                                                                  | Result on WSL Ubuntu                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Web `App.test.tsx` (`bun test`)                                         | 8 pass, 0 fail                                                                 |
| API in workerd (`bun run test:vitest`, all 5 files plus the proof test) | 27 pass, 0 fail; the `navigator.userAgent` test passes; app.ts 100/100/100/100 |
| Scripts `ci-results.test.ts` and `tsc-build.test.ts` (`bun test`)       | 65 pass, 0 fail (21 s), including the new Worker-test project fixture          |

**The `workerd` postinstall did not need to run.** `bun install --frozen-lockfile` printed "Blocked 2 postinstalls"; `bun pm untrusted` lists `esbuild` 0.28.2 and `workerd` 1.20261023.1 and 1.20261102.1 (`node install.js`). The workerd tests ran on Linux with those scripts still blocked, `trustedDependencies` is unchanged (`[]`), and no install-script policy was touched. The hosted-runner result comes from PR CI (below).

## What changed

- `vitest.config.ts` (root): `projects: ["apps/api"]`, `sequence.shuffle: true`, istanbul coverage to `coverage/vitest`, per-file thresholds lines, functions and branches 90 (Context7-verified `perFile`). `vitest.shared.ts` holds `sharedTestOptions` (`sequence.shuffle: true`), spread by the root and every project config. `apps/api/vitest.config.ts` holds the project with `cloudflareTest`, reading the real `apps/api/wrangler.jsonc` with only `miniflare.assets.directory` overridden (Repo-verified in the plugin source: the override is merged into the config's assets settings), so there is no second Worker config.

### In-file shuffle (Repo-verified defect found in review)

With `sequence.shuffle` only in the root config, the `api` project printed a seed but ran the tests inside each file in source order for seeds 1, 2 and 3 (`abcdefgh` each time). Moving the option into `vitest.shared.ts` and spreading it in every config fixes it, and `scripts/configuration.ts` now fails a config that does not spread it.

- `apps/api/tsconfig.worker-test.json` is the ninth project in `tsc -b` (plugin types, generated Worker types, `ESNext.Disposable` for the plugin's `Symbol.dispose` types). `tsconfig.test.json` now excludes `apps/api/**`; `apps/api/test-env.d.ts` is removed (the Worker tests use the generated `Env`). `scripts/tsc-build.test.ts` lists nine projects and a fixture in the new one.
- The five `apps/api/src/*.test.ts` files import from `vitest`; no assertion was weakened or dropped. Two port edits: `assets-route.test.ts` builds a full `Fetcher` (the generated `Env` types `ASSETS` as workerd's `Fetcher`, which also needs `connect`), and `error-format.test.ts` reads ADR-0013 with a Vite `?raw` import because workerd has no view of the repository file system (the `existsSync` assertion became "the import resolves and is non-empty"; the text assertions are unchanged). One test is new: the real entry through `exports.default.fetch`, asserting `navigator.userAgent === "Cloudflare-Workers"`.
- `bunfig.toml` `[test] pathIgnorePatterns = ["apps/api/**"]` keeps Bun off them. `package.json`: `test:vitest` (`vitest run --coverage`), run in `check` after `bun test`.
- `.dependency-cruiser.mts` and `knip.json` accept the `cloudflare:*` runtime specifier. `vitest.config.ts` was added to `lint` and `imports:check`.
- Guards, each proven RED on an edited copy before the code existed or was fixed: `scripts/configuration.ts` (shuffle on, no `seed`, no `shuffle: false`, in any Vitest config; 5 failing tests before the change), `scripts/test-order.test.ts` (Vitest fixture: source order without shuffle, seed exposes coupling, printed seed, `--sequence.seed` reproduces), `scripts/test-hygiene.test.ts` (every `jest/*` fixture rewritten for `vitest`), `scripts/vitest-sync.test.ts` (version sync, Renovate groups, Worker test config equal to the real one; the new `vitest` Renovate group was the one RED on the real repository), `scripts/coverage-scope.ts` (reads both lcov files).

## Coverage for `apps/api` (Repo-verified, Windows and WSL Ubuntu, istanbul)

| File       | Statements | Branches | Functions | Lines |
| ---------- | ---------- | -------- | --------- | ----- |
| `app.ts`   | 100        | 100      | 100       | 100   |
| `index.ts` | 100        | 100      | 100       | 100   |

(46/46 statements, 23/23 branches, 12/12 functions, 42/42 lines.) The existing 26 tests already meet the gate, so no new coverage tests were needed. The gate fails as intended: running only `security-headers.test.ts` printed `Coverage for lines (78.57%) / functions (83.33%) / branches (39.13%) does not meet global threshold (90%) for apps/api/src/app.ts` and exited 1.

### `index.ts` (Repo-verified, cause found)

The first version, `export default createApp();`, never appeared in the istanbul table or `coverage/vitest/lcov.info`: istanbul counts no statement for a bare export-default expression, so the file had nothing to measure (a byte-identical copy with its own test was absent too). Rewriting it as `const app = createApp(); export default app;` gives it a countable statement; it now appears at 100 percent on all four metrics under the per-file gate, and the documented exemption in `scripts/coverage-scope.ts` was removed (RED first: `scripts/coverage-scope.test.ts` expected only `scaffold-status.ts` to stay exempt). The Worker entry shape is unchanged; the `exports.default.fetch` test still runs it in workerd.

## Order and seed (Repo-verified)

Every run prints `Running tests with seed "N"`; `--sequence.seed=N` reproduces the order (three-run proof in `scripts/test-order.test.ts`, using the repository's own `sequence` option in a throwaway project).

## Timing (Repo-verified locally, Windows, one run each, not statistics)

`bun run test:vitest`: 1.2 to 1.4 s of Vitest duration (about 4 s wall with `mise exec` and the coverage report). `bun test`: 1007 tests in 78 files, 84 s (the earlier baseline in the spike was 81 to 109 s for 967 tests in 81 files). Full `bun run check`: 1 m 35 s wall on this machine.

## CI `Checks` delta

To be filled from the pull request's hosted runs (see the pull request description and the reviewer record). Baseline: [CI timings](ci-timings-2026-11.md), `Checks` median 1 m 50 s, max 2 m 29 s. Not measured locally as a CI figure: the hosted runner differs from this machine, and a single PR run is not a median (ADR-0016 asks for at least 5 runs).

## Not verified

The hosted `ubuntu-24.04` result and the `Checks` delta; behaviour with the other Vitest 4.x line; Linux runs of the full `check` (only the three spike samples and the Vitest suite ran on WSL).
