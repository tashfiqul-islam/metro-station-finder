# Security, permissions and location

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read on secrets, coordinates, permissions, external input or provider changes. Inspect affected call sites and config; [script loader](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/loadGoogleMapScript.ts) illustrates browser provider access, not a security audit.

Use synthetic data in evidence. Do not record personal locations, addresses, credentials or secret-bearing request URLs. Public browser configuration is visible to clients; verify provider restrictions and handling against official docs for an authorized change, never claim secrecy from an environment-variable name. Contract/permission changes need explicit scope.

Specify validation and observable denial/provider-failure behavior; avoid silent catch-and-continue paths. Do not introduce logging of sensitive inputs while diagnosing. `bun run scan` audits dependencies (`bun audit`) and scans tracked files for secrets with the pinned Gitleaks, locally and in the CI `security` job. The scan refuses tracked symlinks and submodules except a symlink whose target is a plain relative name of another tracked regular file (read from the git object, never followed outside the repository), such as `CLAUDE.md` pointing at `AGENTS.md`; the target is scanned as itself (see [quality gates](quality-gates.md)). A passing scan is not a security clearance: it does not cover application logic, permissions or runtime configuration.

## Install scripts (METRO-46)

- The root `package.json` declares `"trustedDependencies": []`, so no dependency runs a lifecycle script on install.
- Without the field Bun runs scripts for packages on its built-in default list. Declaring the field, even empty, replaces that list ([Bun lifecycle docs](https://bun.com/docs/pm/lifecycle), Web-verified 2026-11-04).
- `package.json` is authoritative and is enforced by the repository gate (`scripts/configuration.ts`). `bun.lock` records the value for information and diffs; it is not an enforcement point.
- Repo-verified 2026-11-04 (Bun 1.4.4, disposable directory outside the repository): with a lockfile generated without the field and `"trustedDependencies": []` added to `package.json`, `bun install --frozen-lockfile` exited 0, printed `Blocked 1 postinstall` and `bun pm untrusted` listed `esbuild@0.28.2`; the lockfile was not updated. Still regenerate the lockfile with `bun install` when it disagrees with `package.json`.
- `esbuild` and `workerd` have blocked `postinstall` scripts. Build, tests and the Playwright smoke pass without them.
- To trust a package:
  1. Add its exact name to the array and to `REVIEWED_TRUSTED_DEPENDENCIES` in `scripts/configuration.ts` in the same change.
  2. Run `bun install` to update `bun.lock`.
  3. Re-run `mise exec -- bun pm untrusted` and confirm the package left the blocked list; confirm build and tests still pass.
  4. Record why the script is needed and what it does (reviewed against the package source) in the pull request and [maintenance](maintenance.md).
- Accepted gap: nothing fails automatically when a future dependency needs its install script. Bun only prints "Blocked N postinstall" and `bun pm untrusted` lists them, so a reviewer should run it whenever dependencies change.
