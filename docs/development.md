# Local workspace

**Confirmed / Repo-verified:** this independent rebuild contains a React/Vite web app, a Hono Cloudflare Worker, a dependency-free core package and a schema-validated contracts package. The Worker serves `{ kind: 'synthetic-scaffold', ready: true }` at `GET /api/scaffold/status` and the page fetches and validates it. This demonstrates wiring only; it is not product health, data correctness or Metro feature parity.

## Bootstrap and commands

Prerequisites: mise, PowerShell 7 for preparation checks, and an OS supported by the pinned Node/Bun and Wrangler local runtime. Windows execution was checked; other platforms were not exercised. No Cloudflare login, account, database, container or secrets are needed locally.

Review `mise.toml`, then trust it through your mise installation if prompted. Use explicit tool versions so unrelated globally configured tools are not installed:

```powershell
mise install bun@1.4.4 node@26.13.0
mise exec bun@1.4.4 node@26.13.0 -- bun run bootstrap
mise exec bun@1.4.4 node@26.13.0 -- bun run check
mise exec bun@1.4.4 node@26.13.0 -- bun run build
mise exec bun@1.4.4 node@26.13.0 -- bun run dev
```

`bootstrap` verifies exact runtimes and installs the committed single `bun.lock` with `--frozen-lockfile`; dependency drift fails. `check` runs, in order: runtime pins; Oxfmt format check; type-aware Oxlint (see below); the core import guard; the dependency-cruiser layering gate; Knip; the Markdown link gate; the Worker binding type freshness check; the workflow lint (actionlint and zizmor); the Renovate configuration validator; the Bun test suite with the per-file 90% coverage threshold; the coverage scope gate; and every strict TypeScript project (web, DOM tests, API, contracts, scripts, E2E, test tooling, core). See [METRO-12 evidence](evidence/metro-12.md) for canonical commands and budgets. `build` runs `vite build` (client assets in `apps/web/dist/client`, Worker bundle in `apps/web/dist/metro_scaffold`) and then dry-runs Wrangler against that generated configuration into `apps/api/dist`; it uploads/deploys nothing. `dev` runs Vite with `@cloudflare/vite-plugin`: the SPA and the Worker API share one origin, `http://127.0.0.1:5173`, with the Worker running in workerd and React Fast Refresh. Ctrl+C stops it. The port must be free (`strictPort` makes an occupied port fail visibly). `GET /api/scaffold/status` returns the status; unknown `/api/*` returns 404 with `{ error: { code, message } }`; other unknown paths serve the SPA. See [ADR-0002](adr/0002-runtime-topology.md) and [ADR-0003](adr/0003-contracts.md).

For the Playwright Test E2E smoke after build (Chromium locally; with `CI=true` it also runs Firefox, WebKit and a mobile viewport, which need `bun run playwright install firefox webkit`):

```powershell
mise exec bun@1.4.4 node@26.13.0 -- bun run playwright install chromium
mise exec bun@1.4.4 node@26.13.0 -- bun run smoke
```

Smoke runs `playwright test` (`@playwright/test`, config in `playwright.config.ts`, specs in `e2e/`) against the built app served by `vite preview` on 4173 (web and Worker together in workerd). It checks real HTTP status and schema-valid bodies for the status route, the 404 and 405 envelopes and a deep link, renders the success state, injects a 500 to prove the `role="alert"` error state, and fails any test on a console or page error or an axe accessibility violation. No retries. Failures keep a trace, a screenshot and an HTML report (`playwright-report/`). The dry-run verifies the production Worker bundle. Playwright browser downloads are environment tooling, not part of `bootstrap`.

On this managed Windows runner, per-call temporary/profile directories changed. Native package install needed a permitted execution context and stable paths. This environment-specific setup was used; ordinary machines need not override these:

```powershell
$env:MISE_DATA_DIR = Join-Path (Get-Location) '.local/mise'
$env:BUN_TMPDIR = Join-Path (Get-Location) '.local/tmp'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.local/browsers'
```

