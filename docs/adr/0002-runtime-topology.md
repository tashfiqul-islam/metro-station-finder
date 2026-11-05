# ADR-0002: Runtime topology

- Status: Accepted
- Date: 2026-11-03
- Ticket and specification: METRO-21, `metro-foundation-completion` revision `2026-11-03-r1`

## Context

Before this change the web app and the Worker ran as separate servers (Vite on 5173, a Wrangler Node API on 8787 through the unstable `unstable_startWorker`), with no same-origin integration and no React Fast Refresh. See [ADR-0001](0001-foundation-baseline.md) and the [METRO-21 evidence](../evidence/metro-foundation-dev-runtime.md). `@cloudflare/vite-plugin` 1.66.0 and `@vitejs/plugin-react` 6.1.2 both declare Vite 8 support in their peer dependencies (Repo-verified, registry), matching the pinned Vite 8.3.5.

> Amendment 2026-11-05 (METRO-31): `run_worker_first` is now `["/api/*", "/assets/*"]`, so `/assets/*` requests also reach Worker code (a missing asset becomes a 404 instead of the SPA shell). The Decision text below is left as written. See [ADR-0011](0011-security-headers.md).

## Decision

- We will run web and API together through `@cloudflare/vite-plugin`: `vite dev`, `vite build` and `vite preview` serve the SPA and execute the Worker in workerd from one origin. `unstable_startWorker` and the custom launcher scripts are removed.
- One Worker serves static assets. `assets.not_found_handling` is `single-page-application` and `assets.run_worker_first` is `["/api/*"]`, so only API requests reach Worker code; every other unknown path returns the SPA shell.
- The Worker package stays `apps/api`. Its `wrangler.jsonc` is referenced from `apps/web/vite.config.ts` through `configPath: "../api/wrangler.jsonc"`. The plugin supplies the asset directory (the client build output), so the config has no `assets.directory`.
- Build output: `apps/web/dist/client` (assets) and `apps/web/dist/metro_scaffold` (Worker bundle and generated `wrangler.json`). The Wrangler dry run in `apps/api` targets that generated configuration. Dry-run result: 66.17 KiB / gzip 17.91 KiB total upload, nothing uploaded.
- API contract: `GET /api/scaffold/status`; other methods on that path return 405 with `Allow: GET, HEAD`; unknown `/api/*` returns 404; unexpected failures return 500; all errors use the `{ error: { code, message } }` envelope and never echo the cause.
- `compatibility_date` is `2026-10-30`, the newest date the pinned workerd supports. `2026-11-02` made workerd refuse to start.
- The bundle gate measures `apps/web/dist/client`, the same client JS/CSS it always measured. The Worker bundle is a separate artifact and is not counted against the client budget (250000 raw / 80000 gzip, unchanged).

## Consequences

- One command, one origin, real workerd in dev and preview, Fast Refresh with the React plugin.
- Worker and web builds are coupled through the web Vite config; upgrades of Vite, the plugin and Wrangler move together and need dev, preview smoke and dry-run rechecks.
- The compatibility date must be raised only with a workerd that supports it.
- The plugin writes build output below `apps/web`, not `apps/api/dist`; documentation and scripts follow the generated configuration path.

## Alternatives considered

- Keep two servers and add a dev proxy: no workerd parity in the web server and the unstable API stays.
- Move the Worker configuration into `apps/web`: couples the Worker package to the SPA package without a benefit now.
- Run the Worker first for every path: spends Worker invocations on static assets.

## Confirmation

- Layering: `apps-never-import-each-other` in `.dependency-cruiser.mts`, proven red by `scripts/layering.test.ts`, run by `bun run imports:check`.
- Runtime shape: `apps/api/src/index.test.ts` (route contract), `e2e/` smoke against `vite preview` in workerd, and `bun run bundle:check` (client budget).
