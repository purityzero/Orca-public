# 이 PC에서의 Unity 프로젝트 '원본' 경로를 찾아 LocalPaths.json 으로 저장한다.
# 프로젝트 원본 위치는 PC마다 다르므로 git에 커밋하지 않고 여기서 매번 만든다.
# Unity Hub에 등록된 목록(projects-v1.json)에서 후보를 뽑아 보여주고, 고른 것을 기록한다.

$ErrorActionPreference = 'Stop'

$orcaRoot   = $PSScriptRoot
$configFile = Join-Path $orcaRoot 'LocalPaths.json'
$unityDir   = Join-Path $orcaRoot 'Unity'
$hubFile    = Join-Path $env:APPDATA 'UnityHub\projects-v1.json'

# ---------------------------------------------------------------------------
# 1. Orca가 관리하는 프로젝트 목록 = Unity\ 아래 폴더명
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $unityDir)) {
    Write-Host "Unity 폴더를 찾을 수 없습니다: $unityDir" -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

$projectNames = @(Get-ChildItem -LiteralPath $unityDir -Directory | Select-Object -ExpandProperty Name | Sort-Object)

if ($projectNames.Count -le 0) {
    Write-Host "Unity\ 아래에 프로젝트 폴더가 없습니다." -ForegroundColor Yellow
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Unity Hub 등록 목록 읽기 (없어도 직접 입력으로 진행 가능)
# ---------------------------------------------------------------------------
$hubEntries = @()

if (Test-Path -LiteralPath $hubFile) {
    $raw  = Get-Content -LiteralPath $hubFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $node = $raw
    if ($raw.PSObject.Properties.Name -contains 'data') { $node = $raw.data }

    foreach ($prop in $node.PSObject.Properties) {
        $entry = $prop.Value
        if ($null -eq $entry.path) { continue }

        $hubEntries += [PSCustomObject]@{
            Title       = $entry.title
            ProjectName = $entry.projectName
            Path        = $entry.path
            Version     = $entry.version
            Modified    = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$entry.lastModified).LocalDateTime
            Exists      = (Test-Path -LiteralPath $entry.path)
        }
    }
}
else {
    Write-Host "Unity Hub 목록이 없습니다($hubFile) — 경로를 직접 입력해야 합니다." -ForegroundColor DarkYellow
}

# ---------------------------------------------------------------------------
# 3. 기존 설정이 있으면 기본값으로 재사용
# ---------------------------------------------------------------------------
$previous = @{}

if (Test-Path -LiteralPath $configFile) {
    $old = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -ne $old.projects) {
        foreach ($prop in $old.projects.PSObject.Properties) {
            $previous[$prop.Name] = $prop.Value
        }
    }
}

# ---------------------------------------------------------------------------
# 4. 프로젝트별로 후보를 보여주고 선택받는다
# ---------------------------------------------------------------------------
$resolved = [ordered]@{}

