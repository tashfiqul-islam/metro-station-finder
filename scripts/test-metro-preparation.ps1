#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][hashtable]$SkillRoots)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$verifier = Join-Path $PSScriptRoot 'verify-metro-preparation.ps1'
$example = Join-Path $PSScriptRoot '../docs/examples/plane-preparation'
$lockPath = Join-Path $PSScriptRoot '../docs/agents/skills.lock.json'
& $verifier -SkillRoots $SkillRoots
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('metro-preparation-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    $cases = @(
        @{ Name='omitted criterion'; Message='array differs'; Mutate={param($s,$t,$l) $t.tickets[0].acceptanceCriteria=@()} },
        @{ Name='omitted seam'; Message='array differs'; Mutate={param($s,$t,$l) $t.tickets[0].testingSeams=@()} },
        @{ Name='unknown blocker'; Message='Unknown blocker'; Mutate={param($s,$t,$l) $s.slices[1].blockedBy=@('unknown')} },
        @{ Name='cyclic blockers'; Message='Cyclic blockers'; Mutate={param($s,$t,$l) $s.slices[0].blockedBy=@('fare')} },
        @{ Name='reversed prepared blocker'; Message='array differs'; Mutate={param($s,$t,$l) $t.tickets[0].blockedBy=@('fare'); $t.tickets[1].blockedBy=@()} },
        @{ Name='identity drift'; Message='Stable identity differs'; Mutate={param($s,$t,$l) $t.tickets[0].externalId='different'} },
        @{ Name='duplicate ticket'; Message='Unknown or duplicate ticket identity'; Mutate={param($s,$t,$l) $t.tickets[1]=$t.tickets[0]} },
        @{ Name='scope loss'; Message='array differs'; Mutate={param($s,$t,$l) $t.scope=@()} },
        @{ Name='hash drift'; Message='Skill hash drift'; Mutate={param($s,$t,$l) $l.files[0].sha256='0'*64} },
        @{ Name='missing skill'; Message='Missing skill file'; Mutate={param($s,$t,$l) $l.files[0].path='missing-metro-skill.md'} },
        @{ Name='path escape'; Message='Skill path escapes root'; Mutate={param($s,$t,$l) $l.files[0].path='../outside.md'} }
    )
    foreach ($case in $cases) {
        $source = Get-Content -LiteralPath (Join-Path $example 'source.json') -Raw | ConvertFrom-Json -AsHashtable
        $tickets = Get-Content -LiteralPath (Join-Path $example 'tickets.json') -Raw | ConvertFrom-Json -AsHashtable
        $lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json -AsHashtable
        & $case.Mutate $source $tickets $lock
        $sourceFile = Join-Path $temporary 'source.json'
        $ticketFile = Join-Path $temporary 'tickets.json'
        $lockFile = Join-Path $temporary 'lock.json'
        $source | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $sourceFile
        $tickets | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $ticketFile
        $lock | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $lockFile
        $failure = $null
        try { & $verifier -SkillRoots $SkillRoots -SourcePath $sourceFile -TicketsPath $ticketFile -LockPath $lockFile | Out-Null }
        catch { $failure = $_.Exception.Message }
        if (!$failure -or !$failure.Contains($case.Message)) { throw "Case '$($case.Name)' did not fail as expected: $failure" }
        Write-Output "PASS negative: $($case.Name)"
    }
    Write-Output "PASS: $($cases.Count) scoped negative cases. Installed files unchanged."
} finally {
    # Delete only this run's verified direct child of the system temporary directory.
    $resolved = [IO.Path]::GetFullPath($temporary)
    if ([IO.Path]::GetDirectoryName($resolved) -ne [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\','/')) { throw 'Unsafe temporary cleanup path' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
