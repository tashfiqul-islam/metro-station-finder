# Current phase: foundation rebuild

Read when: you need the rebuild, cutover or legacy-baseline facts that hold only until the default-branch switch. Delete this file at cutover (see Read more).

## Rules

- The repository is the independent rebuild on `feature/metro-rebuild`. Ticket PRs target that branch and Done follows a verified merge to it ([workflow](workflow.md#execution)). Keep the rebuild lineage independent of the legacy history; METRO-11 prepares `main` from reviewed rebuild history.
- The default branch stays `master` until v1.0.0 is fully ready to release. Switching it, its order and its rollback are in [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](cutover-runbook.md). Removing `master` is separately authorized. Do not switch, delete or retarget a branch without that authorization.
- At the switch, step 6.4 of the runbook changes the base branch in CONTRIBUTING.md, `workflow.md` and `plane.md` in one reviewed edit (`bun run branches:check` fails if only some change). The step 6.4 pull request also deletes this file and every link to it.
- The weekly Cloudflare token check and other scheduled workflows run only from the default branch, so they start running at the switch. Until then dispatch the token check by hand.
- Legacy baseline `af903d7` (Next pages, components, services and utils; no test runner, no layered workspace) is evidence of old behavior, not of the rebuild. Content that describes only that baseline carries a `Historical baseline` banner. Use it only for parity and glossary evidence: [parity](../product/feature-parity.md), [glossary](../product/glossary.md). Do not invent rebuild behavior from it. Legacy sources: [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json), [TypeScript config](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/tsconfig.json), [index page](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/pages/index.tsx), [geocoding service](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/services/metroServices.ts) (a client-side provider call, not a server contract), [script loader](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/loadGoogleMapScript.ts) (browser provider access, not a security audit).
- Releases: `v0.0.1` and `v0.0.2` are legacy; the first rebuild release is `v1.0.0` ([workflow](workflow.md#releases)).

## Enforced by

- `scripts/base-branch.ts` (`branches:check`): fails when the base-branch documents disagree.
- `scripts/docs-drift.test.ts`: fails a document that presents the legacy baseline as current without its banner. Add the banner; do not edit the check.
- `scripts/cutover-preflight.ts` (`bun run cutover:preflight`): read-only report of the switch preconditions.

## Read more

- [ADR-0008](../adr/0008-default-branch-switch.md), [cutover runbook](cutover-runbook.md), [development notes](../development.md#release-time-branch-transition), [METRO-11 evidence](../evidence/metro-11.md).
