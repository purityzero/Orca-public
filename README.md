# Orca 워크스페이스

**이게 뭔가:** `C:\Orca`는 Unity 게임 프로젝트(GeometryDefender, HouseRulez)를 Claude Code + Orca 앱으로 관리하기 위한 **메타 작업공간**이다. 게임 코드 자체는 여기 없다(`C:\Unity\...`에 따로 있음) — 여긴 코딩 규칙, 서브에이전트 정의, 프로젝트 문서(class/prefab/design/qa), 실행 스크립트, 운용 원칙 문서를 모아둔 곳이다.

**작성일:** 2026-08-22
**GitHub:** https://github.com/purityzero/Orca (private) — 여러 PC에서 이 폴더를 clone해서 같은 상태로 이어 쓸 수 있다.

---

## 1. 빠른 시작

### 새 PC에서 처음 셋업할 때
```bash
git clone https://github.com/purityzero/Orca.git C:\Orca
```
그 다음 `UnityLauncher.MD` §3(설치 절차)을 따라 `.ps1` 인코딩만 확인하면 끝.

### 평소 실행 순서
1. 바탕화면 바로가기(또는 `OrcaStart.cmd` 직접 실행) 클릭
2. Unity 프로젝트 번호 선택 → 해당 버전 에디터 자동 실행 → MCP for Unity 자동 연결(전역 설정 켜둠)
3. Orca 앱이 뒤이어 자동으로 뜸 (Unity 로딩과 병렬)

상세 메커니즘은 `UnityLauncher.MD` 참고.

### 새 세션에서 이어서 작업할 때
1. 이 워크스페이스 자체의 미완료 항목은 §5 "알려진 이슈"부터 확인
2. 작업 대상이 특정 프로젝트(GeometryDefender/HouseRulez)면 `Unity\{프로젝트명}\.claude\UNFINISHED.md`도 확인
3. `ParallelWorkContract.MD` §0~§2에서 Orca 모델·Unity 제약 전체 맥락 파악

---

## 2. 폴더 구조

```
C:\Orca\
├── README.md                    ← 이 문서 (전체 사용법)
├── CLAUDE.md                    ← 행동 지침 (같이 읽을 파일: CODE/PREFAB/AGENT)
├── CODE.MD                      ← C#/Unity 코딩 규칙 (네이밍, 스타일 등)
├── PREFAB.MD                    ← 프리팹/UI 컴포넌트 규칙
├── AGENT.MD                     ← 서브에이전트 8개 라우팅 기준(누구를 언제 부를지)
│
├── ParallelWorkContract.MD      ← Orca 모델·Unity 제약·병렬 레인 분할/평가 계약 (Main→워커 핸드오프 규격)
│
├── UnityLauncher.MD             ← 런처 동작 원리·검증 기록
├── UnityLauncher.ps1            ← 런처 스크립트 본체
├── UnityLauncher.cmd            ← 런처 실행 진입점
├── OrcaStart.cmd                ← "Unity 실행 → Orca 실행" 묶음 시퀀스
│
├── agents\                      ← 서브에이전트 정의 8개, **마스터**
│   ├── code-architect.md        (설계, opus/high)
│   ├── code-writer.md           (구현, sonnet/low)
│   ├── client-bugfixer.md       (버그 수정-큰 범위, sonnet/medium)
│   ├── quick-fix.md             (버그 수정-작은 범위, haiku/low)
│   ├── qa-tester.md             (QA-큰 범위, opus/high, maxTurns 80)
│   ├── qa-quick-check.md        (QA-작은 범위, sonnet/medium, maxTurns 45)
│   ├── design-planner.md        (기획, opus/high)
│   └── design-issue-resolver.md (밸런스 반영, sonnet/medium)
│
├── rules\
│   └── glory.md                 ← Glory 공용 라이브러리 사용 지침, **마스터 보관용**
│                                    (frontmatter의 paths가 Assets/Scripts 전용이라 여기선 발동 안 함)
│
└── Unity\                       ← 프로젝트별 문서 사본 (정본은 여기)
    ├── README.md                ← 이 폴더 전용 상세 설명(마스터-사본 규칙, 동기화 함정)
    ├── GeometryDefender\.claude\
    │   ├── agents\ (8)           ← 마스터 + 이 프로젝트 전용 노하우 병합본
    │   ├── class\ (100+)         ← 클래스별 기록
    │   ├── prefab\ (20+)         ← 프리팹별 기록
    │   ├── design\ (5)           ← 기획 스펙
    │   ├── qa\ (2)               ← client-issues.md / design-issues.md
    │   ├── rules\glory.md
    │   ├── UNFINISHED.md         ← 이 프로젝트(GeometryDefender)의 미완료 작업
    │   └── settings.local.json
    └── HouseRulez\.claude\
        ├── agents\ (8)
        ├── class\ (5)
        ├── rules\glory.md
        ├── UNFINISHED.md         ← 이 프로젝트(HouseRulez)의 미완료 작업
        └── settings.local.json

C:\Unity\GeometryDefender\.claude\        ← 실제 Unity 에디터가 읽는 원본 (게임 코드도 여기)
C:\Unity\HouseRules\HouseRulez\.claude\   ← 실제 Unity 에디터가 읽는 원본 (게임 코드도 여기)
```

