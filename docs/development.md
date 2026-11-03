# Local workspace

**Confirmed / Repo-verified:** this independent rebuild contains a React/Vite web app, a Hono Cloudflare Worker and a shared dependency-free TypeScript package. Both apps consume `{ kind: 'synthetic-scaffold', ready: true }`. This demonstrates wiring only; it is not product health, data correctness or Metro feature parity.

## Bootstrap and commands

Prerequisites: mise, PowerShell 7 for preparation checks, and an OS supported by the pinned Node/Bun and Wrangler local runtime. Windows execution was checked; other platforms were not exercised. No Cloudflare login, account, database, container or secrets are needed locally.

Review `mise.toml`, then trust it through your mise installation if prompted. Use explicit tool versions so unrelated globally configured tools are not installed:

```powershell
mise install bun@1.4.0 node@24.22.2
mise exec bun@1.4.0 node@24.22.2 -- bun run bootstrap
mise exec bun@1.4.0 node@24.22.2 -- bun run check
mise exec bun@1.4.0 node@24.22.2 -- bun run build
mise exec bun@1.4.0 node@24.22.2 -- bun run dev
```

`bootstrap` verifies exact runtimes and installs the committed single `bun.lock` with `--frozen-lockfile`; dependency drift fails. `check` runs the narrow core import guard, Bun tests, root typecheck and a standalone pure-core typecheck. `build` creates `apps/web/dist` and dry-runs Wrangler into `apps/api/dist`; it uploads/deploys nothing. `dev` starts web at `http://127.0.0.1:5173` and local workerd at `http://127.0.0.1:8787`; Ctrl+C disposes both. Ports must be free. Worker status is `GET /__scaffold/status`; unknown routes return 404. The web consumes core directly and makes no API request.

For the real browser/local Worker smoke after build:

```powershell
mise exec bun@1.4.0 node@24.22.2 -- bunx --no-install playwright install chromium
mise exec bun@1.4.0 node@24.22.2 -- bun run smoke
```

Smoke starts the built web preview on 4173 and local Worker on 8787, checks actual HTTP status/JSON/404, renders the shared result in Chromium and rejects page/console errors. Worker local execution bundles source; the separate dry-run verifies the production Worker bundle. Playwright browser downloads are environment tooling, not part of `bootstrap`. Smoke always closes its local servers and browser on assertion failure.

On this managed Windows runner, per-call temporary/profile directories changed. Native package install needed a permitted execution context and stable paths. This environment-specific setup was used; ordinary machines need not override these:

```powershell
$env:MISE_DATA_DIR = Join-Path (Get-Location) '.local/mise'
$env:BUN_TMPDIR = Join-Path (Get-Location) '.local/tmp'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.local/browsers'
```

`.local`, dependencies, bundle outputs and Wrangler state are ignored. Use the same absolute paths when checking an exported copy, so the copy gets its own dependencies while reusing installed runtimes/browser binaries.

## Boundaries and choices

- `packages/core/src/domain`: synthetic contract; `src/application`: executable shared result. No dependencies, provider globals, apps or adapters. Its separate `types: []`, ES-only typecheck runs without browser/Bun/Node globals.
- `apps/web`: React DOM composition; `apps/api`: Hono composition with Worker default export. Apps depend inward on `@metro/core`; no framework imports cross into core.
- Root owns build/test tooling. App manifests own runtime dependencies. Exact direct versions plus the single Bun lock pin the resolved graph; there is no workspace orchestrator.
- `scripts/boundaries.ts` parses core source imports, exports, import types, dynamic imports and require calls. It rejects non-relative/computed/escaping references, symlinks and declared dependencies. Test files may import Bun. This narrow smoke guard is not a security sandbox or full architecture policy; broader graph/CI gates remain METRO-12.
- Node runs Vite/Wrangler tooling and native TypeScript scripts; Bun installs/tests/orchestrates. Wrangler's local Node API is explicitly `unstable_startWorker`, pinned to 4.156.2. Upgrades require rechecking that API and runtime smoke.

No station/fare functionality, provider integration, product API contract, data store, Docker/native scaffolding, CI, deployment or release automation is implemented. Existing preparation checks remain separate; see [reviewed skills](agents/skills.md).

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
