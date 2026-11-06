# GitHub security settings (METRO-48)

Status: the script and manifest are Repo-verified; the live settings are the owner's to change and are read, never written, by this repository.

## What is checked

`scripts/github-settings.ts` compares the live repository settings with the manifest `EXPECTED_SETTINGS` in the same file. It makes seven read-only `gh api <path>` GET calls (no `-X`, no `--method`, no fields) and prints one line per item: `PASS`, `FAIL` or `INFO`. Any `FAIL` exits non-zero.

| Item                            | Endpoint                                                        | Expected                                                                     |
| ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| actions sha pinning             | `GET /repos/{r}/actions/permissions`                            | `sha_pinning_required: true`                                                 |
| code scanning default setup     | `GET /repos/{r}/code-scanning/default-setup`                    | `state: configured`, languages include `javascript-typescript` and `actions` |
| secret scanning                 | `GET /repos/{r}` `security_and_analysis.secret_scanning.status` | `enabled`                                                                    |
| secret scanning push protection | same, `secret_scanning_push_protection.status`                  | `enabled`                                                                    |
| private vulnerability reporting | `GET /repos/{r}/private-vulnerability-reporting`                | `enabled: true`                                                              |
| immutable releases              | `GET /repos/{r}/immutable-releases`                             | `enabled: true`                                                              |
| dependabot security updates     | `GET /repos/{r}/automated-security-fixes`                       | reported only (`INFO`)                                                       |
| vulnerability alerts            | `GET /repos/{r}/vulnerability-alerts`                           | reported only (`INFO`)                                                       |

The two Dependabot items are printed as `INFO` and never fail, until the owner sets `enforce: true` for them in the manifest (a reviewed change). Rulesets and the default branch are covered elsewhere (`bun run cutover:preflight`, the [cutover runbook](cutover-runbook.md)) and are not repeated.

An unreadable setting is a `FAIL` that quotes the exact `gh: <message> (HTTP <n>)` line and the path, never a `PASS`: a 403, 404 or 422 cannot tell "off" from "not allowed to look", so the script does not guess. `security_and_analysis` is shown only to repository administrators (Web-verified, GitHub REST docs, read 2026-11-05); a repository answer without it fails with "not reported" for the same reason. The only 404 treated as a state is the exact `Vulnerability alerts are disabled.` message of the reported alerts item. Vulnerability alerts answer 204 with no body when enabled.

## Run it (owner, locally)

```powershell
gh auth status
mise exec -- bun run github:settings -- check tashfiqul-islam/metro-station-finder
```

Use the `gh` login of the repository admin. It is not a CI job and not a required check: the workflow `GITHUB_TOKEN` has no `administration` scope (the `permissions` key lists actions, artifact-metadata, attestations, checks, code-quality, contents, copilot-requests, deployments, discussions, id-token, issues, packages, pages, pull-requests, security-events, statuses and vulnerability-alerts; Web-verified, GitHub workflow syntax reference, read 2026-11-05), and the endpoints above need administrator access (immutable releases, vulnerability alerts, automated security fixes: "admin read access"; Web-verified, GitHub REST docs, read 2026-11-05). No PAT secret is added for this. Unverified: that `GITHUB_TOKEN` would fail on each endpoint; it is not tried because no workflow job calls them.

Live output on 2026-11-05, before the owner steps (all six `FAIL` lines are expected until the owner acts; the two secret scanning lines are paraphrased because the verbatim `key=value` text trips the Gitleaks generic-api-key rule):

```text
FAIL actions sha pinning: sha_pinning_required=false (expected true; ...)   [shortened]
FAIL code scanning default setup: state=not-configured, languages=actions,javascript,javascript-typescript,typescript (expected state configured with javascript-typescript, actions)
FAIL secret scanning: reported as disabled (expected enabled)   [paraphrased]
FAIL secret scanning push protection: reported as disabled (expected enabled)   [paraphrased]
FAIL private vulnerability reporting: enabled=false (expected true; ...)   [shortened]
FAIL immutable releases: enabled=false (expected true; ...)   [shortened]
INFO dependabot security updates: off, enabled=false, paused=false (reported, not enforced)
INFO vulnerability alerts: off, gh: Vulnerability alerts are disabled. (HTTP 404) (reported, not enforced)
```