> `Unity\` 폴더 자체의 정본 규칙·동기화 함정·마스터 관계는 **`Unity\README.md`에 훨씬 상세히** 정리돼 있다 — 프로젝트 문서를 실제로 갱신하기 전엔 그 문서부터 읽을 것.

---

## 3. 문서 지도 — 뭘 언제 읽나

| 문서 | 언제 읽나 |
|---|---|
| `CLAUDE.md`/`CODE.MD`/`PREFAB.MD`/`AGENT.MD` | 어떤 세션이든 항상(자동 로드) — 코딩/행동 규칙 |
| 이 문서 §5 "알려진 이슈" | 세션 시작 시 항상 — Orca 자체의 미완료 작업 |
| `Unity\{P}\.claude\UNFINISHED.md` | 특정 프로젝트 작업 시작 시 |
| `ParallelWorkContract.MD` | 레인 2개 이상으로 병렬 작업을 짤 때, 또는 Orca/Unity CLI 모델 자체를 다시 확인할 때 (특히 §11 이름 기반 소프트 락) |
| `UnityLauncher.MD` | 런처가 이상하게 동작하거나 새 PC에 셋업할 때 |
| `Unity\README.md` | 프로젝트 문서(class/prefab/agents 등)를 갱신하기 전에 항상 |
| `Unity\{P}\.claude\class\{Class}.md` | 그 클래스를 수정하기 전에 항상 (없으면 수정 후 생성) |

---

## 4. 핵심 원칙 요약 (각 문서에 상세 근거 있음)

1. **정본 위치가 종류별로 다르다** — 코딩 규칙은 루트 1부, 에이전트 정의는 `agents\`가 마스터(단 실제 실행엔 프로젝트 로컬 사본이 필요), 프로젝트 문서는 `Unity\{P}\.claude\`가 정본이고 `C:\Unity\{P}\.claude\`(원본)는 그 시점 스냅샷. (`Unity\README.md` 참고)
2. **에이전트를 실행하기 전엔 이름에 프로젝트명을 붙인다** — `{ProjectName}_{ClassName}_class` 형식. GeometryDefender/HouseRulez가 같은 "Glory" 라이브러리를 써서 클래스명이 겹치기 때문. 스폰 전 `ListAgents`로 같은 이름이 이미 실행 중이면 대기한다. (`ParallelWorkContract.MD` §8)
3. **Unity 에디터·MCP 브릿지는 공유 자원, 한 번에 하나만** — Play Mode 검증이나 프리팹 편집은 병렬 불가. 코드/문서 편집만 병렬 가능. (`ParallelWorkContract.MD` §2)
4. **MCP for Unity는 전역 자동연결 켜둠** — `MCPForUnity.AutoStartOnLoad`가 레지스트리(모든 프로젝트 공유)에 `true`로 설정돼 있어, 이 런처로 여는 어떤 프로젝트든 자동으로 서버가 뜬다. (`UnityLauncher.MD` §6)
5. **기록용 md 파일은 그 프로젝트가 없는 한 만들지 않는다** — 특정 프로젝트 얘기(클래스명, 파일명)를 이 루트의 공용 문서에 직접 섞지 않는다. `CLAUDE.md`의 "피드백 반영 프로세스" 참고.

---

## 5. 알려진 이슈 / 다음에 볼 것

Orca 워크스페이스 자체의 미완료 작업은 프로젝트별 `UNFINISHED.md`가 아니라 여기 적는다(어느 프로젝트 소속도 아니므로):

- **MCP 멀티 인스턴스 (a)/(b) 미확정** — Unity 에디터를 켠 상태에서 이 세션에 MCP for Unity 도구를 붙여 `mcpforunity://instances`를 한 번 읽으면 닫을 수 있다. `ParallelWorkContract.MD` §2 참고.
- **Orca 바탕화면 바로가기가 실제로 `OrcaStart.cmd`를 가리키는지 미확인.**

