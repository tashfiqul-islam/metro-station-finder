# Foundation completion specification

Source: Plane Page 646323d4-2031-452a-a23c-dd64da4e9a32, project 1ab13b1b-d537-4524-8f18-45ee42262dc4. Retrieved 2026-11-03. Tickets: METRO-18 parent (ffeda386-abeb-4901-accf-67385425eb5c); METRO-19 `hygiene` (e8258a72-d284-476d-a9ba-124071267efd); METRO-20 `supply-chain` (9136d424-c6c4-4ddd-8e5f-80af3b77b847); METRO-21 `dev-runtime` (0b9c70d5-6529-4632-bcbf-0a6c7b31764d); METRO-22 `test-pyramid` (e7248fa9-541e-4884-afd6-fea3145c2696). Read-only repository mirror; remote operation and status evidence belong to the controller.

- Identity: `metro-foundation-completion`
- Revision: `2026-11-03-r1`
- Base: `feature/metro-rebuild` at `827d0a7`
- Decision owner and approval: Tashfiqul Islam, in chat on 2026-11-03. Approved: scope "tooling + app architecture"; Renovate with release cooldown; MIT license; parent ticket with ordered child slices. Excluded: frontend stack choices (router, styling, data fetching, i18n).
- Domain: [glossary](../product/glossary.md), [feature parity](../product/feature-parity.md). No product terms are introduced; the scaffold stays synthetic.
- Grouping: module 02 Repository and delivery foundation (`f225309b-c896-4168-a32a-92badc4f6262`); milestone Reproducible scaffold and delivery checks accepted (`b3d2bd45-1e0a-42ce-80ca-234164b026fa`); release explicitly unassigned, because foundation work does not ship.

## Research

**Repo-verified (audit 2026-11-03, `827d0a7`):**

1. Guidance has drifted since METRO-12 merged. `docs/agents/ui.md` still calls Playwright/axe "proposed". `security.md` says scans are "pending METRO-12". `architecture.md`, `development.md` and `README.md` say CI and graph gates are absent or still pending. `domain.md` shows a nonexistent `src/` layout. Two different Playwright install commands are documented.
2. The `docs/examples/plane-preparation/README.md` snippet omits the `tooling` root that `skills.lock.json` requires, so running it verbatim fails with `Missing skill root: tooling`.
3. The Gitleaks version is hardcoded in `mise.toml`, `scripts/configuration.ts` and `scripts/secrets.ts`. The guard does not cover `secrets.ts`.
4. Missing: a committed Markdown link gate (METRO-17 ran a one-off), ADR directory, LICENSE, SECURITY, CONTRIBUTING, PR template, `CLAUDE.md` entry point and editor recommendations.
5. Missing: dependency update automation, release cooldown, workflow security lint, commit-message enforcement, CI caching, Git-history secret scan and remote branch rules. The branches were observed unprotected on 2026-11-03.
6. Local runtime uses the pinned unstable API `unstable_startWorker`. Web and Worker run as separate servers with no same-origin integration. `vite.config.ts` compiles JSX through oxc without `@vitejs/plugin-react`, so there is no React Fast Refresh.
7. No shared runtime contract validation exists. There are no typed Worker bindings, and dependency-cruiser has no layering rules (only cycles and unresolved imports).
8. No coverage measurement or threshold. No API in-process tests, no React component tests. E2E is a hand-written Playwright script on Chromium only, not Playwright Test.

**Context7-verified (2026-11-03):** Bun `install.minimumReleaseAge` (seconds) and `test.coverageThreshold` (number or `{ lines, functions }`, enforced per file) exist. `@cloudflare/vite-plugin` runs Workers in workerd through the Vite Environment API, builds SPA assets, supports `vite preview` and supports `assets.run_worker_first` route lists.

**Unverified (the implementer must verify before use):** that `@cloudflare/vite-plugin` and `@vitejs/plugin-react` support the pinned Vite 8. Validator CLIs for Renovate, actionlint and zizmor. Whether `wrangler types` has a check mode. React Compiler compatibility. Exact VS Code extension IDs.

## Problem and outcome

