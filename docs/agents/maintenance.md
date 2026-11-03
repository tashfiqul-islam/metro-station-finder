# Maintenance

Status: Repo-verified tool configuration; hosted gates and remote branch rules require separate verification.

Use Bun and exact pins in `mise.toml`, package manifests and `bun.lock`. Run `mise install`, then `mise exec -- bun run bootstrap`. Frozen bootstrap validates runtime pins before installing the locked graph. Do not use generic global-tool installs as evidence of project compatibility.

Install hooks per checkout with `mise exec -- hk install --mise`. Repeat for linked worktrees. hk 2.11.0 and Pkl 0.32.2 use the matching pinned `hk.pkl` schema. Preserve staged-snapshot stashing and failure restoration when changing hook policy. Verify real hooks in disposable Git fixtures; never alter the caller index/worktree to manufacture test cases. Any test or script that runs `git` against a fixture must use `cleanGitEnv()` from `scripts/git-env.ts` so hook-exported `GIT_*` variables cannot redirect it.

Gate commands and required remote policy are documented in [quality gates](quality-gates.md). Keep workflow job context `Quality gates` stable; coordinate required-check policy before renaming. CI uses pinned actions/checkout v7.0.1, actions/cache v6.1.0 and jdx/mise-action v5.2.6 commits on the `ubuntu-24.04` runner image, with mise 2026.10.25, an empty workflow-level `permissions: {}` and explicit job-level `contents: read`. Verify official release commits before updates; preserve least-privilege permissions and disabled persisted credentials.

Dependency updates arrive as Renovate PRs (`.github/renovate.json5`: bun, mise and github-actions managers, exact pins, action digests with version comments, grouped ecosystems, weekly lock-file maintenance, dependency dashboard). Renovate's `minimumReleaseAge` must equal Bun's `install.minimumReleaseAge` in `bunfig.toml` (259200 seconds, 3 days); `scripts/configuration.ts` enforces it. Security advisories bypass the cooldown. A pin newer than the cooldown needs a stated reason in evidence. The Renovate validator is pinned in `mise.toml` with one scoped trust-policy exception (`@yarnpkg/libzip@3.2.2`, owner-approved 2026-11-03; see [METRO-20 evidence](../evidence/metro-foundation-supply-chain.md)); remove it when upstream publishes provenance again.

Updates require frozen install, canonical checks, real hook regression tests and independent review. Keep TypeScript 7 compiler settings and the documented TypeScript 6 dependency-parser seam intact. Never relax budgets, assertions or thresholds to obtain green gates. Secret and dependency scans run through `bun run scan`; inspect failures before changing exclusions.

There is no deployment or rollback automation in this ticket. Integration targets `feature/metro-rebuild`; no default-branch switch, preview, production deployment or release is authorized by a gate pass. Use a reviewed revert for bad changes, preserving independent rebuild history and signed commits.
