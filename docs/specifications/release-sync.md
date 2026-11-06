# Specification: GitHub release to Plane release sync (METRO-14)

Identity: release-sync. Immutable revision: 2026-11-04-r2 (r2 adds the Plane release tag and the release log after the owner asked for tags and logs to stay in sync). Decision owner: Tashfiqul Islam, in chat on 2026-11-04. Approved: the proposed defaults on the METRO-14 readiness comment; a Plane API key in the GitHub environment `release` (expires 2027-02-03) with a required reviewer; one live test on the throwaway prerelease tag `v0.0.0-sync-test` and a throwaway Plane release, both deleted afterwards. The Plane GitHub integration is not installed; its acceptance item is split out of this ticket. The owner also asked for two-way sync (a release created in Plane appears on GitHub); that direction is split into its own ticket because its automatic trigger needs the default-branch switch or a webhook receiver.

## Behaviour

The workflow `.github/workflows/release-sync.yml` runs on `release` (`published`, `edited`, `unpublished`, `deleted`) and on manual `workflow_dispatch(tag)`. It calls `scripts/release-sync.ts`, which reads **current** GitHub state for the tag (not the event payload), so replays and out-of-order events converge.

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The tag must match `v<major>.<minor>.<patch>[-<prerelease>]`; anything else fails the job. The tag rule, who bumps versions and the source of release notes are defined once in the [version and tag policy](../agents/workflow.md#releases).                                                                                                                                      |
| 2   | The GitHub tag and the commit SHA it resolves to are canonical. The Plane release is found by **name = tag** (Plane names are unique per workspace), never duplicated.                                                                                                                                                                                                             |
| 3   | A published **stable** release becomes Plane `released` (with `release_date`) only if GitHub has a successful deployment for the same SHA in the environment `production`. Without one it stays `unreleased` and the log says why. The production deploy lives in METRO-57 ([ADR-0012](../adr/0012-production-deploy.md)); until the owner enables it, nothing becomes `released`. |
| 4   | A **prerelease** never becomes `released`; it is marked `is_prerelease` and `unreleased`.                                                                                                                                                                                                                                                                                          |
| 5   | A draft, unpublished, missing or deleted GitHub release sets a sync-managed Plane release back to `unreleased` with no release date and a note. It never deletes the Plane release. Cancelling a Plane release is a manual decision.                                                                                                                                               |
| 6   | Managed means: the Plane release has `external_source = github`, or it is `unreleased` with no external source (the planned `v1.0.0`, which is then claimed). A Plane release that is already `released` and has no external source (the historical `v0.0.1` and `v0.0.2`) is **left untouched**.                                                                                  |
| 7   | Managed releases get an HTML description with the GitHub URL, tag, SHA, prerelease flag, the METRO tickets and pull requests found in the release notes, and whether the notes contain a "Deferred" section. The notes themselves go to the release log (rule 7b), not the description.                                                                                            |
| 7a  | **Release tag:** a published release also upserts the Plane release tag (workspace catalog) with `version` = tag, `git_tag` = tag, `commit_hash` = SHA, and links it as the release `tag`. A retraction (rule 5) leaves the tag untouched.                                                                                                                                         |
| 7b  | **Release log:** the release changelog in Plane is set from the GitHub notes rendered to HTML by GitHub's own markdown API (so Plane gets sanitized HTML). It is written only when the GitHub content changed, so a hand edit in Plane persists until GitHub changes.                                                                                                              |
| 8   | The sync never changes work item states: publishing a release does not mark any ticket Done.                                                                                                                                                                                                                                                                                       |
| 9   | Idempotent: the release scalars (status, date, prerelease, external id, linked tag) are compared directly; the rendered content is compared through a SHA-256 stored in the release tag description (`sync-hash:`), because Plane's editor may rewrite stored HTML. Equal means no write.                                                                                          |
| 10  | Any HTTP failure fails the job with the status code (never the key). A manual `workflow_dispatch` with the tag reconciles after a failure.                                                                                                                                                                                                                                         |

## Credentials and permissions

- `PLANE_API_KEY` is an environment secret in `release`; the environment requires the owner's approval for each run. The key acts as its owner in Plane; its expiry (2027-02-03) and rotation are the owner's.
- The job gets `contents: read` and `deployments: read` from `GITHUB_TOKEN`, and nothing else. The key is set only on the sync step.
- Plane workspace slug: `metro-station-finder`. API: `https://api.plane.so/api/v1/workspaces/<slug>/releases/` (list, create, patch), `.../releases/tags/` (list, create, patch) and `.../releases/<id>/changelog/` (patch), header `X-API-Key`. The exact v1 paths for workspace-level patch and tags are Context7-verified only for documentation; the live test proves them.

## Trust model

A `release` event needs write access to the repository, and the workflow file runs from the tagged commit, so a tag on a modified commit would run modified code. The controls are the owner's approval of every run, the `release` environment policy (tags `v*` and the branches `main` and `feature/metro-rebuild` only; those branches are protected by rulesets), no cache restored into the job, and a key that only the sync step sees. The approver checks the tag and commit shown on the approval prompt. The production deploy workflow (METRO-57, `production-deploy.yml`) dispatches this workflow for the tag after a successful `production` deployment, so a stable release can become `released`; the `production` deployment is what this check reads.

## Release notes and rollback policy

- The source of release notes is defined in the [version and tag policy](../agents/workflow.md#releases). Notes must list the METRO ticket IDs and PRs included, plus a "Deferred" heading naming unfinished tickets. The sync records what it finds and reports a missing "Deferred" section in the Plane description; it does not block.
- Rollback or retraction: delete or unpublish the GitHub release; the next sync resets the Plane release to `unreleased`. Re-publishing restores it. The Plane work items are unchanged.

## Acceptance

1. Fixture tests cover published stable, prerelease, draft or missing, deleted, edited, replay, reordered events, historical `released` releases, claim of the planned release, and the deployment check.
2. A real run on `v0.0.0-sync-test` creates one Plane release with the right tag, SHA, URL and notes, a second run changes nothing, and unpublishing resets it; both test records are deleted afterwards.
3. `lint:workflows` passes; the key and token never appear in logs.

## Out of scope

Production deployment, the Plane GitHub integration (split out), changing work item states, release automation for versions other than tag-driven sync.

## Live-test notes (2026-11-04)

- Converting a published release to a draft did not fire the `unpublished` event in the live test; reconcile with `workflow_dispatch(tag)` from a `v*` tag or a protected branch. The dispatch ref must be allowed by the `release` environment policy (the ticket branch is not).
- Evidence: [metro-release-sync](../evidence/metro-release-sync.md).
