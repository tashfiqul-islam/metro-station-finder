# METRO-86 moved text: workflow, attribution and release policy

Moved from docs/agents/workflow.md, attribution.md and release-policy.md at revision db8d5e5 on 2026-11-06 (METRO-86). Repo-verified: the text below is copied from that revision with three mechanical changes only: relative links were retargeted so they resolve from docs/evidence/, headings were demoted two levels under each source heading, and a few in-page anchors or section references to moved text were repointed. No sentence was reworded, so its original dates, labels (Confirmed, Repo-verified, Web-verified, Unverified) and ticket references keep their original meaning. The rules in force live in [workflow.md](../agents/workflow.md). Frozen after this ticket.

## From workflow.md, lines 17-19

The earlier rule required "applicable independent review before merge" without defining it. This section is the one definition; the rule is not weaker: review is still required before merge wherever it applied, and now a recorded reviewer is also checked by CI (a required status check on both rulesets, see Enforcement status below).

**Principle.** A reviewer that shares the author's context and rationale tends to agree with it. Claude Code subagents start with a fresh context window and see only a delegation message, not the parent conversation (Web-verified: <https://code.claude.com/docs/en/sub-agents>, read 2026-11-04).

## From workflow.md, lines 33-35

**Record.** Every pull request body has a `Reviewer` section: the agent definition or person, the session or run reference, and the link to the disposition. The `Reviewer record` check (`.github/workflows/reviewer-record.yml`, logic and cases in `scripts/reviewer-record.ts`) proves only that the section is present, is not a placeholder (for example "pending", "TBD", "to be recorded", "n/a") and carries a reference a reader can follow: a URL, a `#<number>` pull request or comment reference, or a `session:` / `run:` token, plus identity text. It cannot prove that a review happened; the linked reviewer output and disposition are the evidence. Parsing rules: HTML comments are ignored, CRLF bodies from the web UI are read, the section ends at a heading of the same or higher level (sub-headings stay inside), headings in fenced code are ignored, the first non-empty `Reviewer` section wins, and Setext (underlined) headings are not supported. A body over 32768 characters fails with a clear message because it cannot be passed safely as one environment string. The body is untrusted input and reaches the script only through an environment variable (<https://docs.github.com/en/actions/reference/security/secure-use>, read 2026-11-04). A renamed file counts as both its old and new path, so moving code into `docs/` is still a code change.

**Enforcement status.** The check lives in its own workflow, not in `quality.yml`, because it must re-run when the pull request body is edited (`edited` trigger) and `quality.yml` cancels in-flight runs, including the Cloudflare preview deploy, when a new run starts. Re-running an old workflow run reuses its original event payload, so it checks a stale body; editing the body starts a fresh run with the new text. Both rulesets, `feature/metro-rebuild` (26426527) and `main` (26467450), require both status checks, `Quality gates` and `Reviewer record` (GitHub Actions, integration 15368), so a failing or missing `Reviewer record` blocks merge exactly as a failing `Quality gates` does. A pull request body therefore needs a `## Reviewer` section carrying a reference (a URL, a `#<number>` reference, or a `session:` / `run:` token) before it can merge.

## From workflow.md, lines 39-39

**Current default and open decision.** Today the default is an agent reviewer plus hosted checks, and the owner directs merges. Open decision (not made here): whether the human owner must also review every pull request. Until decided, no pull request is blocked on owner review beyond directing the merge.

## From workflow.md, lines 43-47

Owner currently requires ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For the authorized rebuild tickets, the owner permits Done after verified merge to `feature/metro-rebuild`, required CI and resolved applicable review. This overrides the source guide main-only rule for those tickets. Native Merged-to-Done automation cannot check PR base or CI; flag/reconcile premature state transitions rather than redefine Done. METRO-11 prepares main from reviewed independent rebuild lineage. Default stays unchanged until v1.0.0 is fully ready to release; follow the [release-time transition](../development.md#release-time-branch-transition) as planned in [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](../agents/cutover-runbook.md). Master removal remains separately authorized. The base branch named here changes to `main` only at [cutover runbook](../agents/cutover-runbook.md) step 6.4, in the same reviewed edit as CONTRIBUTING.md and plane.md (`branches:check` fails if only some change).

Done does not mean released. Release assignment records intended shipping; GitHub tag/release SHA plus deployment/smoke evidence establishes shipping. See [maintenance](../agents/maintenance.md) and [quality gates](../agents/quality-gates.md).

Source: supplied Metro operating guide (144aa09c-cd9a-4ce6-9161-a28826bb405b) and bootstrap specification (e1defa37-c65c-430e-8a8b-5f8d0f7fffe3), captured in [evidence](metro-8.md).

## From attribution.md, lines 1-39

Whole former guide.

### AI attribution and commit trailers

Status: policy (METRO-52). One rule for how AI-assisted work is attributed in commits and pull requests.

#### Rule

- **Agent commits carry one trailer** (a convention; no hook requires it, see Enforcement), in the final trailer block of the commit message, preceded by a blank line: `Co-Authored-By: <agent name and model> <noreply@anthropic.com>`. For Claude the value is the name and model Claude Code reports, for example `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Agent pull request bodies end with the footer line** `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. The `Reviewer` section rules in [workflow](../agents/workflow.md#independent-review) are unchanged.
- **Agents never add `Signed-off-by`.** It is a person's own certification (the Developer Certificate of Origin statement), which an agent cannot make. The human owner signs commits cryptographically instead (signed commits are required by the rulesets, see [quality gates](../agents/quality-gates.md)).
- **Human commits made without agent help carry no trailer.** A person who wants a `Signed-off-by` for their own commit, including one made with agent help, may add it.

#### Decisions

1. **`Co-Authored-By`, not `Assisted-by`.** Git trailers are `Key: value` lines at the end of the message ([git-interpret-trailers](https://git-scm.com/docs/git-interpret-trailers), Web-verified 2026-11-05: the block is preceded by a blank line and sits at the end). GitHub reads `Co-authored-by: name <email>` as a co-author line and credits the account behind the email ([GitHub docs](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors), Web-verified 2026-11-05). Claude Code adds this trailer by default and has an `attribution` setting (keys `commit`, `pr`) that changes or hides it (Web-verified 2026-11-05 from the settings reference index; default text not read, Unverified). Other projects use `Assisted-by`; practice is not settled and only secondary sources were seen (Unverified). The trailer already in the history wins until a project-level reason to change appears.
2. **No `Signed-off-by` from agents.** Reason above. Git's own docs show `Signed-off-by` as the signer's trailer (Web-verified).
3. **Human-only commits stay clean.** A hook that required the trailer would reject legitimate human commits and cannot tell who wrote a commit.

#### Merge methods and trailers

Repo-verified 2026-11-05 (`gh api repos/tashfiqul-islam/metro-station-finder`): merge commit, squash and rebase are all allowed. Ticket pull requests are merged with merge commits (the history shows `Merge pull request #N`).

| Method           | Effect on the trailers of the pull request's commits                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge commit     | Every branch commit is kept as is, trailers included (GitHub docs: all commits are kept plus a merge commit; Web-verified). The merge commit's own message is generated by GitHub.                                              |
| Rebase and merge | Commits are replayed with new SHAs and committer data (Web-verified). Message bodies are not documented as changed, so trailers are kept (Inferred).                                                                            |
| Squash and merge | The branch commits collapse into one. GitHub's default message is the pull request title plus the commit list or details, and it is editable (Web-verified); the docs fetched do not say whether trailers survive (Unverified). |

Squash can therefore drop the trailer. When a pull request with agent commits is squash-merged, whoever merges checks that the final squash message ends with the trailer block and adds the `Co-Authored-By` line by hand if missing. Do not squash without it. Merge commits are the default for this repository.

#### Enforcement

`scripts/commit-message.ts` (the `commit-msg` hook locally, `--range` in CI) enforces one narrow negative rule:

- a `Signed-off-by` whose email is an exact AI-agent address is rejected, whatever the name: `noreply@anthropic.com`, `<id>+claude[bot]@users.noreply.github.com`, `<id>+Copilot@users.noreply.github.com`, and the `copilot-swe-agent[bot]` / `github-copilot-cli[bot]` noreply forms. The Copilot forms come from secondary sources (GitHub issues and pull requests found by search, 2026-11-05); the numeric ids vary by app, so the pattern accepts any id (Unverified against GitHub docs).
- Names are never matched, so a person called Claude or Gemini, or a domain such as `notanthropic.com`, passes. Ordinary automation bots (Renovate, Dependabot) are not AI assistants, so their sign-offs pass. This is a recorded decision.

Only the last paragraph is scanned. The key match is case-insensitive, allows whitespace around the colon, and folded lines (continuation lines starting with whitespace) join the line before; other lines in that paragraph do not hide a `Signed-off-by`. `#` comment lines and a one-paragraph message (subject only) are ignored. `--range` reads each commit's full message (64 MiB limit, an error beyond that); the subject check uses the first line, as in the hook.

**What the hook cannot enforce.** "Agents never add `Signed-off-by`" beyond that identity check is policy only: a hook cannot tell who typed a sign-off, so an agent writing a human's name is caught by review, not by code. A human may still sign off a commit made with agent help; that is not rejected. Likewise the pull request footer rule and the `Co-Authored-By` trailer itself are not checked: `Reviewer record` (`scripts/reviewer-record.ts`) checks only the `Reviewer` section, and `.github/pull_request_template.md` carries no footer (Repo-verified). Requiring the trailer is deliberately not enforced (decision 3). Hooks are local feedback and CI is authoritative; the message points back to this page. Extend the identity list only with a test in `scripts/commit-message.test.ts`.

## From release-policy.md, lines 1-32

Whole former guide.

### Version and tag policy

Status: accepted with [ADR-0008](../adr/0008-default-branch-switch.md) (METRO-34, 2026-11-04). This is the one written rule for version and tag naming, who bumps versions and where release notes come from. The [release-sync](../specifications/release-sync.md) and [release-draft](../specifications/release-draft.md) specifications refer here instead of restating it. The tag grammar is enforced in code by `validateTag` in `scripts/release-sync.ts`; this page and that regular expression must agree (`scripts/release-policy.test.ts` checks the examples below against it).

#### Tag and version name

- Scheme: [Semantic Versioning 2.0.0](https://semver.org/) (Web-verified, read 2026-11-04): MAJOR for breaking changes to the public API, MINOR for backward-compatible features, PATCH for backward-compatible fixes. `1.0.0` defines the public API; `0.y.z` is initial development.
- Tag: `v<major>.<minor>.<patch>` for a stable release, `v<major>.<minor>.<patch>-<prerelease>` for a prerelease (`v1.0.0-rc.1`, `v1.2.0-beta.2`). Numbers have no leading zeros. The prerelease part starts with a letter or digit and may contain letters, digits, `.` and `-`. SemVer build metadata (`+...`) is not used and is rejected.
- The grammar enforced in code is a SemVer-compatible subset: `validateTag` checks the shape above, but it does not check that prerelease identifiers are non-empty or free of leading zeros in numeric parts (`v1.0.0-rc..1` passes). Write prereleases as SemVer defines them (`rc.1`, `beta.2`); the code is not tightened here.
- One name everywhere: the git tag, the GitHub release name, the Plane release name and the Plane release tag `version` are the same string. Plane finds its release by that name.
- The public API for MAJOR/MINOR/PATCH decisions is the HTTP contract in `packages/contracts` (see [API](../agents/api.md)) and the documented user-facing behaviour in the [parity matrix](../product/feature-parity.md). A change that breaks either is MAJOR.
- `v0.0.1` and `v0.0.2` are legacy releases from before the rebuild. They stay as they are. The first release of the rebuild is `v1.0.0`; ADR-0008 explains why it is not a `0.x` release.
- `package.json` `version` fields are `0.0.0` in a private workspace and are not release versions. They are not bumped. The git tag is the version.

#### Tag rules

- A stable tag points at a commit on the default branch that passed `Quality gates`. A prerelease tag may point at any commit the owner approves.
- A published tag is never moved, re-pointed or reused, and never deleted except to retract a faulty release (then the next release uses the next number, never the same one). Throwaway test tags (`v0.0.0-*-test`) are the only tags created and deleted routinely.
- Dry runs use a deletable throwaway tag named `v0.0.0-<name>-test`, never a stable tag, and only while immutable releases are off (`cutover:preflight` reads the setting). A `v1.0.0-rc.N` tag is not planned: it would stay in the history for good.

#### Who bumps

- The owner chooses the number. Agents and automation never choose a version, create a tag, publish or edit a release, or change a version string.
- The owner (or an agent on the owner's explicit instruction) creates the Plane release named with the tag, dispatches `release-draft` for it, and the owner publishes the draft. Publishing creates the tag. The `release` environment approval is the gate for every run.

#### Release notes

- First draft: the Plane release log, copied into the GitHub draft by `release-draft`.
- Before publishing, the owner edits the draft on GitHub. After publishing, GitHub is canonical and `release-sync` copies the rendered notes back to the Plane release log.
- The notes list the METRO tickets and pull requests included and have a `Deferred` heading naming unfinished tickets. `release-sync` reports a missing `Deferred` heading and does not block.
- Tickets that do not make a release move to the next planned Plane release, `v1.1.0` (reported to exist in Plane by the coordinator on 2026-11-04; not checked from here, so Unverified), and are named under `Deferred`.
- A release is not shipped until the tagged commit has a successful `production` deployment and smoke evidence; `release-sync` marks a stable Plane release `released` only then.
