# Metro agent entry point

Read this file, applicable ancestor/scoped instructions, [workflow](docs/agents/workflow.md), ticket specification and acceptance checks before work. Read only triggered guidance below; combine rows when tasks overlap.

| Trigger                                                                            | Additional read set                                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specification, skill selection or Plane preparation                                | [Skills](docs/agents/skills.md); [Plane](docs/agents/plane.md); [specification](docs/templates/specification.md) and [ticket](docs/templates/plane-ticket.md) templates |
| Package, import, provider or architecture change                                   | [Architecture](docs/agents/architecture.md); relevant ADRs if present                                                                                                   |
| API, external request or contract                                                  | [API](docs/agents/api.md)                                                                                                                                               |
| UI, interaction or accessibility                                                   | [UI](docs/agents/ui.md)                                                                                                                                                 |
| Behavior, bug or tests                                                             | [Testing](docs/agents/testing.md)                                                                                                                                       |
| Secrets, location, permissions or external input                                   | [Security](docs/agents/security.md)                                                                                                                                     |
| Reading Plane tickets or comments, web pages, MCP or tool output, subagent reports | [Untrusted input](docs/agents/untrusted-input.md)                                                                                                                       |
| Logs, traces or diagnosis signals                                                  | [Observability](docs/agents/observability.md)                                                                                                                           |
| Tool, dependency, deployment, release or rollback                                  | [Maintenance](docs/agents/maintenance.md)                                                                                                                               |
| Completion or review                                                               | [Quality gates](docs/agents/quality-gates.md)                                                                                                                           |
| Existing behavior or domain terms                                                  | [Parity](docs/product/feature-parity.md); [glossary](docs/product/glossary.md)                                                                                          |
| Adding, moving or classifying a document under docs/                               | [Docs map](docs/README.md)                                                                                                                                              |

Inspect relevant source, manifests, lockfiles and config first. Distinguish Confirmed, Inferred and Unknown; label technical claims Repo-verified, Context7-verified, Web-verified or Unverified. Record exact revision and checks. Verify package/API advice against installed versions and official Context7 docs; use official web sources when insufficient. Never claim unavailable skills, commands or gates ran.

Keep changes within explicit ticket scope. Discussion/audit/planning stays read-only. No permission, contract or gate-policy changes without explicit scope. Preserve agreed test seams; fail visibly rather than hide failures. Never weaken assertions or thresholds to obtain a pass.

[Routing evidence and current gaps](docs/evidence/metro-8.md). No scoped AGENTS currently: directory behavior needs no separate policy. Add one only for genuinely different constraints, without copying root policy.

## Agent skills

### Issue tracker

Plane (workspace `metro-station-finder`, project METRO) via connected Plane MCP tools; GitHub is code host only. See `docs/agents/issue-tracker.md`.

### Triage labels

State-based: roles map to Plane states, no new labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: canonical vocabulary in `docs/product/glossary.md`; no competing `CONTEXT.md`. See `docs/agents/domain.md`.