The scaffold passes its gates, but the foundation is not yet the reference standard that feature work should inherit. Outcome: every guide tells the truth; dependencies stay current automatically behind a supply-chain cooldown; CI and hooks enforce workflow, commit and history hygiene; one modern local runtime serves web and API from the same origin with typed contracts and bindings; a measured test pyramid (unit, component, API, cross-browser E2E with accessibility) guards every layer.

## Global scope

Four ordered child slices: `hygiene`, `supply-chain`, `dev-runtime`, `test-pyramid`. Each slice is one ticket, one branch from `feature/metro-rebuild` and one PR back.

## Global exclusions

- Product features, station/fare data or provider integration.
- Router, styling or design tokens, data-fetching library, i18n. These are deferred to METRO-15 and later tickets.
- Deployment, preview, request IDs, structured logging, OTLP (METRO-13). Release automation (METRO-14).
- Default-branch switch, `master` ancestry or deletion.
- Rewriting historical evidence files (`docs/evidence/*`). Add new evidence instead.

## Constraints and contracts

- Latest stable releases on the implementation date. They must satisfy the 3-day release cooldown unless a security fix requires otherwise; record the reason. No prereleases. Exact pins only. Context7 first, then official release or registry pages; record dated evidence.
- Canonical command names stay stable: `bootstrap`, `dev`, `check:fast`, `check`, `build`, `smoke`, `bundle:check`, `scan`. The required CI context stays `Quality gates`.
- Never weaken strict compiler flags, assertions, the bundle budget (250000 raw / 80000 gzip) or thresholds. No fallback paths. On incompatibility, stop that step and report the evidence.
- TDD: each criterion gets a failing check before the implementation.
- Bun is the package manager; commands are PowerShell. Signed commits. Every fixture git process uses `cleanGitEnv()`.
- Core stays dependency-free (`scripts/boundaries.ts` unchanged for core).
- Every material decision gets an ADR in `docs/adr/`.

## Slice hygiene — Truthful docs, decision records and repository hygiene

- Outcome: every guide matches the repository, and decisions, licensing, contribution and security reporting are discoverable from the README.
- Blocked by: none.
- Required tools/data: pinned mise toolchain, PowerShell 7, reviewed skill roots for the preparation validator.
- Scope:
  1. Correct stale guidance in `README.md` and `docs/agents/{ui,security,architecture,testing,quality-gates,domain}.md`, plus `docs/development.md`. Unify on a single Playwright browser install command. Fix the `tooling` root in `docs/examples/plane-preparation/README.md`.
  2. Add a committed Markdown link gate, `scripts/links.ts` with tests. It checks every relative link and heading anchor in tracked and newly added non-ignored `.md` files, and is wired into `check`. External URLs are not fetched.
  3. Add `docs/adr/`: `0000-template.md` (MADR-style: status, context, decision, consequences, alternatives) and `0001-foundation-baseline.md`, recording the existing decisions: Bun + mise, the TS 7 compiler with the TS 6 API seam, the Hono Worker, React/Vite, core purity, Plane as tracker. Link it from `docs/agents/architecture.md` and `domain.md`.
  4. Add `LICENSE` (MIT, `Copyright (c) 2026 Tashfiqul Islam`) and `"license": "MIT"` in the root manifest. Add `SECURITY.md` (private reporting through GitHub Security Advisories; no public issues), `CONTRIBUTING.md` (links to development, workflow and quality gates; no duplicated policy) and `.github/pull_request_template.md` (ticket ID, spec revision, checks run with results, unrun checks, review disposition).
  5. Add a `CLAUDE.md` whose only content imports `@AGENTS.md`. No duplicated policy.
  6. Add `.vscode/extensions.json` and `.vscode/settings.json`: Oxc formatter/linter, EditorConfig, format on save, workspace TypeScript. Verify the extension IDs.
  7. Make the Gitleaks pin single-sourced: `scripts/secrets.ts` reads the version from `mise.toml` through the configuration module. Give every mise task a `description`.
  8. Extend CODEOWNERS to `CLAUDE.md`, `LICENSE`, `SECURITY.md`, `.vscode/`, `docs/adr/` and `.github/pull_request_template.md`.
  9. Commit this specification mirror, the handoff plan and new `docs/evidence/metro-foundation-hygiene.md`.
