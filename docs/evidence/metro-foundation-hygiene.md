# METRO-19 evidence: foundation hygiene

Ticket METRO-19 (`hygiene`), parent METRO-18. Specification `metro-foundation-completion` revision `2026-11-03-r1` ([mirror](../specifications/foundation-completion.md)). Date 2026-11-03.

- Base: `827d0a7` (`feature/metro-rebuild`). Implementation head before review fixes: `3ffe135`; the PR head is the final commit.
- Environment: Windows 11, PowerShell 7, mise-pinned Bun 1.4.4 and Node 26.13.0.

## Baseline

**Confirmed:** on first run the baseline `check` failed at `format:check` for 9 tracked files whose working-tree copies had CRLF line endings while the Git index held LF (global `core.autocrlf=true`; `git diff` was empty). With owner approval the 9 files were rewritten from the index (no content change). Baseline then passed: 127 tests, `check` about 22 s. This is a local checkout artifact, not a repository defect, and no policy changed.

## Criterion to evidence

| Criterion             | Evidence                                                                                                                                                                                                                                                                                                                                                                   | Result |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FND-H1 link gate      | `scripts/links.test.ts` (12 tests: missing file with `file:line`, missing anchor, external/mailto/fenced/inline skipped, reference definitions, root escape, percent-decoding, non-Markdown anchors, GitHub slugs, duplicate headings, balanced parentheses). `bun run links:check` is part of `check`: "Links ok: 45 Markdown files".                                     | Pass   |
| FND-H2 stale guidance | `scripts/repository.test.ts` scans README, `docs/development.md` and `docs/agents/*.md` for `pending METRO-12`, `proposed checks`, `not available verified gates`, the `src/` layout and the old UI sentence. Snippet verbatim with the three reviewed roots: `verify-metro-preparation.ps1` PASS (35 skill files), `test-metro-preparation.ps1` PASS (11 negative cases). | Pass   |
| FND-H3 ADRs           | `docs/adr/0000-template.md`, `0001-foundation-baseline.md` (Status: Accepted); linked from `architecture.md` and `domain.md`; test asserts both and the link gate covers them.                                                                                                                                                                                             | Pass   |
| FND-H4 licensing      | `LICENSE` equals the exact MIT text in a test; manifest `"license": "MIT"`; `SECURITY.md`, `CONTRIBUTING.md`, PR template linked from README (test).                                                                                                                                                                                                                       | Pass   |
| FND-H5 `CLAUDE.md`    | Test asserts content is exactly `@AGENTS.md`.                                                                                                                                                                                                                                                                                                                              | Pass   |
| FND-H6 Gitleaks pin   | `scripts/tool-pins.ts` reads `tools.gitleaks`; `secrets.ts` uses it; tests: derived version from a temporary mise file, missing pin fails with `tools.gitleaks`, non-exact pin fails, `secrets.ts` has no `gitleaks@<digit>` literal, every mise task needs a `description` (`tasks.scan.description`).                                                                    | Pass   |

Scope items 6 and 8 (`.vscode/`, CODEOWNERS) are files without a dedicated test; CODEOWNERS now lists `CLAUDE.md`, `LICENSE`, `SECURITY.md`, `.vscode/`, `docs/adr/` and the PR template.

## RED and GREEN

**RED (base, Repo-verified):**

- FND-H2 snippet on base: `Missing skill root: tooling`.
- `scripts/links.test.ts` and the H6 tests failed before implementation (`Cannot find module './links'`; `Export named 'gitleaksVersion' not found`).
- `scripts/repository.test.ts` copied onto an export of `827d0a7`: 0 pass, 8 fail.

**GREEN:** after implementation the focused suites pass; full `check`: 151 tests, 0 failures, 12 files, `check` about 20 s.

## Commands (final tree)

