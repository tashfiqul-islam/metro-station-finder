# METRO-86 moved text: security

Moved from docs/agents/security.md at revision db8d5e5 on 2026-11-06 (METRO-86). Repo-verified: the text below is copied from that revision with three mechanical changes only: relative links were retargeted so they resolve from docs/evidence/, headings were demoted two levels under each source heading, and a few in-page anchors or section references to moved text were repointed. No sentence was reworded, so its original dates, labels (Confirmed, Repo-verified, Web-verified, Unverified) and ticket references keep their original meaning. The rules in force live in [security.md](../agents/security.md). Frozen after this ticket.

## From security.md, lines 3-3

Read on secrets, coordinates, permissions, external input or provider changes. Inspect affected call sites and config; (legacy baseline `af903d7`) [script loader](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/loadGoogleMapScript.ts) illustrates browser provider access, not a security audit.

## From security.md, lines 11-23

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

## From security.md, lines 31-35

- The root `package.json` declares `"trustedDependencies": []`, so no dependency runs a lifecycle script on install.
- Without the field Bun runs scripts for packages on its built-in default list. Declaring the field, even empty, replaces that list ([Bun lifecycle docs](https://bun.com/docs/pm/lifecycle), Web-verified 2026-11-04).
- `package.json` is authoritative and is enforced by the repository gate (`scripts/configuration.ts`). `bun.lock` records the value for information and diffs; it is not an enforcement point.
- Repo-verified 2026-11-04 (Bun 1.4.4, disposable directory outside the repository): with a lockfile generated without the field and `"trustedDependencies": []` added to `package.json`, `bun install --frozen-lockfile` exited 0, printed `Blocked 1 postinstall` and `bun pm untrusted` listed `esbuild@0.28.2`; the lockfile was not updated. Still regenerate the lockfile with `bun install` when it disagrees with `package.json`.
- `esbuild` and `workerd` have blocked `postinstall` scripts. Build, tests and the Playwright smoke pass without them.

## From security.md, lines 41-41

- Accepted gap: nothing fails automatically when a future dependency needs its install script. Bun only prints "Blocked N postinstall" and `bun pm untrusted` lists them, so a reviewer should run it whenever dependencies change.
