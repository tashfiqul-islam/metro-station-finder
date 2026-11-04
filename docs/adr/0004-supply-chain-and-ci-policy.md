# ADR-0004: Supply-chain and CI policy

- Status: Accepted
- Date: 2026-11-03
- Ticket and specification: METRO-20, `metro-foundation-completion` revision `2026-11-03-r1`

## Context

Dependencies, tools and Actions were pinned by hand with no update automation, no release cooldown, no workflow lint, no commit-message rule and no Git-history secret scan. Evidence: [METRO-20 evidence](../evidence/metro-foundation-supply-chain.md), [quality gates](../agents/quality-gates.md) and [maintenance](../agents/maintenance.md).

## Decision

- We will pin every runtime, tool, dependency and Action exactly, at the latest stable release that is at least three days old. Bun enforces `install.minimumReleaseAge = 259200` seconds; Renovate (`.github/renovate.json5`: bun, mise and github-actions managers, grouped ecosystems, weekly lock maintenance, dependency dashboard, digest-pinned Actions) uses the same `minimumReleaseAge` ("3 days"). `scripts/configuration.ts` fails when the two differ. Security fixes may bypass the cooldown; any other pin newer than the cooldown needs a recorded reason (hk and mise are kept because `hk.pkl` pins the matching schema and the CI runner pins mise; `jdx/mise-action` was bumped once on explicit owner instruction).
- We will trust no dependency install scripts: the root `package.json` declares `"trustedDependencies": []` (METRO-46), enforced by `scripts/configuration.ts`; additions need a reviewed change to both.
- We will validate the Renovate configuration with the pinned `renovate-config-validator` in `check`. Renovate is pinned in `mise.toml` as `npm:renovate` with one scoped exception, `trust_policy_excludes = ["@yarnpkg/libzip@3.2.2"]`, approved by the owner on 2026-11-03 because that transitive release has no provenance although 3.2.0 had. As a Bun dependency Renovate would make `bun audit` fail (deepmerge has no fix). Remove the exception when upstream publishes provenance again.
- We will lint workflows with pinned actionlint and zizmor (offline, no config file, pedantic persona) in `check`. Workflows use `permissions: {}` at the top, explicit `contents: read` per job, full-SHA Actions with version comments, `persist-credentials: false`, a pinned runner image and untrusted values only through `env`.
- We will require Conventional Commits through a `commit-msg` hook and the same script over the pull-request range in CI.
- We will scan the full Git history with the pinned Gitleaks (`bun run scan:history`, redacted) in the `security` job. Two legacy `gcp-api-key` findings (commit `c36908bd`, built Next output) are allowlisted by exact fingerprint in `.gitleaksignore` with the owner's approval. The key's restriction or rotation status is unknown and is the owner's follow-up with the provider.
- Remote enforcement is a ruleset on `feature/metro-rebuild` (required `Quality gates`, up-to-date branch, pull request, signed commits, resolved threads, no force-push or deletion, no bypass). The same ruleset for `main` is owner-applied.

## Consequences

- Dependency updates arrive as reviewed pull requests and are never newer than three days unless security requires it.
- The tool trust exception and the history allowlist are standing, reviewed exceptions that must be revisited, not silently extended.
- Renovate behavior on this repository is unobserved until the app processes the configuration.
- Intermediate, unreviewed commits cannot land with non-conventional subjects.

## Alternatives considered

- Renovate as a Bun dependency: fails the dependency audit.
- Running the validator through unpinned `bunx`: outside the lockfile, audit and cooldown.
- Dropping the in-`check` validator: gives up a pinned validation of the configuration.
- Allowlisting history by commit range instead of fingerprint: hides future findings in that range.
