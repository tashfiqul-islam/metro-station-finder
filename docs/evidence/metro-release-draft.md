# METRO-24 evidence: draft GitHub release from a Plane release

Ticket METRO-24. Specification `release-draft` revision `2026-11-04-r2` ([spec](../specifications/release-draft.md)). Pull request #25. Date 2026-11-04. Tested revision `14aefc4689d8851d479cd6b8d84531459220d061`.

## Live proof

Throwaway Plane release `v0.0.0-draft-test` with the release log "METRO-24 live test notes. Written in Plane." Dispatched from a throwaway tag on the tested revision, each run approved by the owner in the `release` environment.

| Step                             | Run         | Result                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dispatch with tag and target SHA | 41760186269 | Success. `gh release list` showed exactly one draft `v0.0.0-draft-test`, prerelease true (from the `-` suffix); body is the Plane log HTML; target is the tested SHA; `git ls-remote --tags` showed no tag `v0.0.0-draft-test`.                                                                                                                                               |
| Replay dispatch                  | 41760502658 | `GitHub already has a release for v0.0.0-draft-test; nothing to create.` then `Release draft finished: unchanged`. Still one release.                                                                                                                                                                                                                                         |
| Publish the draft (prerelease)   | 41760708028 | METRO-14 sync: `Updated Plane release v0.0.0-draft-test (unreleased)`, `Release sync finished: updated`. The same Plane release id was claimed (`external_source` github, `is_prerelease` true), linked to a release tag with `commit_hash` the tested SHA and `git_tag` `v0.0.0-draft-test`; the release log was rewritten with GitHub-rendered HTML carrying the same text. |
| Cleanup                          | n/a         | Plane release and release tag deleted; GitHub release and tag deleted; the three throwaway tags deleted (`git ls-remote --tags origin 'v0.0.0-*'` is empty). Releases left: v0.0.2, v0.0.1.                                                                                                                                                                                   |

Keys and tokens were masked in the run logs. The Plane `GET …/changelog/` endpoint and `PATCH` of the log work as documented (`changelog.description_html`). This also gives the first read-back of a release log written by METRO-14's sync (closes that gap from the METRO-14 evidence).

## Finding

A `workflow_dispatch`-only workflow is not dispatchable from a branch or tag until GitHub has seen a run of it (see the spec's live-test notes). It was registered with a throwaway tag trigger that was never merged.

## Not exercised live

Skipped (released or GitHub-linked Plane release), a missing Plane release, an existing git tag without a release, and HTTP failure paths: fixture tests only. The empty-log case is a fixture test; the live log was non-empty.

## Local and hosted checks

`mise exec -- bun run check` green on the tested revision (353 tests; `scripts/release-draft.ts` 100% lines and functions). Hosted checks: see the merge report on METRO-24.

## Independent review disposition

No Critical findings. Fixed: never-written (null) release log now drafts an empty body; hand-made `untagged-` drafts match by name; pagination stops on an empty page; concurrency asserted from the parsed workflow. Disproved: dispatch from a non-default ref (works once registered; proven by METRO-14 and here). Accepted and recorded under "Known limits": per-run "exactly one" scope, skipped runs exit 0, target not pre-checked, oversized body fails with the HTTP status.
