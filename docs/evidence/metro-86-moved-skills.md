# METRO-86 moved text: reviewed skills and domain docs

Moved from docs/agents/skills.md and domain.md at revision db8d5e5 on 2026-11-06 (METRO-86). Repo-verified: the text below is copied unchanged from that revision; nothing was reworded, so its original dates, labels (Confirmed, Repo-verified, Web-verified, Unverified) and ticket references keep their original meaning. The rules in force live in [skills.md](../agents/skills.md). Frozen after this ticket.

## From skills.md, lines 3-3

**Confirmed / Repo-verified:** [content lock](../agents/skills.lock.json) pins 35 reviewed installed files by SHA256, including supporting documents and Bun/Context7 guidance. The lock pins the Claude Code installation (`"agent": "claude-code"`; re-verified 2026-11-05: all 34 skill files match the Claude Code superpowers 7.0.1 cache and `~/.agents/skills`, and the manifest entry is `.claude-plugin/plugin.json`). The 2026-11-03 review hashed a Codex cache; steps 2 and 3 below keep that Codex install route as dated METRO-10 evidence, and no Claude Code install or update route was exercised (Unverified). Superpowers manifest reports 7.0.1. Pocock skills are plain installed copies; installer metadata identifies `mattpocock/skills` and folder hashes, not an upstream Git commit. Tooling copies have no attested upstream commit/version. These content pins identify reviewed bytes; version names alone do not. See [preparation evidence](metro-10.md) and [workspace evidence](metro-11.md).

## From skills.md, lines 7-21

