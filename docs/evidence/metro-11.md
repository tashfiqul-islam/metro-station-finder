# METRO-11 workspace evidence

Date: 2026-11-03. Base: `92739bd32ba948106d600a4f73fcf6deb0036a8b`. Ticket branch: `codex/metro-11-workspace`; integration target: `feature/metro-rebuild`. See [bounded plan](../superpowers/plans/2026-11-03-metro-11-workspace.md) and [development](../development.md).

## Exact versions and provenance

**Confirmed / Repo-verified:** `mise.toml` pins Bun 1.4.0 and Node 24.22.2. Root/app manifests pin all direct versions; `bun.lock` records effective resolutions. Node is needed for Vite/Wrangler/native local runtime tooling; Bun owns installation and tests.

| Component | Pin | Official evidence checked |
| --- | --- | --- |
| Bun | 1.4.0 | [Release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0); Context7 `/oven-sh/bun/bun-v1.4.0`: workspaces and frozen installs |
| Node | 24.22.2 | [Official distribution index](https://nodejs.org/dist/index.json): exact LTS Krypton release; installed executable version |
| Vite | 8.3.5 | [Registry metadata](https://registry.npmjs.org/vite/8.3.5): Node `^20.19.0 || >=22.12.0`; Context7 `/vitejs/vite/v8.3.5`: build, JSX configuration |
| React / React DOM | 19.3.1 | [React metadata](https://registry.npmjs.org/react/19.3.1), [DOM metadata](https://registry.npmjs.org/react-dom/19.3.1): matching peer; Context7 `/react/react/v19.3.1`: client createRoot |
| Hono | 4.13.14 | [Metadata](https://registry.npmjs.org/hono/4.13.14); Context7 `/honojs/hono/v4.13.14`: app.get, JSON, Workers default export |
| TypeScript | 6.0.2 | [Metadata](https://registry.npmjs.org/typescript/6.0.2); Context7 `/microsoft/typescript/v6.0.2`: bundler resolution, noEmit, explicit types |
| Wrangler | 4.156.2 | [Metadata](https://registry.npmjs.org/wrangler/4.156.2): Node >=22; [official requirements](https://developers.cloudflare.com/workers/wrangler/install-and-update/); Context7 `/cloudflare/workers-sdk` main docs: config, local API, dry-run |
| Playwright | 1.64.1 | [Metadata](https://registry.npmjs.org/playwright/1.64.1): Node >=20; installed Chromium runtime smoke |
| Types | Bun 1.4.4; React/DOM 19.3.0 | Exact official registry metadata and installed lock; DOM peer matches React types |

**Context7-verified:** package docs above informed configuration. **Web-verified:** exact official metadata/release pages confirmed version availability/engine/peer ranges. Versions were chosen as a compatible tested set, not a claim that each is newest. Wrangler Context7 docs were unversioned main; exact 4.156.2 installed declarations (`wrangler-dist/cli.d.ts`) confirmed `unstable_startWorker`, `ready`, `url`, `dispose` and options before execution. Vite installed types confirmed both dev/preview servers expose `close()`. Local mise was 2026.5.15; queried mise docs were 2026.10.21, so actual explicit-tool install/exec execution is the local compatibility evidence, not a version-matched documentation claim.

## Behavior and execution

**Confirmed / Repo-verified:** watched RED before implementation: Bun ran 9 behavioral checks; 1 positive boundary fixture passed and 8 failed. The synthetic result was undefined; forbidden imports/dependency declarations were incorrectly accepted. GREEN: 9 pass, 0 fail; exact result and negative assertions retained. Tests use the public core result and temporary boundary-fixture inputs; no framework mocks. The initial RED checks were grouped for this cohesive scaffold rather than a claim of one-test-at-a-time cycles.

`bun run check` passes core AST guard, all nine Bun tests, root TypeScript check and standalone ES-only core check. Fixtures reject Hono static import, React re-export, Cloudflare dynamic import, Node require, an escaping app import, computed import and declared dependencies; pure relative imports pass.

`bun run build` passes Vite production bundling and Wrangler `deploy --dry-run --outdir dist` with no bindings/upload. `bun run smoke` runs Chromium against built web and real local workerd: document HTTP 200, expected heading and shared result, no page/console errors, Worker exact JSON HTTP 200 and unknown route 404. Servers/browser dispose after execution. Browser revision: Chromium 156.0.8078.4, Playwright revision 1248.

Preparation verification passes 30 reviewed skill hashes and two ticket fixtures. Its 11 negative cases still pass: criterion/seam omission, unknown/cyclic/reversed blocker, identity drift, duplicate ticket, scope loss, hash drift, missing skill and path escape. Added support-file hashes cover actual Superpowers references plus installed Bun/Context7 guidance; no installed skills were edited.

Fresh staged-source export `C:/Users/Tashfiq/metro11-verify-20261103` passed frozen bootstrap (63 packages), check, build, built smoke and dev HTTP/browser checks. Before installation, `.git`, `node_modules`, `.local`, both app build directories and Worker state were absent. External pinned tools/browser cache were reused; this is not a cold-cache/offline claim. A deliberate Vite manifest change to 8.3.4 made frozen bootstrap fail with `lockfile had changes, but lockfile is frozen`; the manifest was then restored. Export lock SHA256 stayed `928C09DF600F5ADA170AEB1A89FAF5F66474839DC247EB01FC3AAD5A09173933` before/after. Exact commands, environment and output summaries are recorded in the task report. No legacy source/ancestry is imported.

## Limits and observed tooling issues

**Confirmed:** managed execution initially supplied changing temporary/profile directories: unqualified mise installation inherited unrelated global tool requests; it was interrupted. Scoped explicit installation into ignored stable `.local` solved tool persistence. Restricted Bun package extraction returned EBADF despite stable temporary storage; authorized native execution succeeded. These failures were environment setup issues, not passing bootstrap evidence. Vite cleanup initially had a redundant unreachable fallback; installed types exposed it and it was removed before GREEN root check.

Wrangler dry-run printed its telemetry notice despite `send_metrics: false`; no deployment occurred. `unstable_startWorker` is a version-pinned local API and a maintenance limitation. Builds and local execution do not prove hosted Cloudflare behavior, browser coverage beyond Chromium, product parity, full accessibility, security review, comprehensive import policy, CI/protection enforcement or release readiness. METRO-12/13/14 retain those scoped responsibilities. No GitHub default/protection/deployment/release mutation was made by the implementer.

**Unknown:** platform compatibility outside this Windows host; hosted smoke; future branch transition outcome. Main preparation, review disposition, integration SHA and remote state are controller-owned evidence, not claimed by local scaffold tests.