| Command                                                                              | Result                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `mise exec -- bun run check`                                                         | pass (151 tests; links 45 files; typecheck, knip, import graph, boundaries) |
| `mise exec -- bun run build`                                                         | pass (Wrangler dry run, nothing uploaded)                                   |
| `mise exec -- bun run smoke`                                                         | pass (Chromium, Worker 200 and 404)                                         |
| `mise exec -- bun run bundle:check`                                                  | pass, 219788 raw / 67984 gzip, budget unchanged (250000 / 80000)            |
| `mise exec -- bun run scan`                                                          | pass (no vulnerabilities in 311 packages; no leaks found)                   |
| both `scripts/*-metro-preparation.ps1` with roots `superpowers`, `pocock`, `tooling` | pass                                                                        |

## Findings made while implementing

- The new link gate found a real defect in the first ADR template draft (placeholder link `NNNN-title.md`); fixed by using plain text.
- `Bun.TOML` is unavailable where the secret scan runs (Node), and the scanned root need not contain `mise.toml`. The pin is therefore read from the script's own repository through a small Node-safe module, `scripts/tool-pins.ts`, which reads the flat `[tools]` table. `validateConfiguration` still parses the whole file with the Bun TOML parser and enforces the pin.

## Verification labels

- **Context7-verified:** Oxc VS Code extension ID `oxc.oxc-vscode`, `editor.codeActionsOnSave` key `source.fixAll.oxc` and `oxc.typeAware` (Oxc website docs).
- **Web-verified (weak):** `EditorConfig.EditorConfig` marketplace page exists; the fetched summary gave only display name and publisher.
- **Unverified:** the VS Code settings were not exercised in an editor.

## Unrun checks and Unknowns

- Hosted `Quality gates` has not run until the PR exists (recorded on the PR and ticket).
- Hook behavior was exercised by the real pre-commit hook during signed commits, not by new tests.
- The owner has not yet confirmed the license holder name (`Tashfiqul Islam`), as the spec requires.
- Commit-by-commit intermediate states are not each green (the repository test depends on files added in later commits); the PR as a whole is.

## Review disposition

Independent review by a fresh-context agent over `827d0a7..HEAD` (read-only; some of its probes were denied, so items marked "reading" were not executed). No Critical findings.

| #   | Severity  | Finding                                                                                                                                                                        | Disposition                                                                                                                              |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Important | Evidence file untracked                                                                                                                                                        | Fixed: committed with this change.                                                                                                       |
| 2   | Important | `typescript.tsdk` pointed at TypeScript 7, which ships no `tsserverlibrary.js` (Repo-verified: `node_modules/typescript/lib` holds only `tsc.js`, `getExePath.*`, `version.*`) | Fixed: now `node_modules/@typescript/typescript6/lib`, which contains `tsserverlibrary.js`. Editor behavior still unexercised (Unknown). |
| 3   | Important | Playwright install has a `--with-deps` variant in CI                                                                                                                           | Accepted: one documented command; CI adds `--with-deps` for system libraries and the guide says so.                                      |
| 4   | Minor     | `[a](x(1).md)` mis-parsed                                                                                                                                                      | Fixed with RED test, then regex allowing balanced parentheses.                                                                           |
| 5   | Minor     | Undefined reference uses, setext headings and HTML anchors not handled                                                                                                         | Deferred: no current file needs them; gate would fail visibly (false failure, not false pass) for setext/HTML anchors.                   |
| 6   | Minor     | Root file named `..x.md` flagged as escape                                                                                                                                     | Accepted: edge case, fails visibly.                                                                                                      |
| 7   | Minor     | `import.meta.main` needs recent Node                                                                                                                                           | Accepted: Node is pinned to 26.13.0.                                                                                                     |
| 8   | Minor     | Source-text assertion in secrets test mirrors implementation                                                                                                                   | Accepted: the derived-version test is the behavioral evidence.                                                                           |
| 9   | Minor     | Regex TOML read in `tool-pins.ts`                                                                                                                                              | Accepted: documented; `validateConfiguration` re-validates with the real parser.                                                         |
| 10  | Minor     | README test uses `toContain`                                                                                                                                                   | Accepted: the link gate covers link validity.                                                                                            |
