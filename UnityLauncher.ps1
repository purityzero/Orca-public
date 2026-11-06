# Unity Hub에 등록된 프로젝트 목록을 읽어 선택 실행한다.
# Hub를 띄우지 않고 JSON/SQLite 목록을 공용 도우미로 읽는다.

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'tools\UnityHub.ps1')
$hub = Get-OrcaUnityHub
$projects = @($hub.projects | ForEach-Object {
    $resolved = Get-OrcaUnityHub -ProjectPath $_.path
    [PSCustomObject]@{
        Title = $_.title
        Path = $_.path
        Version = $(if ($resolved.version) { $resolved.version } else { '?' })
        Modified = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$_.lastModified).LocalDateTime
        Exists = (Test-Path -LiteralPath $_.path)
        EditorPath = $resolved.editorPath
    }
})

$projects = @($projects | Sort-Object Modified -Descending)

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
    elseif (-not ($item.EditorPath -and (Test-Path -LiteralPath $item.EditorPath))) {
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

& (Join-Path $PSScriptRoot 'OpenUnityProject.ps1') -ProjectPath $target.Path
exit $LASTEXITCODE
