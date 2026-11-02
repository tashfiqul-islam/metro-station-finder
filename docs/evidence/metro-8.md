# METRO-8 acceptance evidence

Reviewed source: `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, 2026-11-02. Documentation revision: commit carrying this file; exact SHA recorded in ticket/PR report. Scope: documentation only; no product, dependencies, permission or workflow edits.

## Evidence sources

Supplied METRO-8 brief; operating guide `144aa09c-cd9a-4ce6-9161-a28826bb405b`; bootstrap spec `e1defa37-c65c-430e-8a8b-5f8d0f7fffe3`; [plan](../superpowers/plans/2026-11-02-bootstrap-evidence.md). These establish policy, not executable enforcement.

**Confirmed / Repo-verified:** inspected [manifest](../../package.json), [lock](../../package-lock.json), [TypeScript config](../../tsconfig.json), [workflow](../../.github/workflows/nextjs.yml), [home](../../src/pages/index.tsx), [service](../../src/services/metroServices.ts), [fares](../../src/services/fareCalculation.ts) and [loader](../../src/utils/loadGoogleMapScript.ts). Lock resolutions: Next 14.0.4, React 18.2.0, TypeScript 5.3.3. No test script. No ADRs or nested AGENTS in baseline inventory. No package/API guidance changed; Context7 not used for policy/file-existence checks.

**Inferred:** root triggers plus focused docs suffice; no scoped AGENTS warranted until directory constraints differ. Proposed inward architecture is rebuild policy, not existing implementation.

**Unknown:** live provider behavior, scaffold compatibility, gate enforcement, branch protection and live default branch. [METRO-9 parity/glossary](https://app.plane.so/metro-station-finder/browse/METRO-9/) pending; no absent local documents linked. External authenticated ticket URL supplied by coordinator; local checks do not prove HTTP access.

## Representative routing checks

Every scenario reads root/applicable scoped instructions, workflow, ticket spec and acceptance criteria; every completion reads quality-gates. No scoped instructions currently. Exact additional documents below; combine more root triggers only if stated scope grows.

| Scenario | Additional read set | Other evidence |
| --- | --- | --- |
| Add geocoding request validation/provider error contract | api, architecture, security, testing | METRO-9/source for existing behavior; version-specific provider docs |
| Fix keyboard focus/error rendering without provider changes | ui, testing | METRO-9/source for existing behavior/terms |
| Fix nearest-station calculation without UI/provider/log changes | testing | METRO-9/source for existing behavior/terms |
| Update map-provider dependency | maintenance, architecture, api, security, testing, ui | Relevant ADRs if added; provider docs; METRO-9/source |
| Release checked revision without product changes | maintenance | Applicable implemented deployment/smoke checks and shipping evidence |

Manual review confirms additive routing: API composes relevant boundaries; UI/bug avoid unrelated maintenance/architecture reads; provider dependency selects touched UI/API/security boundaries; release preserves shipping distinction. Root links all nine categories and parity/terms trigger.

## Verification

PowerShell checks local Markdown links/anchors, root size, routing coverage and allowed changed paths. Git checks whitespace and diff scope. Exact command text/results and final commit retained in external `metro8-report.md`; results appended after execution. External links syntax-reviewed only. Build/tests/install unrun: documentation slice does not validate app or proposed tooling. No hk/CI invocations invented; METRO-11/12 own executable setup. Integration base exception explicit; canonical Done still requires main merge.

Executed 2026-11-02: 47 local links/anchors checked, zero failures; root 21 lines; nine of nine guidance routes present. Manual five-scenario routing/policy review passed. Staged Git whitespace and allowed-path checks recorded in execution report. External ticket reachability and app/runtime checks remain unrun.