- Exclusions: no edits to historical `docs/evidence/*` files, no gate-policy weakening, no new product docs.
- Acceptance FND-H1: Given the tracked Markdown, when `bun run check` runs, then the link gate passes with every relative link and anchor resolved.
  - Failure checks: a fixture with a missing target file fails, naming `file:line`. A fixture with a missing heading anchor fails. An external `https://` link is not fetched and does not fail.
- Acceptance FND-H2: Given the guidance documents, when they are searched for `pending METRO-12`, `proposed checks`, `not available verified gates` and the `src/` layout, then nothing matches outside `docs/evidence/`. When the plane-preparation README snippet runs verbatim with the reviewed roots, the validator passes.
  - Failure checks: on base, the snippet fails with `Missing skill root: tooling`.
- Acceptance FND-H3: Given `docs/adr/`, when a reader opens it, then the template and ADR-0001 (status Accepted) exist and are linked from the architecture and domain guides.
  - Failure check: the link gate fails if either link breaks.
- Acceptance FND-H4: Given the repository root, when licensing and contribution are inspected, then `LICENSE` holds the exact MIT text, the manifest declares `MIT`, and `SECURITY.md`, `CONTRIBUTING.md` and the PR template exist and are linked from README.
  - Failure check: a missing file breaks the README link gate.
- Acceptance FND-H5: Given `CLAUDE.md`, when it is read, then it consists only of the `@AGENTS.md` import.
- Acceptance FND-H6: Given the Gitleaks pin in `mise.toml`, when it changes, then `scripts/secrets.ts` invokes that exact version and the configuration guard still rejects a missing pin.
  - Failure check: a unit test with a temporary mise file proves the derived version. A missing pin fails with `tools.gitleaks`.
- Testing seams:
  - FND-HS1: link gate over temporary Markdown fixtures (H1, H3, H4).
  - FND-HS2: text scan plus the real `verify-metro-preparation.ps1` and `test-metro-preparation.ps1` runs (H2).
  - FND-HS3: configuration and secret-version unit tests (H6).
- Check plan: focused `bun test scripts/links.test.ts` and `scripts/configuration.test.ts`, then `bun run check` and both preparation scripts. Base fails H1 (no gate), H2 (snippet) and H6 (hardcoded version).
- Review needs: AFK. The owner only confirms the license holder name.

## Slice supply-chain — Current dependencies, update automation and hardened CI

- Outcome: every pin is the latest stable release past the cooldown, updates arrive as grouped and validated PRs, and CI rejects insecure workflows, non-conventional commits and historical secrets.
- Blocked by: `hygiene` (shared guidance and CODEOWNERS files).
- Required tools/data: GitHub admin access for the Renovate app and rulesets (HITL), registry access, pinned mise toolchain.
- Scope:
  1. Re-verify every runtime, tool, direct dependency and action pin against official sources on the implementation date. Update to the latest stable release that satisfies the cooldown. Record a dated evidence table in `docs/evidence/metro-foundation-supply-chain.md`; any pin that is not latest needs a stated reason.
  2. Set Bun `install.minimumReleaseAge = 259200` (3 days) in `bunfig.toml`. The configuration guard requires it, with a test.
  3. Add Renovate configuration (`.github/renovate.json5` or the root equivalent; verify the supported path):
     - Managers: bun, mise and github-actions. Exact pins. Action digests pinned with version comments.
     - `minimumReleaseAge` equal to the Bun cooldown. Security advisories bypass the cooldown.
     - Monorepo/ecosystem groups (React, Cloudflare, Oxc, TypeScript, Playwright).
     - Weekly lock-file maintenance, dependency dashboard, PR concurrency limit.
     - Validate with a pinned official validator inside `check`. A guard test fails if the Renovate and Bun cooldowns differ.
  4. Pin actionlint and zizmor in mise. Add `lint:workflows` to `check`; it rejects unpinned actions, template injection and excessive permissions.
  5. Add a `commit-msg` hook in `hk.pkl` that runs `scripts/commit-message.ts`. It accepts Conventional Commits types `feat|fix|refactor|docs|test|chore|perf|ci|style|build|revert`, an optional scope, `!` and a body, and passes Git merge and revert subjects. CI validates every commit in the PR range with the same script (checkout `fetch-depth: 0`).
  6. CI hardening:
     - SHA-pinned `actions/cache` for the Bun install cache, keyed on `bun.lock`, and for Playwright browsers, keyed on the Playwright version.
     - A Gitleaks full-history scan (`gitleaks git`, redacted) in the `security` job.
     - Explicit job-level least-privilege `permissions`.
     - The `Quality gates` aggregate and its tests stay unchanged in semantics.
  7. HITL remote enforcement: the owner installs the Renovate GitHub App and creates rulesets for `feature/metro-rebuild` and `main`. Required: `Quality gates` from GitHub Actions, up-to-date branch, PR, signed commits, resolved conversations; block force-push and deletion; no bypass actors. Record a `gh api` readback in evidence. If permissions are missing, record the gap explicitly.
