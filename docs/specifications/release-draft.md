# Specification: Plane release to draft GitHub release (METRO-24)

Identity: release-draft. Immutable revision: 2026-11-04-r1. Decision owner: Tashfiqul Islam. Requested in chat on 2026-11-04 ("either I create the release on Plane or on Github, it syncs automatically"); the owner asked to start METRO-24 and the ticket's own recommendations are adopted as the defaults, to be corrected by the owner if wrong. Builds on [release-sync](release-sync.md) (METRO-14), which carries the return direction.

## Decisions (defaults taken from the ticket recommendations)

| Question                      | Decision                                                                                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger                       | Manual `workflow_dispatch(tag, target)` now (option c). A schedule is not built: GitHub only runs schedules from the default branch, so it waits for the default-branch switch (option a). A Plane webhook receiver (option b) needs a production Worker; not built. |
| Draft target commit           | Input `target`, default `main` (its head when the draft is created). GitHub resolves it at publish time, and ignores it when the tag already exists.                                                                                                                 |
| Who may create drafts         | Whoever the owner approves in the `release` environment, the same gate as METRO-14.                                                                                                                                                                                  |
| Conflict when both sides edit | GitHub wins. The draft is created once and never updated; once published, METRO-14 overwrites the Plane release log from GitHub's notes.                                                                                                                             |

## Behaviour

The workflow `.github/workflows/release-draft.yml` runs only on manual `workflow_dispatch`. It calls `scripts/release-draft.ts`.

| #   | Rule                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The tag must match `v<major>.<minor>.<patch>[-<prerelease>]` (same rule as METRO-14). The target must be a plain branch name or SHA: letters, digits, `.`, `_`, `-`, `/`, no `..`, at most 100 characters.                                                     |
| 2   | A Plane release named exactly as the tag must exist (names are unique). Without it the job fails with a clear message.                                                                                                                                         |
| 3   | The Plane release must be `unreleased` with no external source. A release that is already `released`, or already linked to GitHub, is skipped with a reason and nothing is written.                                                                            |
| 4   | If GitHub already has any release for the tag, draft or published (found by listing releases, because the tag lookup hides drafts), nothing is created: outcome `unchanged`. Replays therefore create nothing.                                                 |
| 5   | Otherwise exactly one request creates a **draft** release: `tag_name` and `name` = tag, `target_commitish` = target, `body` = the Plane release log (HTML, which GitHub's markdown accepts), `prerelease` = Plane `is_prerelease` or the tag has a `-` suffix. |
| 6   | The job never publishes, never creates, moves or deletes a git tag, never edits or deletes a release, and never writes to Plane. The only mutating call is the single draft-creation POST.                                                                     |
| 7   | If the git tag already exists without a release, the log says the draft will use that tag and the target is ignored; the tag is not touched.                                                                                                                   |
| 8   | Publishing the draft fires METRO-14's sync: the Plane release is claimed (it is unreleased with no external source), the release tag gets the commit, and the release log is rewritten from GitHub's rendered notes.                                           |
| 9   | An empty Plane release log yields a draft with an empty body, and the log says so.                                                                                                                                                                             |
| 10  | Any HTTP failure fails the job with the status code, never the key or the token.                                                                                                                                                                               |

## Credentials and permissions

- Environment `release` (owner approval for every run; policy allows `v*` tags, `main`, `feature/metro-rebuild`). `PLANE_API_KEY` is set only on the draft step and is only used to read (list releases, read the release log).
- `GITHUB_TOKEN` gets `contents: write`, the minimum GitHub requires to list and create (draft) releases, and nothing else. The write is bounded by rule 6 and asserted by tests: the only non-GET request is the draft POST.
- Plane read paths: `GET /api/v1/workspaces/<slug>/releases/` (existing, proven live in METRO-14) and `GET .../releases/<id>/changelog/` (Context7-verified; response `changelog.description_html`; proven by the live test).

## Acceptance

1. Fixture tests: one draft for a Plane-only release, replay creates nothing, published or draft GitHub release present, released or GitHub-linked Plane release skipped, missing Plane release, prerelease flag, existing git tag, pagination of the GitHub release list, failure statuses, and "only one non-GET request, never PATCH/DELETE/tag creation".
2. Live test with a throwaway Plane release `v0.0.0-draft-test`: dispatch creates one draft with the log as its body; a second dispatch is `unchanged`; publishing it as a prerelease syncs back through METRO-14 with the same tag and a commit hash; all test records (Plane release and tag, GitHub release and tag) are deleted afterwards.
3. `lint:workflows` passes; key and token never appear in logs.

## Out of scope

Scheduled reconcile and Plane webhook receiver (follow-ups once the default branch moves or a production Worker exists), updating an existing draft, converting Plane HTML to Markdown, publishing, any Plane state change.