| Trigger                           | Read actual installed skill                                                                                                       | Metro boundary                                                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start work                        | `superpowers:using-superpowers`                                                                                                   | Select process first; inspect this repository's instructions.                                                                                                                       |
| Creative feature/design           | `superpowers:brainstorming`                                                                                                       | Settle design before implementation. Preparation is not approval.                                                                                                                   |
| Implementation isolation          | `superpowers:using-git-worktrees`                                                                                                 | Reuse suitable isolated checkout; preserve independent rebuild lineage.                                                                                                             |
| Approved multi-step specification | `superpowers:writing-plans`                                                                                                       | Record bounded plan and verification.                                                                                                                                               |
| Authorized plan execution         | `superpowers:subagent-driven-development`                                                                                         | Controller dispatches implementer, spec review, quality review; implementer does not spawn. No dispatch from ticket preparation.                                                    |
| Behavior implementation           | `superpowers:test-driven-development`                                                                                             | Failing behavior check before implementation; preserve agreed seams.                                                                                                                |
| Failure/bug                       | `superpowers:systematic-debugging`                                                                                                | Establish cause before patching.                                                                                                                                                    |
| Completion/review                 | `superpowers:verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | Fresh evidence, applicable [independent review](../agents/workflow.md#independent-review), authorized integration only.                                                             |
| Requirements unclear              | `grill-me`                                                                                                                        | Explore evidence, ask one question at a time; no implicit edit.                                                                                                                     |
| Domain language/decisions matter  | `grill-with-docs` and its format files                                                                                            | Use [glossary](../product/glossary.md), [parity](../product/feature-parity.md), relevant ADRs. Do not create competing canonical CONTEXT docs or write during read-only discussion. |
| Research settled into spec        | `to-prd`                                                                                                                          | Use [spec template](../templates/specification.md); Plane Page replaces GitHub issue publication.                                                                                   |
| Approved slice preparation        | `to-issues`                                                                                                                       | Use [ticket template](../templates/plane-ticket.md); retain HITL/AFK distinction, vertical outcomes and blockers. Local draft until publishing authorized.                          |
| Readiness classification          | `triage` and its agent-brief/out-of-scope files                                                                                   | Use Plane lifecycle and blocker rules below; preserve any required AI-authorship disclosure on posted content.                                                                      |

## From skills.md, lines 23-23

**Confirmed / Repo-verified:** `to-spec` and `to-tickets` are absent from the reviewed installed skill inventory. They are conceptual workflow stages, not callable skill names. Use `to-prd` for specification synthesis and `to-issues` for slicing, with the [Plane adapter](../agents/plane.md). Do not pretend GitHub-specific publication or a `ready-for-agent` label fits Plane. Ready is the canonical state, with explicit readiness checks. A prepared AFK slice still needs implementation authorization; it never launches agents by itself.

## From skills.md, lines 25-39

#### Reproduce lookup

PowerShell 7 is required (`ConvertFrom-Json -AsHashtable`). Supply actual installation roots; paths below describe this reviewed machine, not portable defaults:

```powershell
$roots = @{
    superpowers = 'C:/Users/Tashfiq/.claude/plugins/cache/superpowers-marketplace/superpowers/7.0.1'
    pocock = 'C:/Users/Tashfiq/.agents/skills'
    tooling = 'C:/Users/Tashfiq/.agents/skills'
}
& ./scripts/verify-metro-preparation.ps1 -SkillRoots $roots
& ./scripts/test-metro-preparation.ps1 -SkillRoots $roots
```

Missing root/file, path escape or changed bytes stops validation. Read matching files before use; passing hashes alone does not prove the agent followed the process. This lock covers the selected set, not every installed skill or future transitive reference. A newly required supporting file must be read, reviewed and pinned before relying on it.

## From skills.md, lines 43-51

No installation/update ran in METRO-10. Installation is a separate authorized environment change; never overwrite shared skills merely to pass this lock.

1. Inventory existing plugin/copy locations and metadata first. Select one installation route per collection per agent; remove duplication only with authorization. Save existing reviewed files and metadata for rollback outside this repository's product tree.
2. **Historical METRO-10 evidence (Codex route, 2026-11-03; not the active Claude Code route):** **Context7-verified / Web-verified:** [Superpowers official README](https://github.com/obra/superpowers/blob/main/README.md#codex-app) documents Codex app Plugins → Superpowers → `+`, or CLI `/plugins` → search Superpowers → Install Plugin. Use that route for an authorized fresh installation. The upstream update section says updates depend on agent and may be automatic; no exact Codex update command was established. Use the installed plugin manager's available update action after inspecting it; if unavailable, stop and verify the supported route. Do not `git pull` the managed cache or apply another harness's instructions.
3. **Historical METRO-10 evidence (Codex route, 2026-11-03):** **Web-verified:** [Pocock official README](https://github.com/mattpocock/skills#installation-30-second-setup) distinguishes automatically updating plugins from manually updated editable copies. This machine has editable copies. For a controlled update, inspect a separately obtained upstream checkout at an exact recorded commit, compare only the selected skills/supporting files, then replace the selected copies only under environment-change authorization. For a fresh Codex plugin route, upstream documents marketplace registration and plugin installation; verify the installed Codex command help first. Do not add the plugin alongside existing copies. Upstream installer examples use npm tooling; no installer is required by Metro's local validator and no global install is authorized here.
4. Read changed instructions and supporting files, compare process ownership, Plane publication/state rules and domain vocabulary. Record upstream commit when available; otherwise explicitly state provenance limits. Manifest version or installer folder hash cannot establish Git ancestry.
5. Update the repository lock with new paths and uppercase SHA256 from `Get-FileHash -Algorithm SHA256` only after review. Review the lock diff with behavior changes; never auto-regenerate pins to silence drift. Re-run lookup, positive dry run and all negative cases; obtain review before adopting. Restore saved reviewed content if adoption fails, then rerun hashes. Record commands and result; do not claim rollback was tested unless it was.

**Unknown:** fresh marketplace installation, automatic update and publisher-side behavior were not exercised. **Inferred:** the reviewed set is usable together through this adapter because its conflicting publication/state defaults are explicitly replaced; this is bounded preparation compatibility, not a claim that all skill interactions have been tested.

## From domain.md, lines 1-37

Whole former guide.

### Domain Docs

How the engineering skills consume this repo's domain documentation. Layout: single-context. The canonical vocabulary is [the glossary](../product/glossary.md); [reviewed skills](../agents/skills.md) forbid competing canonical `CONTEXT` documents.

#### Before exploring, read these

- [`docs/product/glossary.md`](../product/glossary.md): canonical domain terms.
- [`docs/product/feature-parity.md`](../product/feature-parity.md): behavior baseline for the rebuild.
- [`docs/adr/`](../adr/0001-foundation-baseline.md): ADRs touching the area you are about to work in (template: [0000](../adr/0000-template.md)).
- **`CONTEXT.md`** at the repo root, if one exists. None is planned.

If an optional file does not exist, **proceed silently**. Do not flag its absence or suggest creating it upfront. Skills that would create `CONTEXT.md` (for example `grill-with-docs`) must not do so; any such file would compete with the glossary. Record vocabulary changes in the glossary instead, within explicit ticket scope.

#### File structure

```
/
├── docs/
│   ├── adr/
│   └── product/
│       ├── glossary.md
│       └── feature-parity.md
├── apps/                     (web, api)
└── packages/                 (core, contracts)
```

#### Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Do not drift to synonyms the glossary avoids.

If the concept you need is not defined, either you are inventing language the project does not use (reconsider) or there is a real gap: report it rather than silently coining a term.

#### Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly instead of silently overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
