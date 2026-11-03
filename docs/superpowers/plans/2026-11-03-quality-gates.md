# METRO-12 implementation plan

Spec: docs/specifications/quality-gates.md.

## Global Constraints

- Preserve independent rebuild history and strict TypeScript 7 settings.
- Use Bun, exact verified compatible stable pins and canonical commands shared by hooks and CI.
- Fail visibly; never weaken assertions, thresholds or policy to pass.
- Keep work within METRO-12. No default-branch switch, preview deployment or release.
- Merge only after checks and independent review; target feature/metro-rebuild; delete ticket branch after merge.
- Signed commits only. Controller owns remote operations and Plane transitions.

## Task 1: executable local gates

Implement canonical quality tasks and their negative acceptance checks. Inspect relevant source and existing tests before edits. Add exact verified Oxlint/type-aware companion, Knip, dependency-cruiser and axe dependencies; pin Gitleaks in mise. Candidate release evidence: oxlint 1.90.0, oxlint-tsgolint 7.0.2005, knip 6.44.1, dependency-cruiser 18.7.2, @axe-core/playwright 4.14.0, Gitleaks 8.30.1. Validate compatibility, do not assume metadata is sufficient.

Files: package.json, bun.lock, mise.toml, narrowly scoped lint/unused/import configuration, scripts for gates and tests, smoke accessibility coverage, configuration tests when pins extend their contract, and docs/evidence/metro-12.md. Preserve existing strict compiler projects and the intentional TypeScript 6 parser seam. Do not add product data/features; validate existing domain boundary with malformed fixtures. Bundle budget must measure real production output and explain initial threshold. Dependency scan fails on findings/network/tool errors; no silent suppression. Secret scan covers tracked source without scanning installed dependencies, and demonstrates rejection using generated fake credentials in a temporary repository. Formatting covers supported tracked source/config without claiming TOML formatting unsupported by the formatter.

Add meaningful rejection tests that execute actual gates for invalid import/cycle, type error, malformed data and fake secret. Use temporary fixtures, clean them safely, and avoid embedding scan-triggering literals in tracked files. Run focused tests while iterating, then canonical check/build/browser/bundle/scan tasks once. Document command results and limitations. Do not implement hk or CI yet; expose commands suitable for fast pre-commit, broader pre-push and CI. Self-review and signed commit; report exact results.

## Task 2: hooks and authoritative CI

Consume Task 1 canonical commands. Pin hk 2.11.0 and pkl 0.32.2 after compatibility verification. Add documented hook installation, fast pre-commit and broader pre-push. Exercise partial staging, failed gate restoration and linked worktree installation with a temporary Git fixture; never alter the user's existing working files/index for tests.

Add least-privilege SHA-pinned GitHub Actions for relevant pull requests and integration pushes, frozen install and canonical gates. Required aggregate must always run and reject every required job result except success, including missing/skipped/cancelled. Add focused aggregate outcome tests. Keep action revisions backed by official release evidence. Add protected gate-policy ownership/review config aligned with repository owner and document external rules required. Update quality-gate guidance and evidence with actual checks; controller verifies remote enforcement and hosted CI.

## Completion

Fresh task review after each implementation; broad final review; signed push and PR to feature/metro-rebuild; hosted checks and policy readback; merge only when solid; delete local/remote ticket branch; Plane Done with evidence. External permission gaps must remain explicit.