프로젝트별 미완료 작업은 `Unity\{프로젝트명}\.claude\UNFINISHED.md` 참고(위 §2 폴더 구조).

---

## 부록 A. Orca CLI 명령어 레퍼런스

Orca에는 CLI가 번들돼 있으나 **PATH에 자동 등록되지 않는다** — 위치는 `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe`. **Settings → Experimental → CLI**에서 등록하면 `orca`로 바로 쓸 수 있다(이 PC엔 이미 등록됨).

### 프로젝트는 "실행 시 선택"이 아니라 "등록 후 전환"이다

`orca open`은 프로젝트 인자를 받지 않는다(옵션이 `--json`뿐). **repo를 여러 개 등록해두고 사이드바에서 전환**하는 모델이다.

```bash
orca repo add --path "D:/Unity/NextProject"   # 등록 (GUI: 사이드바 Add Repo)
orca repo list                                 # 등록 목록
orca repo set-base-ref ...                     # worktree가 뻗어나갈 기준 브랜치
```

작업 단위인 worktree를 만들 때 `--repo`로 프로젝트를 고른다:

```bash
orca worktree create --repo name:NextProject --name task-a --agent claude --prompt "..."
```

셀렉터 형식: `name:`, `id:`, `path:` / worktree 쪽은 `branch:`, `path:`, `active` 등.

### `repo`와 `project`는 다른 개념

- **repo** — 로컬 파일시스템 경로 단위. 로컬만 쓸 거면 이것으로 충분. git이 아니어도 `kind: "folder"`로 등록 가능(단 worktree 불가) — `C:\Orca` 자체가 그 예시였으나 지금은 git 저장소가 됐다.
- **project** — durable, 원격 저장소 연결 단위 (`project setup-clone`, `project setup-existing-folder`)

### 주요 명령군

| 명령군 | 용도 |
|---|---|
| `repo` | 프로젝트 등록·조회·기준 ref |
| `worktree` | 생성·조회·삭제, `ps`로 전체 요약 |
| `terminal` | 워크트리 안 터미널 생성/입력/대기/종료 |
| `orchestration` | 에이전트 간 메시징, task dispatch, 워커 감독 |
| `automations` | 스케줄 자동화 (주의: 전부 스케줄 기반, "앱 시작"·"프로젝트 선택" 같은 이벤트 트리거는 없음 — 그래서 `OrcaStart.cmd` 래퍼를 씀) |
| `skills list / get` | **번들된 공식 가이드** (`orca-cli`, `orchestration` 등) ← 막히면 여기부터 |

### setup 훅 — worktree 생성 시 실행됨, "앱 시작"이 아님

`orca repo show --repo name:<이름> --json`의 `hookSettings.scripts.setup`에 명령을 넣으면 **워크트리를 만들 때마다** 자동 실행된다(정책은 이미 `run-by-default`). 여기에 Unity 실행을 무심코 걸면 워크트리마다 Unity가 뜨고 `Library`가 N개 생긴다 — 반드시 원본 체크아웃인지 가드할 것:

```bash
# 원본 체크아웃일 때만 Unity 실행, 워크트리면 즉시 종료
[ "$PWD" = "<원본 프로젝트 경로>" ] || exit 0
unity "$PWD"
```

### Unity CLI — `verify-compile`/`verify-tables` 구현 메커니즘

Unity CLI(`unity install/doctor/pipeline`)는 이미 실행 중인 에디터를 셸에서 제어할 수 있어(Pipeline), Unity 에디터 락과 경쟁하지 않고 검증이 가능하다. **`CliCommand` 속성**(C# 정적 메서드에 부착)으로 프로젝트 전용 검증 명령을 노출하면, `ParallelWorkContract.MD` §5/§10의 `<verify-compile>`/`<verify-tables>`를 실제 종료 코드로 판정하는 CLI 명령으로 만들 수 있다 — 아직 Unity CLI 자체가 미설치라 각 프로젝트 `UNFINISHED.md`의 최우선 미적용 항목으로 남아있음.

주의: `eval`은 임의 C# 실행이라 신뢰할 수 없는 입력에 노출 금지, experimental이라 의존하는 자동화는 얇게 유지.

---

## 부록 B. 신규 Unity 프로젝트를 이 워크스페이스에 편입시킬 때 (Day-1 체크리스트)

- [ ] **1. Git 기준점**
  - [ ] 프로젝트 `.gitignore`에 Unity 표준 항목을 **직접** 넣는다 (전역 `core.excludesFile`에 의존하지 말 것)
  - [ ] `.claude` 폴더 추적 여부를 **지금** 결정 (`ParallelWorkContract.MD` §11 — git 추적 vs junction)
  - [ ] 기준 브랜치·remote 확정, detached HEAD 상태 아닌지 확인
- [ ] **2. 검증 수단 확보** ← Orca 병렬 작업을 켜기 전에 반드시
  - [ ] 테스트 asmdef 생성 (`com.unity.test-framework`)
  - [ ] `verify-compile` — 컴파일 에러 0건 (종료 코드로 성공/실패)
  - [ ] `verify-tables` — 데이터 파일 헤더 ↔ 코드 필드명 대조 (존재하지 않는 컬럼도 에러 없이 기본값을 반환하는 파서가 많아 자동 검증 1순위)
- [ ] **3. Unity CLI** (부록 A 참고)
  - [ ] `unity install <프로젝트 버전>` / `unity pipeline install`
  - [ ] `unity doctor`로 실행 중인 에디터에 실제로 붙는지 확인 ← 갈림길, 안 붙으면 EditMode 테스트 + CI 사본 경로로 우회
  - [ ] 위 검증 2개를 `CliCommand`로 노출
- [ ] **4. MCP 브릿지**
  - [ ] `mcpforunity://instances`로 멀티 인스턴스 지원 여부 확정 (`ParallelWorkContract.MD` §2)
  - [ ] 단일 인스턴스뿐이면 "한 번에 Unity 하나" 규칙을 문서·훅에 명시
- [ ] **5. Orca 설정**
  - [ ] `orca repo add --path <프로젝트 경로>`
  - [ ] **Agent Permissions = Manual** (기본값이 권한 우회 인자를 미리 채운다 — 에이전트가 씬·프리팹을 직접 고치므로 자동 승인은 위험)
  - [ ] `hookSettings.scripts.setup`에 가드 포함 Unity 실행 스크립트 작성(부록 A)
  - [ ] `DO_NOT_TRACK=1`, `ORCA_TELEMETRY_DISABLED=1`
  - [ ] 이 README의 `Unity\` 폴더 구조에 맞춰 `.claude` 사본 편입 (`Unity\README.md` 절차)
- [ ] **6. 첫 실험**
  - [ ] 원인 가설이 둘로 갈리는 버그 하나를 고른다
  - [ ] **에이전트 2개만** (늘리면 선택지보다 검토 비용이 먼저 늘어난다)
  - [ ] `ParallelWorkContract.MD` §10의 평가 계약 템플릿을 그대로 준다