- Exclusions: no deployment workflow, no release workflow, no Scorecard/SBOM publishing, no change to aggregate semantics.
- Acceptance FND-S1: Given the evidence table, when each pin is compared with its official source on the recorded date, then each is the latest stable release past the cooldown or carries a stated reason, and a frozen bootstrap passes.
  - Failure check: a manifest edited without a lock update fails the frozen bootstrap.
- Acceptance FND-S2: Given the Renovate configuration, when the pinned validator runs, then it passes.
  - Failure checks: a fixture with an unknown option fails validation. A fixture where the Renovate cooldown differs from bunfig fails the guard test.
- Acceptance FND-S3: Given `bunfig.toml` without `minimumReleaseAge`, when `bun run scripts/tools.ts` runs, then it exits nonzero naming `install.minimumReleaseAge`.
- Acceptance FND-S4: Given workflow fixtures, when `lint:workflows` runs, then it rejects `uses: actions/checkout@v4` (unpinned), a `${{ github.event.pull_request.title }}` used inside `run:`, and `permissions: write-all`. The real workflow passes.
- Acceptance FND-S5: Given a disposable hook fixture, when a commit uses `update stuff`, then the commit is rejected and the index is preserved. `feat(core): add x` and a Git merge subject are accepted. The PR-range mode exits nonzero when any commit in the range is invalid.
- Acceptance FND-S6: Given the workflow, when it is inspected and run, then the caches are keyed on `bun.lock` and the Playwright version, the history scan runs, the required context is still `Quality gates`, and `scripts/ci-results.test.ts` still passes unchanged.
- Acceptance FND-S7 (HITL): Given owner action, when the rulesets are read back, then they match the required list. Otherwise the evidence names each missing control and the reason.
- Testing seams:
  - FND-SS1: configuration guard with temporary bunfig/Renovate files (S2, S3).
  - FND-SS2: actual actionlint/zizmor on temporary workflow fixtures (S4).
  - FND-SS3: actual hk commit-msg hook in disposable Git repositories using `cleanGitEnv()`, plus the script's range mode (S5).
  - FND-SS4: workflow inspection, hosted CI run and `gh api` readback (S6, S7).
- Check plan: focused tests, then `check`, `build`, `smoke`, `bundle:check`, `scan`, then hosted CI on the PR. Base fails S2–S5 (absent).
- Review needs: AFK for implementation. HITL for app installation and rulesets.

## Slice dev-runtime — Same-origin workerd runtime, typed contracts and layered architecture

