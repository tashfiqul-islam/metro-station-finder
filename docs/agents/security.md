# Security, permissions and location

Read on secrets, coordinates, permissions, external input or provider changes. Inspect affected call sites and config; (legacy baseline `af903d7`) [script loader](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/loadGoogleMapScript.ts) illustrates browser provider access, not a security audit.

Use synthetic data in evidence. Do not record personal locations, addresses, credentials or secret-bearing request URLs. Public browser configuration is visible to clients; verify provider restrictions and handling against official docs for an authorized change, never claim secrecy from an environment-variable name. Contract/permission changes need explicit scope.

Specify validation and observable denial/provider-failure behavior; avoid silent catch-and-continue paths. Do not introduce logging of sensitive inputs while diagnosing. `bun run scan` audits dependencies (`bun audit`) and scans tracked files for secrets with the pinned Gitleaks, locally and in the CI `security` job. The scan refuses tracked symlinks and submodules except a symlink whose target is a plain relative name of another tracked regular file (read from the git object, never followed outside the repository), such as `CLAUDE.md` pointing at `AGENTS.md`; the target is scanned as itself (see [quality gates](quality-gates.md)).

## Secret scan reads the index (METRO-28)

Accepted decision (owner ticket METRO-28, "checks exactly what is committed"): the working-tree scan reads the git index, not the working tree. This narrows what it sees on purpose.

- Mechanism: `scripts/secrets.ts` lists `git ls-files -s` and copies each blob into a temporary directory with `git cat-file --batch`, chunked by size (`CHUNK_BYTES`, 64 MiB; one oversized blob gets its own chunk) so memory is bounded by one chunk. It never opens a tracked file in the working tree, so a working-tree symlink (an unstaged typechange) cannot make it read outside the repository. Git runs with `--no-replace-objects`, so a local `refs/replace` entry cannot change the scanned bytes. Each entry is staged under its listing position (`<n>/<path>`), so paths that differ only by case cannot overwrite each other on a case-insensitive disk.
- What each caller covers:
  - Pre-commit hook: does not run the scan (it runs `check:fast`: format and lint).
  - Pre-push hook (`bun run scan`): scans the current index of the local repository. It does not scan the commits being pushed, so a secret present in a pushed commit but absent from the current index is not seen here. Unstaged edits are not seen either.
  - CI `security` job (`bun run scan`): scans the index of a clean checkout. For a pull request that checkout is the PR merge commit, so the index equals the merged tree.
  - `bun run scan:history` (`--history`, CI with `fetch-depth: 0`): Gitleaks over the full Git history of the clone, redacted. This is the control for a secret present in any commit but absent from the current tree.
- Not covered: a secret only in an unstaged working-tree edit (not scanned until staged; tested), untracked files (never in scope), and a secret present in a pushed commit but absent from the current index (covered only by the history scan in CI).
- Contents are the stored bytes: no line-ending conversion, smudge or textconv (a Git LFS pointer is scanned as the pointer text). Tested at function level: with `core.autocrlf=true` the index holds LF while the working tree holds CRLF, and the scan reads the LF bytes. A file deleted from the working tree, a sparse-checkout (skip-worktree) path or an intent-to-add entry (scanned as the empty blob) follows the index, not the disk.
- An unmerged index (conflict stages 1-3) fails visibly rather than scanning one stage; resolve the conflict first. Missing or non-blob objects, size changes and truncated `cat-file` output also fail visibly. `METRO_SECRETS_CHUNK_BYTES` (positive integer) overrides the chunk size for tests only; it changes chunking, not detection.
- Git behaviour checked against the official `git cat-file` and `git ls-files` manuals (Web-verified 2026-11-04): `--batch` prints `<oid> SP <type> SP <size> LF <contents> LF` and `<object> SP missing LF`; filters apply only with `--filters`/`--textconv`; `ls-files -s` prints `<mode> <object> <stage> <file>` with one line per unmerged stage.
- A passing scan is not a security clearance: it does not cover application logic, permissions or runtime configuration.

## Response headers (METRO-31)

Static assets get headers from `apps/web/public/_headers` (Cloudflare applies it to asset responses only) and `/api/*` from `hono/secure-headers` in `apps/api/src/app.ts`. CSP is Report-Only until the first Maps slice; HSTS without `preload` waits for the custom domain. Referrer policy is `strict-origin-when-cross-origin` because the Maps key is referrer-restricted. Rationale, sources and unverified items: [ADR-0011](../adr/0011-security-headers.md).

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