Reading the immutable-releases endpoint differs on purpose between the two tools. This check treats a 404 as `FAIL` (unreadable): a 404 can mean "not enabled" or "no admin access", and an enforced item must not pass on a guess (GitHub documents 404 as "not enabled", but today's live answer for the disabled state is `200 {"enabled":false}`, so a 404 is unexpected). `cutover:preflight` treats a 404 as "off" (pass) because it only asks whether a throwaway rehearsal tag can be deleted, and "not enabled" is the safe reading for that question.

The vulnerability alerts "enabled" path (HTTP 204, empty body) was not observed live; the code assumes `gh api` prints nothing for a 204 and exits 0. The item is `INFO` by default, so nothing depends on it. If the owner sets `enforce: true` for it in the manifest, first re-observe the enabled state once with `gh api -i repos/<owner>/<repo>/vulnerability-alerts` and re-check the empty-stdout assumption.

## Owner steps (repository Settings)

1. Actions, General: require actions to be pinned to a full-length commit SHA (`sha_pinning_required`). Every workflow here already pins by SHA. Check first that no required action in a reusable workflow uses a tag; the setting makes such a run fail.
2. Advanced Security: enable secret scanning, then push protection.
3. Advanced Security: enable code scanning "default setup" for JavaScript/TypeScript and GitHub Actions (language names in the API: `javascript-typescript`, `actions`).
4. Advanced Security: enable private vulnerability reporting (see [SECURITY.md](../../SECURITY.md)).
5. General, Releases: enable immutable releases, after reading the interaction below.
6. Optional: Dependabot alerts and security updates (the dependency graph must be enabled for [dependency review](quality-gates.md); it is on for this public repository, Repo-verified 2026-11-05 by the independent reviewer: the SBOM endpoint returned 621 packages; the script does not read it, and only reports these two).
7. Run the check above and confirm no `FAIL`.

## Immutable releases and the release flow

GitHub documents (Web-verified, <https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases>, read 2026-11-05): once a release is published its tag and assets are locked; the title and notes remain editable, as do the pre-release flag and "latest"; the recommended flow is to create a draft, attach assets, then publish. A tag of an immutable release cannot be moved or deleted while the release exists, and after the release is deleted the tag name cannot be reused. Immutability applies only to releases published after the setting is on.

Finding, by reading [ADR-0007](../adr/0007-release-sync.md), `release-sync.yml`, `release-draft.yml` and `production-deploy.yml`:

- No conflict with release sync on `edited`: it reacts to notes and title edits, which stay editable. No workflow uploads assets, so the locked-assets rule changes nothing today.
- No conflict with the draft flow: `release-draft.yml` creates a draft only, the tag is created when the owner publishes, and `production-deploy.yml` runs on the pushed `vX.Y.Z` tag.
- Conflict 1, rehearsal: the cutover runbook's optional rehearsal with a deletable throwaway tag (`v0.0.0-cutover-test`) is impossible once immutable releases are on. The preflight already reports this (`immutable-releases` is `INFO`, "do not rehearse with a tag"); the rehearsal must be done before enabling the setting or skipped.
- Conflict 2, retraction: [maintenance](maintenance.md) says to retract by deleting or unpublishing the GitHub release. With immutability on, a published `vX.Y.Z` cannot be retried under the same name after deletion. A bad release needs a new version (a patch tag). Unverified: whether GitHub allows converting a published immutable release back to a draft; do not rely on "unpublish".
- A wrong tag or wrong target commit cannot be fixed after publish: check the draft's target before publishing.

The setting is the owner's decision; this document records the effect and does not choose for the owner.
