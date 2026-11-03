# METRO-12: canonical quality gates

- Identity: METRO-12; revision 1, 2026-11-03.
- Source: Plane work item c5700e9c-db41-4036-a271-561714912fac, module 02.
- Owner approval: repository owner requested implementation, review, integration merge, branch deletion and Done in this chat.
- Baseline: d350c4141f13124acc563c26d47038ffa737ad6b; reproducible scaffold and strict TypeScript already present.
- Outcome: contributors and CI invoke the same checks; invalid changes fail visibly before integration.
- Scope: pinned formatting, type-aware lint, TypeScript, unused-code and import-graph checks; domain/data tests; relevant Worker/browser/accessibility checks; secret and dependency scans; measured bundle budget; hk hooks; required aggregate CI and policy verification.
- Exclusions: product features, deployment/preview, release automation and switching the default branch. Release remains v1.0.0; master remains default until release readiness.
- Contract: nonzero exits propagate. Missing tools, scan failures and absent build artifacts fail. No permissive fallback, broad ignored rules or skipped tests to manufacture success.
- Grouping: module f225309b-c896-4168-a32a-92badc4f6262; release v1.0.0, no release publication in this ticket.
- Domain: existing scaffold contracts and core boundary; see product glossary and feature parity for future behavior.

## Acceptance

1. hk and CI invoke canonical repository tasks. Fast pre-commit and broader pre-push behavior are documented and exercised in an isolated linked worktree, including partial staging and restoration after failure.
2. Actual tools reject an invalid import/cycle, a type error, malformed domain data and a synthetic secret; valid scaffold passes. Fixtures must not contain real credentials.
3. Required aggregate fails for failed, cancelled, missing or unexpectedly skipped required jobs; clean CI succeeds. Tests cover all outcomes.
4. Required merge checks and protected gate-policy review are configured and inspected where account permissions permit. Any unavailable enforcement is explicit evidence, not a claim of protection.
5. Record exact revisions, commands, runtime pins, tool versions, review outcomes and CI results before integration merge and Done.

## Evidence and readiness

Repo-verified baseline: package.json, bun.lock, mise.toml, existing strict projects and 80 passing tests. Context7 documentation inspected for hk, Oxlint, Knip, dependency-cruiser and Gitleaks. Registry/mise release lookups establish candidate pins; compatibility must be checked during implementation. The ticket settles scope; implementation choices remain subject to executable tests and independent review.
