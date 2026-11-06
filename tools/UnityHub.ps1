# Node 도우미를 정본으로 삼아 PowerShell에서도 같은 목록을 읽는다.
function Get-OrcaUnityHub {
    param([string]$ProjectPath)
    $reader = Join-Path $PSScriptRoot 'unity-hub.js'
    $previousEncoding = [Console]::OutputEncoding
    try {
        [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
        if ($ProjectPath) { $json = & node $reader --resolve $ProjectPath }
        else { $json = & node $reader }
        if ($LASTEXITCODE -ne 0) { throw 'Unity Hub 공용 조회 도우미 실행 실패' }
        return ($json | ConvertFrom-Json)
    }
    finally { [Console]::OutputEncoding = $previousEncoding }
}
