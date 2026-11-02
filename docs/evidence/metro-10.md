# METRO-10 evidence — 2026-11-02

## Scope and revisions

**Confirmed / Repo-verified:** implementation starts at independent root `68ade0727739fd9d16dc7997178a867af678d4eb`, branch `ticket/metro-10-skill-plane-preparation`. No legacy application, ancestry, package install or scaffold added. This ticket supplies guidance, templates, synthetic fixtures and local preparation validation. Owner authorization permits signed commit and later reviewed integration into `feature/metro-rebuild`; controller owns PR/review/merge. METRO-11 owns main/default migration; no migration in METRO-10.

[Ticket](https://app.plane.so/metro-station-finder/browse/METRO-10/), [operating guide](https://app.plane.so/metro-station-finder/projects/1ab13b1b-d537-4524-8f18-45ee42262dc4/pages/144aa09c-cd9a-4ce6-9161-a28826bb405b) and [bootstrap specification](https://app.plane.so/metro-station-finder/projects/1ab13b1b-d537-4524-8f18-45ee42262dc4/pages/e1defa37-c65c-430e-8a8b-5f8d0f7fffe3) were retrieved read-only. Older captured main-only Done/deferred-migration text is superseded by owner instructions: verified integration Done for authorized rebuild tickets; migration in METRO-11. No Plane writes were made by implementer.

## Reviewed skills and provenance

**Confirmed / Repo-verified:** [skills.lock.json](../agents/skills.lock.json) records exact SHA256 of 22 read installed files. Reviewed manifest: `C:/Users/Tashfiq/.codex/plugins/cache/openai-curated-remote/superpowers/7.0.1/.codex-plugin/plugin.json` reports Superpowers 7.0.1 and obra/superpowers source. Reviewed actual process instructions and implementer prompt; matching supported files are pinned. Neither cache path nor manifest attests an upstream commit.

Pocock root `C:/Users/Tashfiq/.agents/skills` contains plain copies of `grill-me`, `grill-with-docs`, `to-prd`, `to-issues`, `triage`. Read supporting CONTEXT/ADR and triage brief/out-of-scope formats. Installer record `C:/Users/Tashfiq/.agents/.skill-lock.json` identifies GitHub source `mattpocock/skills`, plugin name `mattpocock-skills`, installation 2026-05-12 and update 2026-05-28, without upstream commit. Recorded installer folder hashes:

| Skill | Folder hash (installer metadata, not content SHA256 or Git commit) |
| --- | --- |
| grill-me | `2a1ad17028306ebe45f0e49703fa28b9b2e7f499` |
| grill-with-docs | `2c6aa7079cc705a6e0c319fcf23a0fa39968de29` |
| to-prd | `d6eff3e99a325d2d9c2acbe31b4d76fa5340a154` |
| to-issues | `b38c5aa6ae5d6903e60d3f74a7aafd32d02f2c06` |
| triage | `de4f182c30876a2460ca307e2f601b9b892527e5` |

`to-spec`/`to-tickets` absent in inspected installed inventories. [Skills guide](../agents/skills.md) maps conceptual stages to actual names, resolves GitHub/Plane defaults and separates preparation from publication/dispatch/implementation. **Inferred:** bounded compatibility follows explicit adapter rules, not version labels or a comprehensive interoperability test.

## Official documentation and connector evidence

Context7 queried before web: `/obra/superpowers` for Codex setup; `/websites/developers_plane_so` for relation direction and external identity filtering. **Context7-verified:** official [relation API](https://developers.plane.so/api-reference/work-item-relations/create-work-item-relation) supports blocked_by; [filtering](https://developers.plane.so/api-reference/v2/filtering-and-ordering) covers external source/id lookup. These confirm concepts, not connector wire shapes.

**Web-verified:** exact update/copy behavior required fallback to official [Superpowers README](https://github.com/obra/superpowers/blob/main/README.md) and [Pocock README](https://github.com/mattpocock/skills). Their Codex plugin routes and agent-dependent updates versus editable-copy updates informed the documented procedure. No install/update/rollback was exercised; no unsupported exact Codex update command is claimed.

**Confirmed / connector-schema evidence:** inspected live Plane page, workitem, relation, state, workitem_link, module, milestone and release tool definitions. [Plane adapter](../agents/plane.md) records arguments and preservation/retry rules. Work-item UUID array for relations differs from membership string arguments. Release is workspace scoped; native memberships differ from links. Reads resolved project UUID `1ab13b1b-d537-4524-8f18-45ee42262dc4` and METRO-10 UUID `601f3b35-89c2-4d17-8d26-d09607ec3f0c`. Initial workspace-scope Page retrieval returned 404; project-scoped retrieval succeeded. No write-tested permission, uniqueness or transaction guarantees inferred.

## Acceptance mapping

| Ticket acceptance | Evidence |
| --- | --- |
| Reviewed revisions, install/update and actual triggers | Content lock; skills guide with source/provenance limits and controlled review procedure |
| Plane storage, creation, blockers, states, release/module/milestone | Plane native-operation table, safe retry ledger and readback procedure |
| Preserve scope, criteria and seams in independent tickets | Source/tickets fixture comparison; two bounded outcomes; fare blocked by station; complete failure and seam fields |
| No implicit dispatch/implementation; instructions agree | Templates and adapter authorization boundaries; AGENTS routing; workflow/README owner exception and METRO-11 migration |

Manual template comparison: specification identity/revision/source, scope/exclusions, grouping, slice ID/title/outcome, full Given/When/Then/failure checks, testing boundary/fixture/checks and blockers all have explicit template slots. JSON comparison checks the bounded projection, not Markdown rendering or semantic research quality. Stable identity adds `metro-spec` plus specification/slice key; source revision remains separate to support retries.

## Verification

Environment: Windows, PowerShell 7.6.5; no package manifest/lockfile in independent root. Dependency-free scripts require PowerShell 7. Initial red check: negative runner before validator existed failed with `Missing preparation validator` (exit 1). Implementation then passed positive and scoped negative checks without weakening assertions.

From repository root:

```powershell
$reviewedRoots = @{
    superpowers = 'C:/Users/Tashfiq/.codex/plugins/cache/openai-curated-remote/superpowers/7.0.1'
    pocock = 'C:/Users/Tashfiq/.agents/skills'
}
& ./scripts/verify-metro-preparation.ps1 -SkillRoots $reviewedRoots
& ./scripts/test-metro-preparation.ps1 -SkillRoots $reviewedRoots
git diff --check
```

Positive result: 22 skill files; 2 tickets; fields, stable identities and blocker graph preserved; no network operations. Negative result: 11 scoped cases rejected with expected error: omitted criterion, omitted seam, unknown blocker, cyclic blockers, reversed prepared blocker, identity drift, duplicate ticket, scope loss, hash drift, missing skill, root escape. Installed files unchanged; temporary fixtures cleaned within verified system-temp child. Final fresh run, local Markdown link scan and whitespace check passed (see implementer report for full command/results).

**Unknown/unrun:** fresh skill install/update/rollback; live Plane mutations and retry behavior; full skill interoperability; future application/CI/release gates. No package/runtime gates exist here. These are explicit limits, not claimed passes. Independent task/whole-branch reviews and integration are controller steps after this signed implementation commit.
