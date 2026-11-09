# Security, permissions and location

Read when: touching secrets, coordinates, permissions, external input, response headers, scans or dependency install scripts.

## Rules

- Use synthetic data in code, tests, fixtures and evidence. Record no personal locations, addresses, credentials or secret-bearing URLs. Public browser configuration is visible to clients: verify provider restrictions against official docs for an authorized change and never claim secrecy from an environment variable name. Contract and permission changes need explicit scope.
- Specify validation and observable denial and provider-failure behavior; no silent catch-and-continue. Never log sensitive inputs while diagnosing. A passing scan is not a security clearance: it does not cover application logic, permissions or runtime configuration.
- `bun run scan` runs `bun audit` and the pinned Gitleaks over tracked files, locally and in the CI `security` job. It refuses tracked symlinks and submodules except a symlink to a plain relative name of another tracked regular file (such as `CLAUDE.md` to `AGENTS.md`), which is scanned as itself.
- The working-tree scan reads the Git index (`ls-files -s` plus `cat-file --batch`), never the working tree, so an unstaged change or a working-tree symlink cannot redirect it. It does not see a secret only in an unstaged edit or an untracked file, nor one in a pushed commit absent from the current index. Pre-commit does not scan; pre-push and CI scan the index (in CI the merged tree). `bun run scan:history` (CI, full clone) is the control for any commit. An unmerged index, a missing object or truncated output fails visibly; resolve the conflict first.
- Static assets get headers from `apps/web/public/_headers` and `/api/*` from `hono/secure-headers` in `apps/api/src/app.ts`. The CSP is enforced with exact Google hosts (METRO-88; add a host only with evidence from the owner-run [live check](maps-live-check-runbook.md)), and HSTS has no `preload` until the custom domain. The Maps key is `VITE_GOOGLE_MAPS_API_KEY`: never read or print it. Referrer policy is `strict-origin-when-cross-origin` because the Maps key is referrer-restricted ([ADR-0011](../adr/0011-security-headers.md)).
- Service worker ([ADR-0024](../adr/0024-offline-app-shell.md)): `sw.js` handles same-origin GET only and never `/api/*`, another origin or a URL with a query string, so a position or place text is never cached. `/sw.js` is served uncached and a missing one is a 404, never `index.html`. A test with a worker allowed must not provoke a Google request: stubs do not apply to it in every browser ([testing](testing.md)).
- Install scripts: the root `package.json` keeps `"trustedDependencies": []`, so no dependency lifecycle script runs (declaring the field, even empty, replaces Bun's default list). `esbuild` and `workerd` `postinstall` are blocked and not needed by build, tests or smoke. To trust a package: add its exact name to the array and to `REVIEWED_TRUSTED_DEPENDENCIES` in `scripts/configuration.ts` in one change, run `bun install`, run `mise exec -- bun pm untrusted` to confirm it left the blocked list, re-run build and tests, and record why in the PR. Run `bun pm untrusted` whenever dependencies change: nothing fails when a future dependency needs a script.
- Untrusted agent input is in [untrusted input](untrusted-input.md); logging limits are in [observability](observability.md).

## Enforced by

- `scripts/secrets.ts`, `scripts/secrets-index.ts` and their tests: fail on a detected secret, an unsafe tracked link or an unreadable index. Fix the content; never widen exclusions to pass.
- `scripts/configuration.ts` (in `check` and bootstrap): fails when `trustedDependencies` is removed, is not a string array or differs from the reviewed list.
- `e2e/offline-shell.e2e.ts`, `apps/web/src/sw/*.test.ts`: fail if the worker caches an `/api/*` answer or a query string, or a worker-allowed test reaches another origin.
- `apps/api/src/security-headers.test.ts`, `apps/web/src/headers.test.ts`, `e2e/headers.e2e.ts`: fail on a changed header policy.

## Read more

- [Moved security detail](../evidence/metro-86-moved-security.md): scan mechanism and chunking, Git behavior checks, install-script experiment.
- [ADR-0011](../adr/0011-security-headers.md), [ADR-0004](../adr/0004-supply-chain-and-ci-policy.md), [SECURITY.md](../../SECURITY.md).
