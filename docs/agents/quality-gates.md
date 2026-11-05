# Quality gates

Status: Repo-verified configuration. Hosted execution and remote enforcement require controller verification.

Use `mise install --locked`, then `mise exec -- bun run bootstrap` for the exact tool pins and frozen dependencies. Install repository hooks with `mise exec -- hk install --mise` in each checkout, including linked worktrees. This writes local Git hook configuration (Git 2.54+) or legacy shims; it does not enforce remote policy. Keep mise available on PATH. No global hook install required.

`hk.pkl` pins schema 2.11.0; mise pins hk 2.11.0 / Pkl 0.32.2. Pre-commit stashes unstaged edits, runs canonical `bun run check:fast` against the staged snapshot, then restores edits on success or failure. It never auto-fixes or stages changes. Format and lint also read untracked files, so unrelated untracked scratch files can fail pre-commit; this fails safe. Pre-push runs canonical `check`, `build`, `smoke`, `bundle:check` and `scan`. A `commit-msg` hook runs `scripts/commit-message.ts` and rejects subjects that are not Conventional Commits (`feat|fix|refactor|docs|test|chore|perf|ci|style|build|revert`, optional scope and `!`); Git merge and revert subjects pass. The same script rejects a `Signed-off-by` trailer whose email is an AI agent address; it does not require the `Co-Authored-By` trailer (see the [attribution policy](attribution.md), METRO-52). CI validates every commit message in the PR range with the same script (`--range base..head`). Hooks are local feedback and can be bypassed; CI is authoritative.

