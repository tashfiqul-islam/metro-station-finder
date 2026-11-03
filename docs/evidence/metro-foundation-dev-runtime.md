# METRO-21 evidence: dev runtime

Ticket METRO-21 (`dev-runtime`), parent METRO-18. Specification `metro-foundation-completion` revision `2026-11-03-r1` ([mirror](../specifications/foundation-completion.md)). Date 2026-11-03.

- Base: `76b01ae` (`feature/metro-rebuild`, merge of METRO-20). The PR head is the final commit.
- Environment: Windows 11, PowerShell 7, mise-pinned Bun 1.4.4 and Node 26.13.0.

## Vite 8 support (stop condition cleared)

**Repo-verified (registry peer dependencies, 2026-11-03):** `@cloudflare/vite-plugin` 1.66.0 declares `vite ^6.1.0 || ^7.0.0 || ^8.0.0` and `wrangler ^4.154.0`; `@vitejs/plugin-react` 6.1.2 declares `vite ^8.0.0`. Pinned Vite is 8.3.5, Wrangler 4.156.2. **Context7-verified:** the plugin supplies `assets.directory` from the client build; `not_found_handling` and `run_worker_first` array patterns are Wrangler configuration. Both packages are the newest releases past the 3-day cooldown (1.67.0 and 6.2.1 were published 2026-11-01 and 2026-11-02). Build, dev and preview ran against them.

## Criterion to evidence

| Criterion                | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Result |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FND-R1 dev               | `vite` in `apps/web` with `@cloudflare/vite-plugin`: `GET /` 200 and `GET /api/scaffold/status` 200 from `127.0.0.1:5173`. Automated Playwright check against the running dev server: after editing `App.tsx`, the page updated with a `window` marker intact, zero extra navigations (no full reload), and the status output still rendered (Fast Refresh; the effect re-ran once). A second dev instance exits 1 (`strictPort`). After the process tree was stopped the port was free. The throwaway script lived in ignored `.local/` and was removed. | Pass   |
| FND-R2 build             | `bun run build`: client assets in `apps/web/dist/client`, Worker bundle in `apps/web/dist/metro_scaffold`, Wrangler dry run "Total Upload: 66.17 KiB / gzip: 17.91 KiB", nothing uploaded. `unstable_startWorker`, `startLocal` and `scripts/local.ts` appear nowhere in tracked source outside historical evidence and the specification.                                                                                                                                                                                                                | Pass   |
| FND-R3 preview and smoke | `bun run smoke` runs `vite preview`: status 200 with a schema-valid body, `/api/unknown` 404 with a schema-valid envelope, `/deep/link` 200 SPA HTML, success state in Chromium, an intercepted 500 shows `role="alert"` (and no status output), axe violations `[]`, no page or console errors (success page). `apps/api/src/index.test.ts` covers the same routes in process.                                                                                                                                                                           | Pass   |
| FND-R4 contracts         | `packages/contracts/src/contracts.test.ts` (rejects `ready: false`, missing or wrong `kind`, extra fields, null, array, string; envelope variants) and `apps/web/src/status-client.test.ts` (rejects the same bodies, HTTP 500, an SPA HTML fallback, invalid JSON and network failure). The API validates its own output: a drifting status returns 500. The `Equal` assertion ties the core type to the schema type.                                                                                                                                    | Pass   |
| FND-R5 binding types     | `scripts/binding-types.test.ts`: committed types pass `wrangler types --check`; a changed `wrangler.jsonc` fails with "Types at worker-configuration.d.ts are out of date". `types:check` is in `check`.                                                                                                                                                                                                                                                                                                                                                  | Pass   |
| FND-R6 layering          | `scripts/layering.test.ts` (8 tests) over temporary trees with stand-in packages: core importing contracts, core importing a third-party package, contracts importing `hono`, `react` or an app, web importing an api internal module and api importing web are each rejected by their named rule; a clean tree passes. The real tree passes.                                                                                                                                                                                                             | Pass   |
| FND-R7 bundle            | `bundle:check` on `apps/web/dist/client`: 224673 bytes raw / 69883 gzip with the compiler, against the unchanged budget 250000 / 80000. Previous baseline 219788 / 67984 (METRO-19).                                                                                                                                                                                                                                                                                                                                                                      | Pass   |

