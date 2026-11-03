# Reviewed skills and preparation

**Confirmed / Repo-verified:** [content lock](skills.lock.json) pins 30 reviewed installed files by SHA256, including supporting documents and Bun/Context7 guidance. Superpowers manifest reports 7.0.1. Pocock skills are plain installed copies; installer metadata identifies `mattpocock/skills` and folder hashes, not an upstream Git commit. Tooling copies have no attested upstream commit/version. These content pins identify reviewed bytes; version names alone do not. See [preparation evidence](../evidence/metro-10.md) and [workspace evidence](../evidence/metro-11.md).

## Read triggers and ownership

| Trigger | Read actual installed skill | Metro boundary |
| --- | --- | --- |
| Start work | `superpowers:using-superpowers` | Select process first; inspect this repository's instructions. |
| Creative feature/design | `superpowers:brainstorming` | Settle design before implementation. Preparation is not approval. |
| Implementation isolation | `superpowers:using-git-worktrees` | Reuse suitable isolated checkout; preserve independent rebuild lineage. |
| Approved multi-step specification | `superpowers:writing-plans` | Record bounded plan and verification. |
| Authorized plan execution | `superpowers:subagent-driven-development` | Controller dispatches implementer, spec review, quality review; implementer does not spawn. No dispatch from ticket preparation. |
| Behavior implementation | `superpowers:test-driven-development` | Failing behavior check before implementation; preserve agreed seams. |
| Failure/bug | `superpowers:systematic-debugging` | Establish cause before patching. |
| Completion/review | `superpowers:verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | Fresh evidence, applicable independent review, authorized integration only. |
| Requirements unclear | `grill-me` | Explore evidence, ask one question at a time; no implicit edit. |
| Domain language/decisions matter | `grill-with-docs` and its format files | Use [glossary](../product/glossary.md), [parity](../product/feature-parity.md), relevant ADRs. Do not create competing canonical CONTEXT docs or write during read-only discussion. |
| Research settled into spec | `to-prd` | Use [spec template](../templates/specification.md); Plane Page replaces GitHub issue publication. |
| Approved slice preparation | `to-issues` | Use [ticket template](../templates/plane-ticket.md); retain HITL/AFK distinction, vertical outcomes and blockers. Local draft until publishing authorized. |
| Readiness classification | `triage` and its agent-brief/out-of-scope files | Use Plane lifecycle and blocker rules below; preserve any required AI-authorship disclosure on posted content. |

**Confirmed / Repo-verified:** `to-spec` and `to-tickets` are absent from the reviewed installed skill inventory. They are conceptual workflow stages, not callable skill names. Use `to-prd` for specification synthesis and `to-issues` for slicing, with the [Plane adapter](plane.md). Do not pretend GitHub-specific publication or a `ready-for-agent` label fits Plane. Ready is the canonical state, with explicit readiness checks. A prepared AFK slice still needs implementation authorization; it never launches agents by itself.

## Reproduce lookup

PowerShell 7 is required (`ConvertFrom-Json -AsHashtable`). Supply actual installation roots; paths below describe this reviewed machine, not portable defaults:

```powershell
$roots = @{
    superpowers = 'C:/Users/Tashfiq/.codex/plugins/cache/openai-curated-remote/superpowers/7.0.1'
    pocock = 'C:/Users/Tashfiq/.agents/skills'
    tooling = 'C:/Users/Tashfiq/.agents/skills'
}
& ./scripts/verify-metro-preparation.ps1 -SkillRoots $roots
& ./scripts/test-metro-preparation.ps1 -SkillRoots $roots
```

Missing root/file, path escape or changed bytes stops validation. Read matching files before use; passing hashes alone does not prove the agent followed the process. This lock covers the selected set, not every installed skill or future transitive reference. A newly required supporting file must be read, reviewed and pinned before relying on it.

## Install/update and review procedure

No installation/update ran in METRO-10. Installation is a separate authorized environment change; never overwrite shared skills merely to pass this lock.

1. Inventory existing plugin/copy locations and metadata first. Select one installation route per collection per agent; remove duplication only with authorization. Save existing reviewed files and metadata for rollback outside this repository's product tree.
2. **Context7-verified / Web-verified:** [Superpowers official README](https://github.com/obra/superpowers/blob/main/README.md#codex-app) documents Codex app Plugins → Superpowers → `+`, or CLI `/plugins` → search Superpowers → Install Plugin. Use that route for an authorized fresh installation. The upstream update section says updates depend on agent and may be automatic; no exact Codex update command was established. Use the installed plugin manager's available update action after inspecting it; if unavailable, stop and verify the supported route. Do not `git pull` the managed cache or apply another harness's instructions.
3. **Web-verified:** [Pocock official README](https://github.com/mattpocock/skills#installation-30-second-setup) distinguishes automatically updating plugins from manually updated editable copies. This machine has editable copies. For a controlled update, inspect a separately obtained upstream checkout at an exact recorded commit, compare only the selected skills/supporting files, then replace the selected copies only under environment-change authorization. For a fresh Codex plugin route, upstream documents marketplace registration and plugin installation; verify the installed Codex command help first. Do not add the plugin alongside existing copies. Upstream installer examples use npm tooling; no installer is required by Metro's local validator and no global install is authorized here.
4. Read changed instructions and supporting files, compare process ownership, Plane publication/state rules and domain vocabulary. Record upstream commit when available; otherwise explicitly state provenance limits. Manifest version or installer folder hash cannot establish Git ancestry.
5. Update the repository lock with new paths and uppercase SHA256 from `Get-FileHash -Algorithm SHA256` only after review. Review the lock diff with behavior changes; never auto-regenerate pins to silence drift. Re-run lookup, positive dry run and all negative cases; obtain review before adopting. Restore saved reviewed content if adoption fails, then rerun hashes. Record commands and result; do not claim rollback was tested unless it was.

**Unknown:** fresh marketplace installation, automatic update and publisher-side behavior were not exercised. **Inferred:** the reviewed set is usable together through this adapter because its conflicting publication/state defaults are explicitly replaced; this is bounded preparation compatibility, not a claim that all skill interactions have been tested.
