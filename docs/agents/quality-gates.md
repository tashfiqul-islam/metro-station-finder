# Quality gates and completion

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

## Available evidence versus planned checks

**Confirmed / Repo-verified:** scripts exist in [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json); tag/manual Pages workflow exists in [workflow](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/.github/workflows/nextjs.yml). Script existence does not prove a pass, required PR CI or branch protection. See [maintenance](maintenance.md) for execution limits.

**Planned / Unverified as executable gates:** pinned canonical commands shared by hk and CI; Oxfmt/Oxlint/types, Knip/dependency-cruiser, data/domain tests, relevant contract/Workers/Playwright/axe checks, secret/dependency scans and bundle budget. No command names, thresholds or enforcement are established by this document. METRO-11 creates reproducible scaffold; METRO-12 implements gates and proves invalid fixtures fail and valid scaffold passes. Later preview/release checks belong to METRO-13/14.

**Confirmed / Repo-verified:** [preparation dry-run and scoped negative checks](../examples/plane-preparation/README.md) validate reviewed skill content and source-to-ticket preservation locally. These do not replace future application gates or test live Plane writes.

## Completion evidence

For every slice record reviewed source and final revisions, acceptance criterion to evidence mapping, exact check text/results, environment, failures, unrun checks and material unknowns. Verify routing/links/scope for documentation. Applicable review must be resolved; required CI must pass before Done. The [workflow](workflow.md) records the owner-authorized integration-merge exception for rebuild tickets; otherwise main merge remains canonical. An unchecked merge is insufficient.

Gate, permission or contract changes require explicit scope and review. Never silently weaken policy, disable failing checks or infer enforcement from prose. Missing implementation is a gap to report, not a check to claim passed. [METRO-8 evidence](../evidence/metro-8.md) records this documentation slice only.
