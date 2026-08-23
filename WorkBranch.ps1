# Unity 프로젝트 작업 브랜치 관리 — 검증 전 변경은 main에 올리지 않기 위한 도구.
#
#   시작 : main에서 work/{날짜}-{주제} 브랜치를 만들고 전환
#   상태 : 지금 어느 브랜치에서 뭘 하고 있는지, main 대비 얼마나 벌어졌는지
#   병합 : 검증을 통과한 브랜치를 main에 --no-ff 로 합류
#
# 대상 프로젝트 경로는 LocalPaths.json 에서 읽는다(PC마다 다르므로).
# 브랜치 폐기(git branch -D)는 되돌릴 수 없어 일부러 넣지 않았다 — WorkBranchFlow.MD 참고.

$ErrorActionPreference = 'Stop'

$orcaRoot   = $PSScriptRoot
$configFile = Join-Path $orcaRoot 'LocalPaths.json'

# ---------------------------------------------------------------------------
# git 실행 파일 찾기 (PATH에 없을 수도 있다)
# ---------------------------------------------------------------------------
function Resolve-GitPath {
    $command = Get-Command git -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }

    $fallbacks = @(
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files (x86)\Git\cmd\git.exe',
        (Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd\git.exe')
    )
    foreach ($candidate in $fallbacks) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

$gitPath = Resolve-GitPath
if ($null -eq $gitPath) {
    Write-Host "  git을 찾을 수 없습니다. Git for Windows를 설치하거나 PATH에 추가하세요." -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

function Invoke-Git {
    param([string]$RepoPath, [string[]]$Arguments)
    $all = @('-C', $RepoPath) + $Arguments
    & $gitPath @all
}

# ---------------------------------------------------------------------------
# 대상 프로젝트 고르기
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $configFile)) {
    Write-Host "  LocalPaths.json 이 없습니다. 먼저 SetupLocalPaths.cmd 를 실행하세요." -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

$config   = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
$projects = @()

foreach ($prop in $config.projects.PSObject.Properties) {
    if ([string]::IsNullOrWhiteSpace($prop.Value)) { continue }
    if (-not (Test-Path -LiteralPath $prop.Value)) { continue }
    if (-not (Test-Path -LiteralPath (Join-Path $prop.Value '.git'))) { continue }

    $projects += [PSCustomObject]@{ Name = $prop.Name; Path = $prop.Value }
}

if ($projects.Count -le 0) {
    Write-Host "  LocalPaths.json 에 쓸 수 있는 git 프로젝트가 없습니다." -ForegroundColor Red
    Read-Host "`n엔터를 누르면 종료합니다"
    exit 1
}

$project = $projects[0]

if ($projects.Count -gt 1) {
    Write-Host ""
    Write-Host "  프로젝트 선택" -ForegroundColor Cyan
    for ($i = 0; $i -lt $projects.Count; $i++) {
        Write-Host ("  {0}. {1}  ({2})" -f ($i + 1), $projects[$i].Name, $projects[$i].Path)
    }

    $answer = (Read-Host "  번호 입력").Trim()
    $number = 0
    if (-not [int]::TryParse($answer, [ref]$number) -or $number -lt 1 -or $number -gt $projects.Count) {
        Write-Host "  잘못된 입력입니다." -ForegroundColor Red
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 1
    }
    $project = $projects[$number - 1]
}

$repo = $project.Path

# 기준 브랜치 이름 — 저장소마다 main / master 가 다를 수 있다
$baseBranch = 'main'
if ([string]::IsNullOrWhiteSpace((Invoke-Git $repo @('branch', '--list', 'main')))) {
    if (-not [string]::IsNullOrWhiteSpace((Invoke-Git $repo @('branch', '--list', 'master')))) {
        $baseBranch = 'master'
    }
}

# ---------------------------------------------------------------------------
# 현재 상태 출력
# ---------------------------------------------------------------------------
function Show-Status {
    $branch    = (Invoke-Git $repo @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
    $dirtyList = @(Invoke-Git $repo @('status', '--porcelain'))

    Write-Host ""
    Write-Host "  [$($project.Name)]  $repo" -ForegroundColor Cyan
    Write-Host "  ---------------------------------------------------------------------"
    Write-Host "  현재 브랜치 : $branch"
    Write-Host "  미커밋 변경 : $($dirtyList.Count) 개"

    if ($branch -ne $baseBranch) {
        $ahead  = (Invoke-Git $repo @('rev-list', '--count', "$baseBranch..$branch")).Trim()
        $behind = (Invoke-Git $repo @('rev-list', '--count', "$branch..$baseBranch")).Trim()
        Write-Host "  $baseBranch 대비   : 앞선 커밋 $ahead / 뒤처진 커밋 $behind"
    }
    Write-Host "  ---------------------------------------------------------------------"

    return $branch
}

$currentBranch = Show-Status

# ---------------------------------------------------------------------------
# 메뉴
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  1. 새 작업 브랜치 시작 ($baseBranch 기준)"
Write-Host "  2. 검증 통과 → $baseBranch 에 병합"
Write-Host "  3. 상태만 다시 보기"
Write-Host "  q. 종료"
Write-Host ""

$menu = (Read-Host "  선택").Trim().ToLower()

if ($menu -eq 'q' -or [string]::IsNullOrWhiteSpace($menu)) {
    exit 0
}

if ($menu -eq '3') {
    Invoke-Git $repo @('status', '--short')
    Read-Host "`n  엔터를 누르면 종료합니다"
    exit 0
}

# ---------------------------------------------------------------------------
# 1. 새 작업 브랜치 시작
# ---------------------------------------------------------------------------
if ($menu -eq '1') {

    $topic = (Read-Host "  작업 주제 (영문/숫자, 예: balance-retune)").Trim()
    if ([string]::IsNullOrWhiteSpace($topic)) {
        Write-Host "  주제가 없어 취소합니다." -ForegroundColor Yellow
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 0
    }

    $topic  = ($topic -replace '[^A-Za-z0-9\-_]', '-') -replace '-+', '-'
    $branch = "work/{0}-{1}" -f (Get-Date -Format 'yyyy-MM-dd'), $topic.Trim('-')

    $existing = (Invoke-Git $repo @('branch', '--list', $branch))
    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        Write-Host "  이미 있는 브랜치입니다: $branch" -ForegroundColor Red
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 1
    }

    $dirtyList = @(Invoke-Git $repo @('status', '--porcelain'))
    if ($dirtyList.Count -gt 0) {
        Write-Host ""
        Write-Host "  미커밋 변경 $($dirtyList.Count) 개가 새 브랜치로 함께 넘어갑니다." -ForegroundColor DarkYellow
        Write-Host "  (파일은 그대로 두고 브랜치만 바뀌므로 잃는 건 없습니다)"
    }

    if ($currentBranch -ne $baseBranch) {
        Write-Host ""
        Write-Host "  지금 $baseBranch 이 아니라 '$currentBranch' 입니다." -ForegroundColor DarkYellow
        $goBase = (Read-Host "  $baseBranch 기준으로 새로 뻗으려면 y, 현재 브랜치 기준이면 n").Trim().ToLower()

        if ($goBase -eq 'y') {
            Invoke-Git $repo @('switch', $baseBranch)
        }
    }

    Write-Host ""
    Write-Host "  Unity 에디터가 열려 있으면 전환 직후 리임포트/재컴파일이 한 번 돕니다." -ForegroundColor DarkGray

    Invoke-Git $repo @('switch', '-c', $branch)

    Write-Host ""
    Write-Host "  작업 브랜치 시작: $branch" -ForegroundColor Green
    Write-Host "  검증이 끝나면 이 스크립트를 다시 열어 2번(병합)을 고르세요."
    Read-Host "`n  엔터를 누르면 종료합니다"
    exit 0
}

# ---------------------------------------------------------------------------
# 2. main 에 병합
# ---------------------------------------------------------------------------
if ($menu -eq '2') {

    if ($currentBranch -notlike 'work/*') {
        Write-Host "  작업 브랜치(work/...)에 있을 때만 병합할 수 있습니다. 지금은 '$currentBranch'." -ForegroundColor Red
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 1
    }

    $dirtyList = @(Invoke-Git $repo @('status', '--porcelain'))
    if ($dirtyList.Count -gt 0) {
        Write-Host ""
        Write-Host "  미커밋 변경 $($dirtyList.Count) 개가 남아 있습니다. 먼저 커밋하세요." -ForegroundColor Red
        Invoke-Git $repo @('status', '--short')
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 1
    }

    $ahead = (Invoke-Git $repo @('rev-list', '--count', "$baseBranch..$currentBranch")).Trim()
    if ($ahead -eq '0') {
        Write-Host "  $baseBranch 보다 앞선 커밋이 없어 병합할 게 없습니다." -ForegroundColor Yellow
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 0
    }

    Write-Host ""
    Write-Host "  병합할 커밋 $ahead 개:" -ForegroundColor Cyan
    Invoke-Git $repo @('log', '--oneline', "$baseBranch..$currentBranch")

    Write-Host ""
    Write-Host "  검증 체크리스트 (WorkBranchFlow.MD 참고)" -ForegroundColor Cyan
    Write-Host "   - 재컴파일 에러 0건"
    Write-Host "   - Play Mode 로 실제 동작 확인"
    Write-Host "   - (CSV 를 고쳤다면) 테이블-Record 컬럼 일치"
    Write-Host "   - 관련 .claude/class, .claude/prefab md 기록 갱신"
    Write-Host ""

    $confirm = (Read-Host "  위 검증을 모두 통과했습니까? 통과했으면 y").Trim().ToLower()
    if ($confirm -ne 'y') {
        Write-Host "  병합하지 않고 종료합니다. 작업 브랜치는 그대로 남아 있습니다." -ForegroundColor Yellow
        Read-Host "`n엔터를 누르면 종료합니다"
        exit 0
    }

    Write-Host ""
    Write-Host "  Unity 에디터가 열려 있으면 전환 직후 리임포트/재컴파일이 한 번 돕니다." -ForegroundColor DarkGray

    Invoke-Git $repo @('switch', $baseBranch)
    Invoke-Git $repo @('merge', '--no-ff', $currentBranch, '-m', "$currentBranch 검증 완료 후 합류")

    Write-Host ""
    Write-Host "  $baseBranch 에 병합했습니다." -ForegroundColor Green
    Write-Host "  작업 브랜치 '$currentBranch' 는 지우지 않고 남겨둡니다(되돌릴 때 필요)."
    Write-Host "  원격에 올리려면: git -C `"$repo`" push origin $baseBranch"
    Read-Host "`n  엔터를 누르면 종료합니다"
    exit 0
}

Write-Host "  알 수 없는 선택입니다." -ForegroundColor Red
Read-Host "`n엔터를 누르면 종료합니다"
exit 1
