#requires -Version 5.1
# 로그온 후 Unity 에디터를 미리 띄워둔다. 작업 스케줄러가 부른다.
#
# 왜 필요한가 — Unity MCP 브릿지는 **세션이 열릴 때 한 번만** 연결을 시도한다.
# Unity가 꺼진 상태로 Claude Code나 Codex 세션이 열리면 그 세션은 Play Mode 검증을
# 아예 못 하고, 뒤늦게 에디터를 켜도 스스로 재연결하지 않는다.
# 2026-09-11~13에 이 순서 때문에 QA가 네 번 막혔다. 세션 안에서는 못 푸는 문제라
# "세션보다 Unity가 먼저 떠 있게" 환경 쪽에서 막는다.
#
# 어느 프로젝트를 여는가 — Unity Hub의 최근 목록에서 **가장 최근에 만진 것**을 고른다.
# 특정 프로젝트를 박아두면 다른 프로젝트로 옮길 때 에디터를 닫아야 하고, 그러면 브릿지가
# 끊겨 같은 문제가 다시 생긴다.
#
# 제거: 시작 폴더의 Orca-StartUnity.vbs 를 지운다
#       (경로: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup)
#
# 작업 스케줄러(schtasks /sc onlogon)를 먼저 시도했으나 Access is denied 로 막혔다 —
# 로그온 트리거 등록은 관리자 권한을 요구한다. 시작 폴더는 사용자 권한으로 되므로 그쪽을 쓴다.

param(
    # 로그온 직후는 부팅 부하가 몰리는 구간이다. 무거운 에디터를 바로 띄우면 로그온이 느려지므로
    # 시작 폴더에서 부를 때는 여유를 준다. 수동 실행은 기본 0초라 바로 돈다.
    [int]$DelaySeconds = 0
)

$ErrorActionPreference = 'Stop'

if ($DelaySeconds -gt 0) {
    Start-Sleep -Seconds $DelaySeconds
}

$hubProjects = Join-Path $env:APPDATA 'UnityHub\projects-v1.json'
$opener = Join-Path $PSScriptRoot 'OpenUnityProject.ps1'

if (-not (Test-Path -LiteralPath $hubProjects)) {
    Write-Host "Unity Hub 목록이 없습니다: $hubProjects"
    exit 0
}
if (-not (Test-Path -LiteralPath $opener)) {
    Write-Host "OpenUnityProject.ps1 을 찾을 수 없습니다: $opener"
    exit 0
}

# Hub 목록은 BOM 이 붙어 있을 수 있어 그대로 ConvertFrom-Json 에 넣으면 깨진다.
$raw = [System.IO.File]::ReadAllText($hubProjects, [System.Text.UTF8Encoding]::new($false))
$raw = $raw -replace '^﻿', ''
$hub = $raw | ConvertFrom-Json

# projects-v1.json 의 data 는 "경로 -> 항목" 맵이다. 항목에 lastModified(ms)가 들어 있다.
$candidates = @()
foreach ($entry in $hub.data.PSObject.Properties) {
    $item = $entry.Value
    $projectPath = $item.path
    if ([string]::IsNullOrWhiteSpace($projectPath)) { continue }
    if (-not (Test-Path -LiteralPath $projectPath)) { continue }

    $stamp = 0
    if ($null -ne $item.lastModified) { $stamp = [double]$item.lastModified }

    $candidates += [pscustomobject]@{ Path = $projectPath; Stamp = $stamp }
}

if ($candidates.Count -le 0) {
    Write-Host "열 수 있는 프로젝트가 없습니다."
    exit 0
}

$target = ($candidates | Sort-Object -Property Stamp -Descending)[0].Path
Write-Host "가장 최근 프로젝트: $target"

# 이미 실행 중인지 판단은 OpenUnityProject.ps1 이 한다(중복 실행 방지 포함).
& powershell -NoProfile -ExecutionPolicy Bypass -File $opener -ProjectPath $target