## RED and GREEN

- **Contracts:** `packages/contracts` tests failed first with "Cannot find module './index'", then 10 tests passed.
- **API:** tests failed first with "Cannot find module '@metro/contracts'", then passed.
- **Client:** `status-client.test.ts` failed first (module missing), then 15 app tests passed.
- **Layering:** with only the existing two rules, 7 of 8 layering tests failed (violations not rejected); after the three rules, all 8 pass. A second RED showed `exclude: node_modules` hid third-party imports from the graph; it now excludes only `dist`.
- **Binding types:** the stale case was observed to fail before the test was written.

## Findings made while implementing

- **workerd compatibility date.** With `compatibility_date` `2026-11-02` the plugin's runtime failed ("newest date supported by this server binary is 2026-10-30") and the preview returned HTTP 500. The date is now `2026-10-30`. The old launcher hid this. Smoke fails visibly in this case.
- **Generated binding types vs Bun types.** `worker-configuration.d.ts` declares `*.txt`-style modules that conflict with Bun's; the Bun-typed test project therefore includes a test-only `apps/api/test-env.d.ts` (`interface Env {}`) instead. The Worker has no bindings; the real file is checked by `types:check`.
- **`createApp` lives in `app.ts`.** The generated `mainModule` type requires every export of the Worker entry to be a handler.
- **Valibot declarations need `Blob`/`File`.** `packages/contracts/tsconfig.json` adds the `DOM` lib. `skipLibCheck` was not touched.
- **Bundle measurement.** The plugin writes the Worker bundle below `apps/web/dist`, so `bundle:check` now defaults to `apps/web/dist/client`, which is exactly what it measured before. The budget numbers are unchanged.
- **Lint.** `jsx-a11y/prefer-tag-over-role` asked for `<output>` over `role="status"`; the loading state uses `<output>` (implicit status role). The rule stays on.
- **`@metro/core` removed from `apps/web`.** The page no longer imports core; knip flagged the dependency.

## Pins added (2026-11-03, cooldown cutoff 2026-10-31)

| Package                             | Pin            | Latest (published) | Note                                                                              |
| ----------------------------------- | -------------- | ------------------ | --------------------------------------------------------------------------------- |
| `@cloudflare/vite-plugin`           | 1.66.0         | 1.67.0 (11-01)     | newest past cooldown                                                              |
| `@vitejs/plugin-react`              | 6.1.2          | 6.2.1 (11-02)      | newest past cooldown                                                              |
| `valibot`                           | 1.5.0          | 1.5.0              | latest                                                                            |
| `babel-plugin-react-compiler`       | 1.0.0          | 1.0.0              | latest                                                                            |
| `@rolldown/plugin-babel`            | 0.2.4          | 0.3.0 (10-29)      | 0.3.0 is outside plugin-react 6.1.2's supported peer range (`^0.1.7 \|\| ^0.2.0`) |
| `@babel/core`, `@types/babel__core` | 8.0.10, 7.20.5 | as resolved by Bun | resolved by `bun add` under the cooldown                                          |

`bun audit`: no vulnerabilities (349 packages) after these additions.

## Unrun checks and Unknowns

- Hosted `Quality gates` runs only on the PR.
- The compiler's runtime effect (memoization wins) was not measured; only that it compiled and the app works.
- `bun run dev` through the `bun run` wrapper: Ctrl+C was exercised by stopping the Vite process tree, not an interactive terminal.
- Firefox and WebKit are not exercised; METRO-22 owns cross-browser E2E.
