# Version and tag policy

Status: accepted with [ADR-0008](../adr/0008-default-branch-switch.md) (METRO-34, 2026-11-04). This is the one written rule for version and tag naming, who bumps versions and where release notes come from. The [release-sync](../specifications/release-sync.md) and [release-draft](../specifications/release-draft.md) specifications refer here instead of restating it. The tag grammar is enforced in code by `validateTag` in `scripts/release-sync.ts`; this page and that regular expression must agree (`scripts/release-policy.test.ts` checks the examples below against it).

## Tag and version name

- Scheme: [Semantic Versioning 2.0.0](https://semver.org/) (Web-verified, read 2026-11-04): MAJOR for breaking changes to the public API, MINOR for backward-compatible features, PATCH for backward-compatible fixes. `1.0.0` defines the public API; `0.y.z` is initial development.
- Tag: `v<major>.<minor>.<patch>` for a stable release, `v<major>.<minor>.<patch>-<prerelease>` for a prerelease (`v1.0.0-rc.1`, `v1.2.0-beta.2`). Numbers have no leading zeros. The prerelease part starts with a letter or digit and may contain letters, digits, `.` and `-`. SemVer build metadata (`+...`) is not used and is rejected.
- One name everywhere: the git tag, the GitHub release name, the Plane release name and the Plane release tag `version` are the same string. Plane finds its release by that name.
- The public API for MAJOR/MINOR/PATCH decisions is the HTTP contract in `packages/contracts` (see [API](api.md)) and the documented user-facing behaviour in the [parity matrix](../product/feature-parity.md). A change that breaks either is MAJOR.
- `v0.0.1` and `v0.0.2` are legacy releases from before the rebuild. They stay as they are. The first release of the rebuild is `v1.0.0`; ADR-0008 explains why it is not a `0.x` release.
- `package.json` `version` fields are `0.0.0` in a private workspace and are not release versions. They are not bumped. The git tag is the version.

## Tag rules

- A stable tag points at a commit on the default branch that passed `Quality gates`. A prerelease tag may point at any commit the owner approves.
- A published tag is never moved, re-pointed or reused, and never deleted except to retract a faulty release (then the next release uses the next number, never the same one). Throwaway test tags (`v0.0.0-*-test`) are the only tags created and deleted routinely.
- Dry runs use a prerelease tag (`v1.0.0-rc.N`), never a stable tag.

## Who bumps

- The owner chooses the number. Agents and automation never choose a version, create a tag, publish or edit a release, or change a version string.
- The owner (or an agent on the owner's explicit instruction) creates the Plane release named with the tag, dispatches `release-draft` for it, and the owner publishes the draft. Publishing creates the tag. The `release` environment approval is the gate for every run.

## Release notes

- First draft: the Plane release log, copied into the GitHub draft by `release-draft`.
- Before publishing, the owner edits the draft on GitHub. After publishing, GitHub is canonical and `release-sync` copies the rendered notes back to the Plane release log.
- The notes list the METRO tickets and pull requests included and have a `Deferred` heading naming unfinished tickets. `release-sync` reports a missing `Deferred` heading and does not block.
- A release is not shipped until the tagged commit has a successful `production` deployment and smoke evidence; `release-sync` marks a stable Plane release `released` only then.