- Outcome: one `bun run dev` serves the SPA and the Worker API from one origin in workerd with React Fast Refresh. A validated shared contract carries the synthetic status from the Worker to the rendered page. Layering is enforced by the import graph.
- Blocked by: `hygiene` (ADR directory).
- Required tools/data: pinned Vite, Wrangler, `@cloudflare/vite-plugin` and `@vitejs/plugin-react`, with verified Vite 8 support.
- Scope:
  1. Adopt `@cloudflare/vite-plugin` and `@vitejs/plugin-react`. `vite dev`, `vite build` and `vite preview` run web and Worker together in workerd. Remove `unstable_startWorker` from `scripts/local.ts` and the related documentation exception. If either plugin does not support the pinned Vite, stop and record the evidence; no downgrade without owner approval.
  2. ADR-0002 runtime topology: one Worker serves static assets with `assets.not_found_handling = "single-page-application"` and `run_worker_first = ["/api/*"]`. Record where the Worker config lives (keep `apps/api` as the Worker package, referenced from the web Vite config, unless the ADR justifies otherwise) and the dry-run build output.
  3. Contract move: `GET /api/scaffold/status` returns the synthetic status. Unknown `/api/*` returns 404 with a JSON error envelope `{ error: { code, message } }`. Unknown non-API paths serve the SPA. `/__scaffold/status` is removed.
  4. ADR-0003 contracts: add `packages/contracts` using one Standard Schema v1 validation library. Selection criteria: Standard Schema compliance, Hono validator support, measured bundle impact within the existing budget, TypeScript 7 compatibility. It defines the status and error schemas and derives their types. A compile-time assertion keeps the core `ScaffoldStatus` and the schema-derived type identical. Core stays dependency-free.
  5. The web app fetches `/api/scaffold/status` through a typed client (Hono RPC `hc` or fetch plus schema parse, decided in ADR-0003). It renders accessible loading, success and error states (`role="status"` / `role="alert"`). Add a favicon and document metadata so the document loads without asset 404s.
  6. Typed Worker bindings: commit the `wrangler types` output and use `new Hono<{ Bindings: Env }>()`. A check fails when the generated types are stale (use the verified check mode, or regenerate and diff).
  7. Layering rules in dependency-cruiser:
     - core imports only core;
     - contracts imports only core and the chosen schema library;
     - `apps/web` imports `apps/api` only through a declared type-only export (if RPC is chosen);
     - apps never import each other's internals;
     - scripts are excluded.
  8. React Compiler: adopt it if it is compatible with the pinned React, Vite and plugin-react, and record that in ADR-0003. Otherwise record the deferral with evidence.
- Exclusions: deployment/preview, request IDs, logging (METRO-13); router, styling, data-fetching library, i18n; product endpoints.
- Acceptance FND-R1: Given a clean checkout, when `bun run dev` starts, then `/` and `/api/scaffold/status` are served from one origin. Editing a component keeps that component's state (Fast Refresh; record manual or automated evidence). Ctrl+C stops all processes.
  - Failure check: an occupied port fails visibly.
- Acceptance FND-R2: Given `bun run build`, when it completes, then client assets and a Worker bundle exist, the Wrangler dry-run passes with no upload, and `unstable_startWorker` appears nowhere in tracked source.
- Acceptance FND-R3: Given `vite preview` in workerd, when smoke runs, then:
  - `/api/scaffold/status` returns 200 with a schema-valid body;
  - `/api/unknown` returns 404 with a schema-valid error envelope;
  - `/deep/link` returns 200 SPA HTML;
  - the page shows the success state.
  - Failure check: an intercepted 500 shows the error state with `role="alert"`.
