# 지정한 Unity 프로젝트를 해당 버전 에디터로 연다.
# 세션에서 프로젝트를 고른 직후 호출한다. 이미 그 프로젝트로 켜져 있으면 아무것도 하지 않는다.
#
# 사용: powershell -NoProfile -ExecutionPolicy Bypass -File OpenUnityProject.ps1 -ProjectPath "D:\Unity\...\Project"

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
)

$ErrorActionPreference = 'Stop'

$hubFile    = Join-Path $env:APPDATA 'UnityHub\projects-v1.json'
$editorRoot = 'C:\Program Files\Unity\Hub\Editor'

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    Write-Host "프로젝트 폴더가 없습니다: $ProjectPath" -ForegroundColor Red
    exit 1
}

$resolvedPath = (Resolve-Path -LiteralPath $ProjectPath).Path

# 이미 같은 프로젝트로 에디터가 떠 있으면 다시 띄우지 않는다.
$running = @(Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($resolvedPath.ToLower()) })

if ($running.Count -gt 0) {
    Write-Host "이미 실행 중입니다 (PID $($running[0].ProcessId)): $resolvedPath" -ForegroundColor Yellow
    exit 0
}

# Hub 목록에서 이 프로젝트에 기록된 에디터 버전을 찾는다.
$version = $null
if (Test-Path -LiteralPath $hubFile) {
    $raw  = Get-Content -LiteralPath $hubFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $node = $raw
    if ($raw.PSObject.Properties.Name -contains 'data') { $node = $raw.data }

    foreach ($prop in $node.PSObject.Properties) {
        $entry = $prop.Value
        if ($null -eq $entry.path) { continue }
        if ($entry.path.ToLower().TrimEnd('\', '/') -eq $resolvedPath.ToLower().TrimEnd('\', '/')) {
            $version = $entry.version
            break
        }
    }
}

if ([string]::IsNullOrWhiteSpace($version)) {
    Write-Host "Unity Hub 목록에서 에디터 버전을 찾지 못했습니다: $resolvedPath" -ForegroundColor Red
    exit 1
}

$editorPath = Join-Path $editorRoot (Join-Path $version 'Editor\Unity.exe')
if (-not (Test-Path -LiteralPath $editorPath)) {
    Write-Host "에디터가 설치돼 있지 않습니다: $editorPath" -ForegroundColor Red
    exit 1
}

Start-Process -FilePath $editorPath -ArgumentList @('-projectPath', $resolvedPath)
Write-Host "실행: $resolvedPath (Unity $version)" -ForegroundColor Green
Write-Host "MCP는 에디터 로드 후 자동 연결됩니다."
exit 0
