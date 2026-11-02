#Requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][hashtable]$SkillRoots,
    [string]$SourcePath = "$PSScriptRoot/../docs/examples/plane-preparation/source.json",
    [string]$TicketsPath = "$PSScriptRoot/../docs/examples/plane-preparation/tickets.json",
    [string]$LockPath = "$PSScriptRoot/../docs/agents/skills.lock.json"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Read-Json([string]$Path) { Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable }
function Require([bool]$Condition, [string]$Message) { if (!$Condition) { throw $Message } }
function Has-Text($Value) { return ($Value -is [string] -and ![string]::IsNullOrWhiteSpace($Value)) }
function Equal-Data($Left, $Right, [string]$Label) {
    # Compare recursively, independent of JSON property order; array order is contractual.
    if ($Left -is [System.Collections.IDictionary]) {
        Require ($Right -is [System.Collections.IDictionary]) "$Label differs"
        Require ($Left.Count -eq $Right.Count) "$Label fields differ"
        foreach ($key in $Left.Keys) {
            Require ($Right.Contains($key)) "$Label missing $key"
            Equal-Data $Left[$key] $Right[$key] "$Label.$key"
        }
    } elseif ($Left -is [array]) {
        Require ($Right -is [array] -and $Left.Count -eq $Right.Count) "$Label array differs"
        for ($i = 0; $i -lt $Left.Count; $i++) { Equal-Data $Left[$i] $Right[$i] "$Label[$i]" }
    } else { Require ($Left -ceq $Right) "$Label differs" }
}
$lock = Read-Json $LockPath
Require ($lock.schemaVersion -eq 1 -and $lock.files.Count -gt 0) 'Invalid skill lock'
foreach ($file in $lock.files) {
    Require ($SkillRoots.ContainsKey($file.root)) "Missing skill root: $($file.root)"
    $root = [IO.Path]::GetFullPath($SkillRoots[$file.root])
    $path = [IO.Path]::GetFullPath((Join-Path $root $file.path))
    Require ($path.StartsWith($root.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) 'Skill path escapes root'
    Require (Test-Path -LiteralPath $path -PathType Leaf) "Missing skill file: $($file.path)"
    Require ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ceq $file.sha256) "Skill hash drift: $($file.path)"
}
$source = Read-Json $SourcePath
$prepared = Read-Json $TicketsPath
Require ($source.schemaVersion -eq 1 -and $prepared.schemaVersion -eq 1) 'Unsupported preparation schema'
foreach ($field in @('specification','scope','exclusions','grouping')) {
    Require ($source.ContainsKey($field)) "Source missing $field"
    Equal-Data $source[$field] $prepared[$field] $field
}
foreach ($field in @('id','revision','url')) { Require (Has-Text $source.specification[$field]) "Specification missing $field" }
Require ($source.scope.Count -gt 0 -and $source.exclusions.Count -gt 0) 'Missing scope/exclusions'
foreach ($field in @('module','milestone','release')) { Require (Has-Text $source.grouping[$field]) "Grouping missing $field" }
Require ($source.slices.Count -ge 2 -and $prepared.tickets.Count -eq $source.slices.Count) 'Ticket count differs or sample lacks two slices'
$ids = @{}
foreach ($slice in $source.slices) {
    foreach ($field in @('id','title','outcome')) { Require (Has-Text $slice[$field]) "Slice missing $field" }
    Require (!$ids.ContainsKey($slice.id)) "Duplicate slice identity: $($slice.id)"
    $ids[$slice.id] = $slice
    Require ($slice.scope.Count -gt 0 -and $slice.exclusions.Count -gt 0) 'Slice scope/exclusions missing'
    Require ($slice.acceptanceCriteria.Count -gt 0) 'Missing acceptance criteria'
    Require ($slice.testingSeams.Count -gt 0) 'Missing testing seams'
    foreach ($criterion in $slice.acceptanceCriteria) {
        foreach ($field in @('id','given','when','then')) { Require (Has-Text $criterion[$field]) "Acceptance missing $field" }
        Require ($criterion.failureChecks.Count -gt 0) 'Missing failure checks'
        foreach ($check in $criterion.failureChecks) { Require (Has-Text $check) 'Empty failure check' }
    }
    foreach ($seam in $slice.testingSeams) {
        foreach ($field in @('id','boundary','fixture')) { Require (Has-Text $seam[$field]) "Seam missing $field" }
        Require ($seam.checks.Count -gt 0) 'Missing seam checks'
        foreach ($check in $seam.checks) { Require (Has-Text $check) 'Empty seam check' }
    }
    Require ($slice.ContainsKey('blockedBy') -and $slice.blockedBy -is [array]) 'Missing blocker list'
}
$visited = @{}; $active = @{}
function Visit([string]$Id) {
    Require (!$active.ContainsKey($Id)) "Cyclic blockers: $Id"
    if ($visited.ContainsKey($Id)) { return }
    $active[$Id] = $true
    foreach ($blocker in $ids[$Id].blockedBy) {
        Require ($ids.ContainsKey($blocker)) "Unknown blocker: $blocker"
        Visit $blocker
    }
    $active.Remove($Id); $visited[$Id] = $true
}
foreach ($id in $ids.Keys) { Visit $id }
$seen = @{}
foreach ($ticket in $prepared.tickets) {
    Require ($ids.ContainsKey($ticket.id) -and !$seen.ContainsKey($ticket.id)) 'Unknown or duplicate ticket identity'
    $seen[$ticket.id] = $true
    Require ($ticket.externalSource -ceq 'metro-spec') 'External source differs'
    Require ($ticket.externalId -ceq "$($source.specification.id)/$($ticket.id)") 'Stable identity differs'
    $copy = @{} + $ticket
    $copy.Remove('externalSource'); $copy.Remove('externalId')
    Equal-Data $ids[$ticket.id] $copy "ticket.$($ticket.id)"
}
Write-Output "PASS: $($lock.files.Count) skill files; $($prepared.tickets.Count) tickets; fields, identities and blocker graph preserved. No network operations."
