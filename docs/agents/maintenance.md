# Maintenance

Status: Repo-verified tool configuration; hosted gates and remote branch rules require separate verification.

Use Bun and exact pins in `mise.toml`, package manifests and `bun.lock`. Run `mise install`, then `mise exec -- bun run bootstrap`. Frozen bootstrap validates runtime pins before installing the locked graph. Do not use generic global-tool installs as evidence of project compatibility.

Install hooks per checkout with `mise exec -- hk install --mise`. Repeat for linked worktrees. hk 2.11.0 and Pkl 0.32.2 use the matching pinned `hk.pkl` schema. Preserve staged-snapshot stashing and failure restoration when changing hook policy. Verify real hooks in disposable Git fixtures; never alter the caller index/worktree to manufacture test cases. Any test or script that runs `git` against a fixture must use `cleanGitEnv()` from `scripts/git-env.ts` so hook-exported `GIT_*` variables cannot redirect it.

Gate commands and required remote policy are documented in [quality gates](quality-gates.md). Keep workflow job context `Quality gates` stable; coordinate required-check policy before renaming. CI uses pinned actions/checkout v7.0.1 and jdx/mise-action v5.2.5 commits, with mise 2026.10.25. Verify official release commits before updates; preserve read-only permissions and disabled persisted credentials.

Updates require frozen install, canonical checks, real hook regression tests and independent review. Keep TypeScript 7 compiler settings and the documented TypeScript 6 dependency-parser seam intact. Never relax budgets, assertions or thresholds to obtain green gates. Secret and dependency scans run through `bun run scan`; inspect failures before changing exclusions.

There is no deployment or rollback automation in this ticket. Integration targets `feature/metro-rebuild`; no default-branch switch, preview, production deployment or release is authorized by a gate pass. Use a reviewed revert for bad changes, preserving independent rebuild history and signed commits.
