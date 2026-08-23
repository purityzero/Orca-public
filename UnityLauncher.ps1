# Unity Hub에 등록된 프로젝트 목록을 읽어 선택 실행한다.
# Hub를 띄우지 않고 projects-v1.json만 읽으며, 프로젝트에 기록된 버전의 에디터로 실행한다.

$ErrorActionPreference = 'Stop'

$hubFile    = Join-Path $env:APPDATA 'UnityHub\projects-v1.json'
$editorRoot = 'C:\Program Files\Unity\Hub\Editor'

if (-not (Test-Path -LiteralPath $hubFile)) {
    Write-Host "Unity Hub 프로젝트 목록을 찾을 수 없습니다:" -ForegroundColor Red
    Write-Host "  $hubFile"
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

$raw  = Get-Content -LiteralPath $hubFile -Raw -Encoding UTF8 | ConvertFrom-Json
$node = $raw
if ($raw.PSObject.Properties.Name -contains 'data') { $node = $raw.data }

$projects = @()
foreach ($prop in $node.PSObject.Properties) {
    $entry = $prop.Value
    if ($null -eq $entry.path) { continue }

    $projects += [PSCustomObject]@{
        Title      = $entry.title
        Path       = $entry.path
        Version    = $entry.version
        Modified   = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$entry.lastModified).LocalDateTime
        Exists     = (Test-Path -LiteralPath $entry.path)
        EditorPath = Join-Path $editorRoot (Join-Path $entry.version 'Editor\Unity.exe')
    }
}

$projects = $projects | Sort-Object Modified -Descending

if ($projects.Count -le 0) {
    Write-Host "등록된 프로젝트가 없습니다." -ForegroundColor Yellow
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

# 같은 이름이 여러 개면 경로를 함께 보여줘 구분한다
$duplicateTitles = $projects | Group-Object Title | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }

Write-Host ""
Write-Host "  Unity 프로젝트 선택" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------------------------------"

for ($i = 0; $i -lt $projects.Count; $i++) {
    $item  = $projects[$i]
    $index = ($i + 1).ToString().PadLeft(2)
    $date  = $item.Modified.ToString('yyyy-MM-dd')

    $label = $item.Title
    if ($duplicateTitles -contains $item.Title) {
        $label = "$($item.Title)  ($(Split-Path $item.Path -Parent))"
    }

    $note  = ''
    $color = 'White'
    if (-not $item.Exists) {
        $note  = '  [폴더 없음]'
        $color = 'DarkGray'
    }
    elseif (-not (Test-Path -LiteralPath $item.EditorPath)) {
        $note  = "  [에디터 $($item.Version) 미설치]"
        $color = 'DarkYellow'
    }

    Write-Host ("  {0}. {1}  {2}  {3}{4}" -f $index, $date, $item.Version.PadRight(12), $label, $note) -ForegroundColor $color
}

Write-Host "  ---------------------------------------------------------------------"
$answer = Read-Host "  번호 입력 (그냥 엔터면 취소)"

if ([string]::IsNullOrWhiteSpace($answer)) {
    Write-Host "  취소했습니다."
    exit 0
}

$number = 0
if (-not [int]::TryParse($answer.Trim(), [ref]$number)) {
    Write-Host "  숫자를 입력해야 합니다." -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

if ($number -lt 1 -or $number -gt $projects.Count) {
    Write-Host "  1 ~ $($projects.Count) 범위를 벗어났습니다." -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

$target = $projects[$number - 1]

if (-not $target.Exists) {
    Write-Host "  프로젝트 폴더가 없습니다: $($target.Path)" -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

if (-not (Test-Path -LiteralPath $target.EditorPath)) {
    Write-Host "  에디터가 설치돼 있지 않습니다: $($target.EditorPath)" -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

Write-Host ""
Write-Host "  실행: $($target.Title)  ($($target.Version))" -ForegroundColor Green
Write-Host "  경로: $($target.Path)"

Start-Process -FilePath $target.EditorPath -ArgumentList @('-projectPath', $target.Path)

Write-Host ""
Write-Host "  Unity를 실행했습니다. MCP는 에디터 로드 후 자동 연결됩니다." -ForegroundColor Green
Write-Host "  (자동 연결이 안 되면 MCP for Unity 창 > Advanced >"
Write-Host "   'Auto-Start Server on Editor Load' 가 켜져 있는지 확인하세요.)"
Start-Sleep -Seconds 3