`.github/workflows/quality.yml` runs on pull requests targeting `feature/metro-rebuild` or `main`, and integration pushes to `feature/metro-rebuild`, without path filters (documentation-only pull requests skip build and preview inside the workflow, see below). A `changes` job plus three required jobs run frozen bootstrap plus check, build/browser smoke/bundle, and dependency/secret scans. The separate `Reviewer record` workflow (`.github/workflows/reviewer-record.yml`, kept out of `quality.yml` so a body edit cannot cancel a running preview) fails a pull request whose body lacks a real `Reviewer` section; it is not part of the aggregate but is its own required status check: the rulesets for `feature/metro-rebuild` and `main` require both `Quality gates` and `Reviewer record`, and the pull request body needs a `## Reviewer` section with a reference (see [independent review](workflow.md#independent-review)). The always-running `Quality gates` aggregate requires `changes`, `checks`, `build` and `security` to be present and accepts only explicit success for every job in `needs`, so a job added later cannot fail silently. Missing, cancelled, skipped or failed results fail the aggregate; the one exception is a docs-only skip of `build`. Actions use immutable full SHA pins, job-level read-only contents permission and no persisted checkout credentials. The Bun install cache is keyed on `bun.lock` and the Playwright browser cache on the Playwright version. There is no deployment job.

## Documentation-only pull requests (METRO-62)

The `changes` job runs `scripts/changed-files.ts`, which lists the pull request's files (`git diff --no-renames base...head`, so a move lists both paths) and sets `docs_only=true` only when the event is `pull_request`, the list is non-empty and every path is markdown at the repository root or under `docs/` (the allow-list `reviewer-record.ts` already uses, matched case-sensitively). Everything else is `false`: workflows, `scripts/`, manifests, lockfiles, config, `e2e/`, `apps/`, `packages/` (package READMEs included), non-markdown files under `docs/` (JSON, images), an empty diff, other events, bad commit ids and any error. `Build and smoke` and `Cloudflare preview` run only when `docs_only != 'true'`, so anything other than the exact string runs them. `Checks` and `Security` always run, so the docs tests, link gate and secret scans still cover a docs change.

`Quality gates` still always runs and now needs `changes`, `checks`, `build` and `security`. `scripts/ci-results.ts` accepts a skipped `build` only when `changes` succeeded and reported `docs_only` as exactly `true`; an unexpected skip, a failure or cancellation of any job, or a `changes` that failed or was skipped fails the aggregate.

Failure modes, deliberately fail-closed. If the detection script errors (git failure, bad commit ids), it prints `docs_only=false` and the full run happens. If the `changes` job itself fails (checkout, mise, network), `build` and `preview` are skipped by their implicit `success()` condition and `Quality gates` fails; re-run the workflow. That never merges unbuilt code, so `build` must not use `always()` or `!cancelled()`; a test in `scripts/changes-workflow.test.ts` keeps that intentional.

Why not a workflow-level `paths` or `paths-ignore` filter. Web-verified 2026-11-05 from docs.github.com: a workflow skipped by path filtering leaves its required checks "Pending" and blocks merging, and GitHub advises against requiring workflows that can be skipped; a job skipped by a conditional reports "Success" (troubleshooting required status checks). The workflow syntax reference for `jobs.<job_id>.needs` says "If a job fails or is skipped, all jobs that need it are skipped, unless the jobs use a conditional expression that causes the job to continue" and names `always()`; the contexts reference lists `needs.<id>.result` as `success`, `failure`, `cancelled` or `skipped`. Unverified until the first documentation-only pull request after METRO-62 runs on GitHub: that the hosted run shows `Build and smoke` and `Cloudflare preview` as skipped and `Quality gates` green. Build inputs: nothing the build, smoke or bundle check consumes reads `docs/` or `*.md` (Repo-verified: `apps/api/src/app.ts` mentions a docs path only in a comment). `reviewer-record.yml` is unchanged. Extend the allow-list only with a reviewed change and a test in `scripts/changed-files.test.ts`.

External branch rules must require both exact checks, `Quality gates` and `Reviewer record`, from GitHub Actions on `feature/metro-rebuild` and on `main`, an up-to-date branch, pull requests, signed commits, resolved conversations, and no force-push/deletion or bypass. CODEOWNERS identifies @tashfiqul-islam for gate policy. CODEOWNERS alone does not enforce reviews: requiring owner approval needs a separate eligible reviewer, since the sole owner cannot approve their own PR. Controller records the actual remote rule and any approval gap; do not claim that local configuration enforces it.

Canonical checks: `bun run check:fast` (format/type-aware lint), `bun run check` (fast checks, boundaries, import graph, Knip, link gate, Worker binding type freshness via `types:check` (`wrangler types --check`), workflow lint with actionlint, zizmor and a named-steps rule (every step needs a `name:`) via `lint:workflows`, Renovate config validation via `renovate:check`, tests, coverage scope, and the TypeScript gate `tsc -b` over the solution file (`bun run typecheck`: all eight projects in one command, `erasableSyntaxOnly` on), `bun run build`, `bun run smoke`, `bun run bundle:check`, `bun run scan`. Browser smoke (Playwright Test) requires `mise exec -- bun run playwright install chromium` locally; CI installs Chromium, Firefox and WebKit with `--with-deps` for system libraries and runs every project. `check` runs `bun test` with a per-file 90% line and function coverage threshold and writes `coverage/lcov.info`, which CI uploads as an artifact; a failed smoke uploads the Playwright report and traces. Smoke may start local services; no preview or release follows.

Focused tests cover aggregate result semantics and actual installed hooks in disposable Git repositories, including partial staging, failure restoration, linked worktrees, and pre-push blocking and allowing a push to a local bare remote. Fixture processes run without inherited `GIT_*` variables (`scripts/git-env.ts`), because Git exports `GIT_DIR` to hooks in linked worktrees and fixtures would otherwise write into the caller's repository. See [METRO-12 evidence](../evidence/metro-12.md). Report exact revision, commands and outcomes; a local pass is not hosted CI proof.

## Hook bypass policy (METRO-51)

Hooks are local feedback; CI is authoritative. No bypass is the default. Agents never bypass hooks or signing: fix the failure instead. Never use `git commit --no-verify` or `git push --no-verify`, and never turn off commit signing.

The one documented exception is an owner-only emergency skip of a single named step, for example when a pre-push step cannot run locally during a tool outage. It never replaces CI: the pull request must still pass `Quality gates`, and the skipped step is listed under "Checks not run". The step names are in `hk.pkl` (`fast`, `conventional`, `check`, `build`, `scan`). Set the variable for that one command only, never in a profile, `git config` or `.hkrc.pkl`, which would persist it.

```powershell
$env:HK_SKIP_STEPS = 'build'; git push; Remove-Item Env:HK_SKIP_STEPS
```

```sh
HK_SKIP_STEPS=build git push
```

hk documents `HK_SKIP_STEPS` as a comma-separated list of step names skipped when running the pre-commit and pre-push hooks, also settable through `git config hk.skipSteps` and `.hkrc.pkl`, with all sources unioned (Context7-verified against <https://hk.jdx.dev/environment_variables.html> and <https://hk.jdx.dev/configuration.html>, 2026-11-05). Unverified: how it interacts with `commit-msg` steps, and that a step name is matched across hooks.

## Verify signatures locally (METRO-51)

The rulesets require signed commits, and GitHub's "Verified" badge is authoritative; a local check is a convenience. Inspect your settings with:

```sh
git config --get gpg.format
git config --get commit.gpgsign
git config --get gpg.ssh.allowedSignersFile
git verify-commit HEAD
```

With `gpg.format` set to `ssh`, git trusts a signature only when the signer's public key is listed in the file named by `gpg.ssh.allowedSignersFile` (one line per principal and key, as in ssh-keygen "ALLOWED SIGNERS"); otherwise the trust level is undefined and `git verify-commit` fails (Context7-verified against the git-config documentation, <https://git-scm.com/docs/git-config>, 2026-11-05). A GPG signature, such as GitHub's web-merge commits, needs the signer's public key in the local keyring instead, so "Can't check signature: No public key" is a local keyring gap, not proof of a bad signature (Inferred).
