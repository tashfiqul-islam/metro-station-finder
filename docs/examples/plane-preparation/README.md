# Local Plane preparation dry run

**Confirmed / Repo-verified:** these JSON fixtures are synthetic preparation data, not Metro behavior or real tracker entities. `example.invalid` references deliberately prevent confusion with live sources. No Page, ticket, membership, blocker or state is published.

`source.json` is the settled source envelope; `tickets.json` is a manually prepared projection. Both retain specification identity/revision/URL, global scope/exclusions and grouping. Each ticket copies its source slice title/outcome, scope/exclusions, full acceptance/failure checks, testing seam/fixture/checks and `blockedBy`. Only stable external identity fields are added. `fare` depends on `station`; each has its own observable fixture result. A dependency does not make the second outcome unverifiable.

The [specification template](../../templates/specification.md) captures these fields plus research, decisions and readiness evidence. The [ticket template](../../templates/plane-ticket.md) preserves the slice body and publication metadata. Markdown/HTML rendering and semantic quality require review; the executable comparison checks JSON preservation, not prose quality or live API behavior.

Run from repository root in PowerShell 7 (required for `ConvertFrom-Json -AsHashtable`), with your reviewed installation roots:

```powershell
$reviewedRoots = @{
    superpowers = 'C:/Users/Tashfiq/.claude/plugins/cache/superpowers-marketplace/superpowers/7.0.1'
    pocock = 'C:/Users/Tashfiq/.agents/skills'
    tooling = 'C:/Users/Tashfiq/.agents/skills'
}
& ./scripts/verify-metro-preparation.ps1 -SkillRoots $reviewedRoots
& ./scripts/test-metro-preparation.ps1 -SkillRoots $reviewedRoots
```

The validator verifies the [content lock](../../agents/skills.lock.json) before checking exact source fields, stable IDs, ticket count and dependency graph. JSON object property order is ignored; array order is preserved. Missing files, content drift, omissions, unknown/reversed/cyclic blockers and identity drift fail visibly. The negative runner mutates temporary fixture copies only and verifies expected failure reasons; it never changes installed skills. A successful result proves this bounded example under the reviewed roots, not general conversion correctness.

Use the [skills guide](../../agents/skills.md) to review a different installation. Do not update hashes merely to silence failure. Use the [Plane guide](../../agents/plane.md) before any authorized live operation. These checks have no package dependency, network operation or application runtime.