`.local`, dependencies, bundle outputs and Wrangler state are ignored. Use the same absolute paths when checking an exported copy, so the copy gets its own dependencies while reusing installed runtimes/browser binaries.

## Boundaries and choices

- `packages/core/src/domain`: synthetic contract; `src/application`: executable shared result. No dependencies, provider globals, apps or adapters. Its separate `types: []`, ES-only typecheck runs without browser/Bun/Node globals.
- `packages/contracts`: Valibot (Standard Schema v1) schemas and parsers for the status and the error envelope; it imports only core and Valibot. `apps/web`: React DOM composition and a typed fetch client; `apps/api`: Hono composition with Worker default export and the Worker configuration. Apps depend inward on contracts and core, never on each other; dependency-cruiser enforces these layers (see [architecture](agents/architecture.md)).
- `apps/api/worker-configuration.d.ts` is generated by `bun run --cwd apps/api types` (`wrangler types`, without runtime types); `bun run types:check` fails when it is stale.
- Root owns build/test tooling. App manifests own runtime dependencies. Exact direct versions plus the single Bun lock pin the resolved graph; there is no workspace orchestrator.
- `scripts/boundaries.ts` parses core source imports, exports, import types, dynamic imports and require calls. It rejects non-relative/computed/escaping references, symlinks and declared dependencies. Test files may import Bun. This narrow smoke guard is not a security sandbox or full architecture policy; the import-graph and CI gates are described in [quality gates](agents/quality-gates.md).
- Node runs Vite/Wrangler tooling and native TypeScript scripts; Bun installs/tests/orchestrates. The local runtime is Vite plus `@cloudflare/vite-plugin` (no unstable Wrangler API). Upgrades of Vite, the plugin or Wrangler require rechecking dev, preview smoke and the dry-run; the Worker `compatibility_date` must not be newer than the installed workerd supports.

No station/fare functionality, provider integration, product API contract, data store, Docker/native scaffolding, deployment or release automation is implemented. CI quality gates exist; see [quality gates](agents/quality-gates.md). Existing preparation checks remain separate; see [reviewed skills](agents/skills.md).

## Release-time branch transition

Owner correction, 2026-11-03: METRO-11 may prepare `main` from reviewed independent rebuild history. It must not make it default. Keep `master` default until v1.0.0 is fully ready to release. Controller records actual creation/merge evidence separately; these instructions do not claim it occurred.

Before the eventual authorized switch:

1. Verify reviewed release SHA, independent ancestry and required METRO-12 checks. Finish METRO-13 preview/deployment and METRO-14 release/rollback evidence; confirm v1.0.0 readiness.
2. Inspect live branch rules/protections, required checks, Actions branch/tag filters and environment/deployment branch policies. Establish applicable protection/check rules on `main`; do not assume changing default transfers them.
3. Audit open PR bases and automation/webhook/release branch assumptions. Retarget only reviewed rebuild PRs; never merge legacy ancestry. Confirm CI and deployment policies accept the exact intended branch/revision.
4. Under release-time authorization, switch default, read it back, then verify required CI, release/deploy routing and smoke at the released SHA. Record rollback owner, previous default and deployment/release rollback procedure before switching.
5. If validation fails, stop release progression; restore the recorded prior default/policies under authorization and follow the reviewed deployment rollback. Do not delete master or force-update histories. Master removal/archive remains separate scope.

