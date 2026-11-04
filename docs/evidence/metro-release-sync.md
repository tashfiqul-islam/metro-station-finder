# METRO-14 evidence: GitHub release, tag and release log sync to Plane

Ticket METRO-14. Specification `release-sync` revision `2026-11-04-r2` ([spec](../specifications/release-sync.md)), [ADR-0007](../adr/0007-release-sync.md). Pull request #24. Date 2026-11-04. Tested revision `c31c64fe61abdb8616d8a82ffe6be76d9ce54588`.

## Live proof

Throwaway prerelease `v0.0.0-sync-test` on `c31c64f`; each run was approved by the owner in the `release` environment. Both test records were deleted afterwards.

| Step                                  | Run            | Result                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publish prerelease (`release` event)  | 41701868831    | `Created Plane release v0.0.0-sync-test (unreleased)`. Plane release: `external_source` github, `is_prerelease` true, `unreleased`, no date, linked tag; description has URL, SHA, tickets METRO-13/14/24/25, PRs #22/#24, "Deferred section: present". Release tag: `version` and `git_tag` `v0.0.0-sync-test`, `commit_hash` `c31c64f…`, `sync-hash:` stored. |
| Replay (`workflow_dispatch`, tag ref) | 41757447746    | `Plane release v0.0.0-sync-test already matches GitHub.` then `unchanged`. No write.                                                                                                                                                                                                                                                                            |
| Convert to draft, then dispatch       | 41757613336    | Plane release reset to `unreleased`, `is_prerelease` false, no date, description "is not published (deleted, unpublished or a draft) … Status reset by release sync". Plane release and tag were kept (rule 5).                                                                                                                                                 |
| Cleanup                               | n/a            | Plane release and release tag deleted; GitHub release and tag `v0.0.0-sync-test` deleted (`gh release list` and `git ls-remote --tags` show nothing for it).                                                                                                                                                                                                    |
| Key and token in logs                 | all three runs | Both printed as `***`.                                                                                                                                                                                                                                                                                                                                          |

Plane v1 paths and shapes that the code assumed (release create/PATCH, workspace release tags, linked tag) worked on first contact. Not observed live: the changelog (release log) body was not read back through the API, and the release log page in Plane was not inspected; the run succeeded without error on that PATCH. Confirm visually in Plane on the next real release.

## Findings from the live test

1. A `workflow_dispatch` run from the ticket branch is refused by the `release` environment policy ("not allowed to deploy to release"). This is the intended restriction; dispatch only from a `v*` tag, `main` or `feature/metro-rebuild`.
2. Converting a published release to a draft did not start a run for the `unpublished` event. Unpublishing is therefore reconciled by manual dispatch (or by a delete event). The sync logic itself handled the draft correctly. Tracked with the schedule or webhook trigger in METRO-24.

## Not exercised

Stable release becoming `released` (needs a successful `production` deployment, METRO-11); claim of the planned `v1.0.0`; delete event live; edited event live. All covered by fixture tests only.

## Local and hosted checks

Hosted Quality gates on head `c31c64f`: Quality gates, Checks, Build and smoke, Security and Cloudflare preview green. `scripts/release-sync.test.ts` (29 tests with a fake GitHub and Plane server) and `scripts/release-workflow.test.ts` pass in `bun run check`.

## Independent review disposition

The independent review returned 1 Critical, 3 Important and several Minor findings, all fixed in `c31c64f`: tag content hash written last so a half-failed run is redone; any successful production status counts (superseded deployments turn inactive); retraction works when the tag is gone; duplicate Plane names refuse; Plane relation and date shapes tolerated; log injection through the tag stopped; `release` environment restricted to `v*` tags and the two protected branches; parsed workflow structure tested.

## Open items

Owner: Plane key expires 2027-02-03. METRO-24 (Plane to GitHub drafts and trigger), METRO-25 (Plane GitHub integration). Production deploy job (METRO-11) must dispatch this sync after a successful `production` deployment.
