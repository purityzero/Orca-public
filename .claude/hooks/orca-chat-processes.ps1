param([int]$HookProcessId)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$processIndex = @{}
foreach ($entry in (Get-CimInstance Win32_Process)) {
    $processIndex[[int]$entry.ProcessId] = $entry
}
$chain = @()
$currentId = $HookProcessId
$seen = @{}
while ($currentId -gt 0 -and $processIndex.ContainsKey($currentId) -and !$seen.ContainsKey($currentId)) {
    $seen[$currentId] = $true
    $entry = $processIndex[$currentId]
    $chain += [pscustomobject]@{ name = $entry.Name; commandLine = $entry.CommandLine }
    $parentId = [int]$entry.ParentProcessId
    # PID가 재사용된 프로세스는 실제 조상으로 인정하지 않는다.
    if ($processIndex.ContainsKey($parentId) -and $processIndex[$parentId].CreationDate -gt $entry.CreationDate) { break }
    $currentId = $parentId
}
ConvertTo-Json -InputObject @($chain) -Compress