**Confirmed / controller-observed, 2026-11-03:** GitHub readback had default master at `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, rebuild at `92739bd32ba948106d600a4f73fcf6deb0036a8b`, main absent, both observed branches unprotected, rulesets empty. These are a dated snapshot, not a release-time protection guarantee. No protection/default/deployment mutation belongs to this scaffold.

See [version and verification evidence](evidence/metro-11.md).

## Configuration ownership

**Confirmed / Repo-verified:** `package.json` owns exact runtime metadata and direct dependency pins; `mise.toml` mirrors runtime versions and delegates task commands. `scripts/tools.ts` parses required package/mise/bunfig files, rejects malformed/missing/mismatched fields and checks effective Bun/Node versions before normal commands. `bunfig.toml` enforces exact additions, disabled automatic install, isolated linking and text lockfiles. Bootstrap explicitly uses the frozen committed lockfile. Update pins and lock together; run all gates after changes.

`bun run format:check` checks supported tracked and newly added non-ignored TypeScript, JavaScript, CSS, HTML, Markdown, JSON/JSONC, TOML and YAML using pinned Oxfmt. It never writes; `bun run format` writes source/config formatting. This checks syntax/layout, not arbitrary configuration schemas. The explicit guard checks runtime/install semantics; TypeScript, Vite and Wrangler validate their own configuration during the gates. `.editorconfig` and `.gitattributes` specify UTF-8/LF/indent policy. Ignore rules cover local secrets and generated files, while nested `.env.example` and `.dev.vars.example` remain trackable; examples must contain safe dummy values.

Shared compiler policy lives in `tsconfig.base.json`. Browser uses DOM+React types; Worker uses Cloudflare types; Node tools use Node types; tests and Bun-only tooling use Bun types; core uses ES types only. All enable strict checks including unchecked indexing, exact optional properties, returns, unused declarations/parameters and explicit property access. `scripts/types.test.ts` compiles real fixture programs with positive controls and rejected foreign globals.

**Confirmed / Repo-verified compatibility exception:** only `scripts/tsconfig.json` sets `skipLibCheck: true`. The scripts project type-checks `apps/web/vite.config.ts`, which imports `@cloudflare/vite-plugin`; its declarations reach Wrangler and Miniflare declarations that reference unpublished internal packages and missing modules (removing the flag was tried on 2026-11-03 and failed with TS2307 in Wrangler's `cli.d.ts`). Explicit `types: ["node"]` cannot prevent declarations reached by actual imports from being checked. Adding DOM would leak browser globals; removing typed runtime imports or introducing ambient stubs would hide API usage. Source checking stays strict and real negative source tests remain active. All other projects check library declarations. TypeScript 7 supplies `tsc`; `@typescript/typescript6` supplies only the JavaScript compiler API used by the core import guard and dependency-cruiser parser. Revisit both exceptions on upgrades. See [METRO-16 evidence](evidence/metro-16.md).

## Linting and formatting

**Confirmed / Repo-verified:** Oxlint 1.90.0 runs type-aware through `oxlint-tsgolint` (the TypeScript 7 native compiler, "tsgo") with `--type-aware --deny-warnings` over `apps`, `packages`, `scripts`, `e2e` and `playwright.config.ts`. `.oxlintrc.json` enables the `correctness`, `suspicious` and `perf` categories as errors, the `eslint`, `typescript`, `unicorn`, `oxc`, `import`, `promise`, `node`, `react` and `jsx-a11y` plugins, a curated strict rule set (no `any`, no non-null assertions, no floating or misused promises, the `no-unsafe-*` family, consistent type imports, `require-unicode-regexp`, hook rules) and `reportUnusedDisableDirectives` as an error. Overrides: command-line tools may use `console` and sequential `await` loops; test files add the `jest` rules (`bun:test` is API-compatible). The `no-unsafe-*` family is off for files that the nearest `tsconfig.json` does not give `bun` types (tests, `scripts/tools.ts`, `scripts/configuration.ts`), because `bun:test`, `expect` and `Bun` would resolve to error types; `bun run typecheck` still checks those files strictly. `options.typeCheck` (experimental TypeScript diagnostics inside Oxlint) is not enabled; `tsc` stays the compiler gate.

Oxfmt 0.75.0 reads `.oxfmtrc.json` (100 columns, double quotes, trailing commas, LF, sorted imports in builtin, external, internal, relative groups, sorted `package.json`) and `.editorconfig`. It ignores build output and the generated `apps/api/worker-configuration.d.ts`. `scripts/lint-config.test.ts` fails if type-aware linting, the strict categories or import sorting are removed.
