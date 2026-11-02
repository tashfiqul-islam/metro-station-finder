# Metro agent entry point

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](README.md).

Read this file, applicable ancestor/scoped instructions, [workflow](docs/agents/workflow.md), ticket specification and acceptance checks before work. Read only triggered guidance below; combine rows when tasks overlap.

| Trigger | Additional read set |
| --- | --- |
| Package, import, provider or architecture change | [Architecture](docs/agents/architecture.md); relevant ADRs if present |
| API, external request or contract | [API](docs/agents/api.md) |
| UI, interaction or accessibility | [UI](docs/agents/ui.md) |
| Behavior, bug or tests | [Testing](docs/agents/testing.md) |
| Secrets, location, permissions or external input | [Security](docs/agents/security.md) |
| Logs, traces or diagnosis signals | [Observability](docs/agents/observability.md) |
| Tool, dependency, deployment, release or rollback | [Maintenance](docs/agents/maintenance.md) |
| Completion or review | [Quality gates](docs/agents/quality-gates.md) |
| Existing behavior or domain terms | [METRO-9 parity and glossary work](https://app.plane.so/metro-station-finder/browse/METRO-9/); use source until its documents land |

Inspect relevant source, manifests, lockfiles and config first. Distinguish Confirmed, Inferred and Unknown; label technical claims Repo-verified, Context7-verified, Web-verified or Unverified. Record exact revision and checks. Verify package/API advice against installed versions and official Context7 docs; use official web sources when insufficient. Never claim unavailable skills, commands or gates ran.

Keep changes within explicit ticket scope. Discussion/audit/planning stays read-only. No permission, contract or gate-policy changes without explicit scope. Preserve agreed test seams; fail visibly rather than hide failures. Never weaken assertions or thresholds to obtain a pass.

[Routing evidence and current gaps](docs/evidence/metro-8.md). No scoped AGENTS currently: directory behavior needs no separate policy. Add one only for genuinely different constraints, without copying root policy.