foreach ($projectName in $projectNames) {

    $candidates = @($hubEntries |
        Where-Object { $_.Exists -eq $true -and ($_.Title -eq $projectName -or $_.ProjectName -eq $projectName) } |
        Sort-Object Modified -Descending)

    $current = $null
    if ($previous.ContainsKey($projectName)) { $current = $previous[$projectName] }

    Write-Host ""
    Write-Host "  [$projectName]" -ForegroundColor Cyan
    Write-Host "  ---------------------------------------------------------------------"

    if ($null -ne $current) {
        Write-Host "  현재 설정: $current" -ForegroundColor DarkGray
    }

    if ($candidates.Count -le 0) {
        Write-Host "  Unity Hub에서 후보를 찾지 못했습니다." -ForegroundColor DarkYellow
    }
    else {
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            $item  = $candidates[$i]
            $index = ($i + 1).ToString().PadLeft(2)
            $date  = $item.Modified.ToString('yyyy-MM-dd')

            $note = ''
            if (-not (Test-Path -LiteralPath (Join-Path $item.Path 'Assets'))) {
                $note = '  [Assets 없음 — Unity 프로젝트가 아닐 수 있음]'
            }

            Write-Host ("  {0}. {1}  {2}  {3}{4}" -f $index, $date, $item.Version.PadRight(12), $item.Path, $note)
        }
    }

    Write-Host "   d. 경로 직접 입력"
    Write-Host "   n. 이 PC에 없음 (null 로 기록)"
    Write-Host "  ---------------------------------------------------------------------"

    $prompt = "  선택"
    if ($null -ne $current) { $prompt = "  선택 (그냥 엔터면 현재 설정 유지)" }
    elseif ($candidates.Count -eq 1) { $prompt = "  선택 (그냥 엔터면 1번)" }

    $answer = (Read-Host $prompt).Trim()

    # 입력 없음 → 현재 설정 유지, 없으면 후보 1개일 때만 그것으로
    if ([string]::IsNullOrWhiteSpace($answer)) {
        if ($null -ne $current) {
            $resolved[$projectName] = $current
            Write-Host "  유지: $current" -ForegroundColor Green
            continue
        }
        if ($candidates.Count -eq 1) {
            $resolved[$projectName] = $candidates[0].Path
            Write-Host "  선택: $($candidates[0].Path)" -ForegroundColor Green
            continue
        }

        $resolved[$projectName] = $null
        Write-Host "  건너뜀 (null)" -ForegroundColor DarkYellow
        continue
    }

    if ($answer -eq 'n') {
        $resolved[$projectName] = $null
        Write-Host "  없음으로 기록 (null)" -ForegroundColor DarkYellow
        continue
    }

    if ($answer -eq 'd') {
        $manual = (Read-Host "  프로젝트 경로 입력").Trim().Trim('"')

        if ([string]::IsNullOrWhiteSpace($manual)) {
            $resolved[$projectName] = $null
            Write-Host "  입력이 없어 null 로 기록합니다." -ForegroundColor DarkYellow
            continue
        }
        if (-not (Test-Path -LiteralPath $manual)) {
            Write-Host "  경로가 존재하지 않습니다: $manual" -ForegroundColor Red
        }
        elseif (-not (Test-Path -LiteralPath (Join-Path $manual 'Assets'))) {
            Write-Host "  Assets 폴더가 없습니다 — Unity 프로젝트 루트가 맞는지 확인하세요." -ForegroundColor DarkYellow
        }

        $resolved[$projectName] = $manual
        Write-Host "  기록: $manual" -ForegroundColor Green
        continue
    }

    $number = 0
    if (-not [int]::TryParse($answer, [ref]$number)) {
        Write-Host "  알 수 없는 입력이라 건너뜁니다." -ForegroundColor Red
        $resolved[$projectName] = $current
        continue
    }
    if ($number -lt 1 -or $number -gt $candidates.Count) {
        Write-Host "  1 ~ $($candidates.Count) 범위를 벗어나 건너뜁니다." -ForegroundColor Red
        $resolved[$projectName] = $current
        continue
    }

    $resolved[$projectName] = $candidates[$number - 1].Path
    Write-Host "  선택: $($candidates[$number - 1].Path)" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 5. 저장 — BOM 없는 UTF-8 (다른 도구도 읽을 수 있게)
# ---------------------------------------------------------------------------
$output = [PSCustomObject]@{ projects = [PSCustomObject]$resolved } | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($configFile, $output, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "  저장했습니다: $configFile" -ForegroundColor Green
foreach ($projectName in $resolved.Keys) {
    $value = $resolved[$projectName]
    if ($null -eq $value) {
        Write-Host ("    {0} : (없음)" -f $projectName) -ForegroundColor DarkGray
    }
    else {
        Write-Host ("    {0} : {1}" -f $projectName, $value)
    }
}

Write-Host ""
Read-Host "  엔터를 누르면 종료합니다"