- Acceptance FND-R4: Given contract unit tests, when bodies with `ready: false`, a missing `kind`, extra fields (per the ADR's strictness decision) or a non-JSON response are parsed, then they are rejected at both the API and the web client. Valid bodies pass. A drifted core type fails `typecheck`.
- Acceptance FND-R5: Given stale generated binding types, when `check` runs, then it fails naming the file. After regeneration it passes.
- Acceptance FND-R6: Given graph fixtures, when the import gate runs, then each rule rejects its violation: core importing contracts; contracts importing `hono` or `react`; web importing an api internal module. The real tree passes.
- Acceptance FND-R7: Given the production build, when `bundle:check` runs, then it passes the unchanged 250000 / 80000 budget and records a new baseline.
- Testing seams:
  - FND-RS1: real Vite and workerd runtime via preview smoke (R1–R3).
  - FND-RS2: contract schema unit tests and a compile-time type assertion (R4).
  - FND-RS3: binding type staleness check (R5).
  - FND-RS4: dependency-cruiser over temporary fixtures (R6).
  - FND-RS5: the real bundle gate (R7).
- Check plan: focused tests, then the full canonical suite. Base fails R1–R6 (separate servers, old route, no contracts, no rules).
- Review needs: AFK. Escalate to HITL only if a plugin incompatibility forces a version decision.

## Slice test-pyramid — Measured unit, component, API and cross-browser E2E coverage

- Outcome: every layer has its own fast tests, coverage is measured and enforced, and E2E runs in Playwright Test across engines with accessibility, trace and report artifacts.
- Blocked by: `supply-chain` (CI caching and workflow edits), `dev-runtime` (preview runtime, contracts, UI states).
- Required tools/data: pinned `@playwright/test`, Testing Library, happy-dom registrator; Playwright browsers for Chromium, Firefox and WebKit.
- Scope:
  1. Coverage: `bun test --coverage` with `[test] coverageThreshold = { lines = 0.9, functions = 0.9 }` (Bun enforces it per file) and an lcov reporter to `coverage/`. `check` runs with coverage. Any `coveragePathIgnorePatterns` entry needs a written reason and must not exclude product source. CI uploads the lcov artifact.
  2. API in-process tests use Hono `app.request()`: status 200, 404 envelope, schema validity, method-not-allowed behavior per the ADR.
  3. React component tests run under Bun with `@happy-dom/global-registrator` and `@testing-library/react`, covering loading, success and error states with a stubbed fetch. Add a dedicated DOM-test tsconfig, and extend `scripts/types.test.ts` so Bun globals stay rejected in web source while DOM-test files compile.
  4. Replace `scripts/smoke.ts` with `@playwright/test` and a `playwright.config.ts`:
     - `webServer` = built `vite preview`.
     - Projects: Chromium, Firefox, WebKit desktop, plus one mobile viewport.
     - `retries: 0` everywhere (a flaky test is a defect).
     - Trace and screenshot on failure; HTML report uploaded by CI on failure.
     - An axe fixture that asserts zero violations on every page in every project.
     - A console/page-error fixture that fails the test.
     - `bun run smoke` stays the canonical command.
     - Remove the raw `playwright` dependency if it becomes redundant.
  5. Document test conventions in `docs/agents/testing.md`: colocated `*.test.ts(x)`, E2E location, synthetic fixtures only, no network in unit tests, determinism rules, and how to run each layer.
- Exclusions: visual regression snapshots, load testing, product journeys.
- Acceptance FND-T1: Given the suite, when `bun run check` runs, then coverage meets the per-file thresholds and lcov is written.
  - Failure check: a temporary uncovered source fixture loaded by a test drops below the threshold and makes `bun test --coverage` exit nonzero.
- Acceptance FND-T2: Given API and component tests, when they run, then 200/404/schema and loading/success/error are asserted.
  - Failure check: removing the error branch or returning an invalid body makes a named test fail (record the demonstration).
- Acceptance FND-T3: Given `bun run smoke`, when it runs locally (Chromium) and in CI (all projects), then all pass with zero axe violations and zero console/page errors. An intercepted 500 shows the error state.
  - Failure check: a deliberately failing assertion produces a trace and an HTML report artifact.
- Acceptance FND-T4: Given the type fixtures, when Bun globals appear in web source, then compilation fails, while DOM-test files compile with DOM and Bun types.
- Acceptance FND-T5: Given hooks and CI, when they run, then they invoke the unchanged canonical names. The CI `build` job installs all Playwright browsers through the cache, and wall-clock timings for `check` and `smoke` are recorded.
- Testing seams:
  - FND-TS1: Bun coverage threshold with a temporary fixture (T1).
  - FND-TS2: Hono `app.request()` and Testing Library (T2).
  - FND-TS3: Playwright Test against the real preview runtime (T3).
  - FND-TS4: real tsc fixtures (T4).
  - FND-TS5: hosted CI run (T5).
- Check plan: focused suites, then the canonical suite, then hosted CI. Base fails T1–T4 (absent).
- Review needs: AFK.

## Readiness record

- Reviewer: Tashfiqul Islam (owner decisions above). Reviewed revision: `2026-11-03-r1`.
- Blockers:
  - `hygiene`: none.
  - `supply-chain`: `hygiene`.
  - `dev-runtime`: `hygiene`.
  - `test-pyramid`: `supply-chain`, `dev-runtime`.
- Unresolved material unknowns: plugin Vite 8 support and validator CLIs. Each is an explicit stop-and-report step in its slice, not a hidden assumption.
- Disposition: the parent ticket and `hygiene` are Ready. The other slices stay Backlog until their blockers are Done.
