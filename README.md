# Orca 워크스페이스

**이게 뭔가:** 이 저장소는 Unity 게임 프로젝트를 Claude Code·Codex + Orca 앱으로 관리하기 위한 **메타 작업공간**이다. 게임 코드 자체는 여기 없다(각 Unity 프로젝트 폴더에 따로 있음) — 여긴 코딩 규칙, 에이전트 역할 계약, 프로젝트 문서(class/prefab/design/qa), 실행 스크립트, 운용 원칙 문서를 모아둔 곳이다.

**작성일:** 2026-08-22

> **2026-11-05 정리:** 기존 프로젝트(GeometryDefender, HouseRulez, SplashRush)의 기록 문서를 모두 삭제하고 새 Unity 프로젝트를 준비 중이다. 이 저장소 문서에 날짜와 함께 나오는 이전 프로젝트 이름은 당시 실측 근거로 남겨둔 것이고, 지금은 `Unity\` 아래에 없다.
**GitHub:** https://github.com/purityzero/Orca (private, 원격 `origin`) — 여러 PC에서 이 폴더를 clone해서 같은 상태로 이어 쓸 수 있다. 공개 미러는 https://github.com/purityzero/Orca-public (원격 `public`)이고, main을 push할 때 함께 올린다.

### 경로 표기 규칙 — 공용 경로는 토큰으로 쓴다

clone 위치도, Unity 프로젝트 위치도 PC마다 다르다. 그래서 공용 경로는 다음 두 토큰으로 쓴다. 날짜가 붙은 실측 기록과 도구 설치 경로에는 당시 절대경로가 남을 수 있다.

| 토큰 | 뜻 | 어디서 알아내나 |
|---|---|---|
| `<ORCA>` | 이 저장소를 clone한 폴더 | 지금 이 파일이 있는 곳 (스크립트는 `%~dp0` / `$PSScriptRoot`로 자동 인식) |
| `<원본:{프로젝트명}>` | 그 프로젝트의 **실제 Unity 프로젝트 폴더**(에디터가 여는 곳) | `<ORCA>\LocalPaths.json` 의 `projects.{프로젝트명}` |

`<ORCA>` 안을 가리킬 때는 토큰 없이 루트 기준 상대경로로 쓴다 (예: `agents\`, `Unity\{P}\.claude\`).
**`LocalPaths.json`은 git에 올리지 않는다**(PC마다 값이 다르므로). 커밋되는 건 템플릿인 `LocalPaths.example.json`뿐이다.

---

## 1. 빠른 시작

### 새 PC에서 처음 셋업할 때
1. 원하는 위치에 clone한다(경로는 자유 — 문서의 `<ORCA>`가 이 폴더를 뜻한다).
   ```bash
   git clone https://github.com/purityzero/Orca.git <원하는 경로>
   ```
2. 관리할 Unity 프로젝트를 `Unity/` 아래 편입한 뒤 `SetupLocalPaths.cmd`를 실행한다. 아직 없으면 건너뛴다. Unity Hub 등록 목록에서 실제 위치 후보를 골라 `LocalPaths.json`을 만든다(Hub에 없거나 이름이 다르면 `d`로 직접 입력, 이 PC에 없는 프로젝트는 `n`).
3. `UnityLauncher.MD` §3(설치 절차)을 따라 `.ps1` 인코딩만 확인하면 끝.

> 프로젝트를 다른 폴더로 옮기거나 새 프로젝트를 `Unity\` 아래에 추가했다면 `SetupLocalPaths.cmd`를 다시 실행하면 된다(기존 값은 엔터로 유지).

### 평소 실행 순서
1. 바탕화면 바로가기(또는 `OrcaStart.cmd` 직접 실행) 클릭
2. Unity 프로젝트 번호 선택 → 해당 버전 에디터 자동 실행 → MCP for Unity 자동 연결(전역 설정 켜둠)
3. Orca 앱이 뒤이어 자동으로 뜸 (Unity 로딩과 병렬)

상세 메커니즘은 `UnityLauncher.MD` 참고.

### Orca 채팅에서 시작할 때 — `/시작`으로 셋팅한다
Orca 채팅은 세션 시작 훅의 화면 출력(환경 체크 표·프로젝트 목록)을 **보여주지 않는다**. 그래서 채팅에서는 환경 확인과 프로젝트 선택을 명령으로 한다.

1. 새 채팅의 첫 메시지로 `/시작`(영문 `/Start`도 같음)을 보낸다.
2. 환경 체크 표와 Unity Hub 프로젝트 목록이 응답으로 나온다. 사용자 조치가 필요한 항목이 있으면 함께 묻는다.
3. 번호·이름·절대경로로 프로젝트를 고른다. `/시작 2`처럼 인자로 바로 줘도 된다. 목록이 비어 있으면 절대경로를 입력한다.
4. 고른 프로젝트의 에디터가 `OpenUnityProject.ps1`로 열리고(이미 열린 다른 에디터는 유지), 세션 작업 대상이 `.claude/session-project/{세션ID}.json`에 기록된다.

- 작업 중에 프로젝트를 바꿀 때도 `/시작`을 다시 보낸다.
- Unity MCP는 세션이 시작될 때만 붙는다. Play Mode 검증이 필요하면 **에디터를 먼저 켜고 새 채팅을 연다.**
- Hub 프로젝트 목록은 공용 `tools/unity-hub.js`가 일반 설치판의 `projects-v1.json`과 스토어판의 `hub.db`를 읽는다. SQLite 조회에는 `node:sqlite`를 지원하는 Node가 필요하다. 자세한 데이터·에디터 경로는 `UnityLauncher.MD` §2를 참고한다.
- 명령 정의는 `.claude/commands/시작.md`, 채팅에서 훅이 보이는 방식은 [Orca CLI 런북](runbook/orca-cli.md) 「Orca 채팅에서 훅이 보이는 방식」을 참고한다.

### 새 세션에서 이어서 작업할 때
1. 이 워크스페이스 자체의 미완료 항목은 `.claude/UNFINISHED.md`부터 확인
2. 작업 대상이 특정 프로젝트면 `Unity\{프로젝트명}\.claude\UNFINISHED.md`도 확인
3. `ParallelWorkContract.MD` §0~§2에서 Orca 모델·Unity 제약 전체 맥락 파악

---

## 2. 폴더 구조

```
<ORCA>\
├── README.md                    ← 이 문서 (전체 사용법)
├── AGENTS.md                    ← Codex가 세션 시작·대상 확정 후 읽을 문서를 지정하는 진입 지침
├── CLAUDE.md                    ← 행동 지침 (AGENT.MD 자동 import, Codex 필수 읽기는 AGENTS.md)
├── CODEX.md                     ← Codex가 우선 소유하는 작업과 완료 조건
├── CODE.MD                      ← C#/Unity 코딩 규칙 (네이밍, 스타일 등)
├── AGENT.MD                     ← Codex/Claude 실행자 선택 + Claude 서브에이전트 라우팅
│
├── ParallelWorkContract.MD      ← Orca 모델·Unity 제약·병렬 레인 분할/평가 계약 (Main→워커 핸드오프 규격)
│
├── UnityLauncher.MD             ← 런처 동작 원리·검증 기록
├── UnityLauncher.ps1            ← 런처 스크립트 본체
├── OpenUnityProject.ps1         ← 원본 Unity 프로젝트 에디터 실행
├── UnityLauncher.cmd            ← 런처 실행 진입점
├── OrcaStart.cmd                ← "Unity 실행 → Orca 실행" 묶음 시퀀스
│
├── LocalPaths.json              ← **이 PC 전용** 프로젝트 원본 경로 (git 제외)
├── LocalPaths.example.json      ← 위 파일의 템플릿 (커밋됨)
├── SetupLocalPaths.ps1          ← LocalPaths.json 생성 스크립트 본체
├── SetupLocalPaths.cmd          ← 생성 스크립트 진입점
│
├── WorkBranchFlow.MD            ← 작업 브랜치 흐름(검증 전 변경을 main에 안 올리기)
├── WorkBranch.ps1               ← 브랜치 시작/병합 스크립트 본체
├── WorkBranch.cmd               ← 브랜치 스크립트 진입점
│
├── agents\                      ← 정의 10개, 역할·모델은 AGENT.MD
│
├── rules\
│   └── glory.md                 ← Glory 공용 라이브러리 사용 지침, **마스터 보관용**
│                                    (frontmatter의 paths가 Assets/Scripts 전용이라 여기선 발동 안 함)
│
├── runbook\                     ← 주제별 운용 절차 (진입점: runbook/README.md)
├── .claude\                     ← settings·hooks·commands(`/시작`)·UNFINISHED.md
├── tools\                       ← 검사·자동화 도구
├── .local\                      ← PC·세션 로컬 기록 (git 제외)
│
└── Unity\                       ← 프로젝트별 문서 사본 (정본은 여기)
    ├── README.md                ← 이 폴더 전용 상세 설명(마스터-사본 규칙, 동기화 함정)
    └── {프로젝트명}\.claude\       ← 프로젝트마다 하나 (2026-11-05 현재 없음)
        ├── agents\                ← 마스터 + 이 프로젝트 전용 노하우 병합본
        ├── class\                ← 클래스별 기록
        ├── prefab\               ← 프리팹별 기록
        ├── design\               ← 기획 스펙
        ├── qa\                   ← client-issues.md / design-issues.md
        ├── rules\glory.md
        ├── UNFINISHED.md         ← 이 프로젝트의 미완료 작업
        └── settings.local.json

<원본:{프로젝트명}>\.claude\       ← 실제 Unity 에디터가 읽는 원본 (게임 코드도 여기)
```

> 원본 경로의 실제 값은 `LocalPaths.json`에 있다. 프로젝트 원본을 건드리기 전엔 **항상 그 파일을 먼저 읽어 경로를 확인한다** — 같은 프로젝트의 오래된 클론이 PC에 같이 있을 수 있어서 폴더명만 보고 짐작하면 틀린다. 값이 `null`이면 그 프로젝트는 이 PC에 없는 것이므로, 원본 동기화 작업은 건너뛰고 그 사실을 사용자에게 알린다.

> `Unity\` 폴더 자체의 정본 규칙·동기화 함정·마스터 관계는 **`Unity\README.md`에 훨씬 상세히** 정리돼 있다 — 프로젝트 문서를 실제로 갱신하기 전엔 그 문서부터 읽을 것.

---

## 3. 문서 지도 — 뭘 언제 읽나

| 문서 | 언제 읽나 |
|---|---|
| `AGENTS.md` | Codex 세션 시작 시 자동 적용되는 진입 지침 — 필수 공통 문서와 작업 대상별 추가 문서의 로드 순서를 정의 |
| `CLAUDE.md`/`CODEX.md`/`AGENT.MD` | 작업 에이전트에 맞춰 읽는 행동·역할·라우팅 규칙 |
| `CODE.MD`/`runbook/coding-principles.md` | Claude는 C# 수정 전 두 파일을 Read로 읽는다(세션별 훅 강제). Codex는 AGENTS.md의 필수 읽기 유지 |
| `runbook/prefab-ui.md` | 프리팹·UI를 만들거나 고칠 때만 읽는 컴포넌트·편집 규칙 |
| `CODEX.md` | Codex 작업 배정·완료 조건을 확인할 때. 모델·effort는 `CODEX.md` §2에서 고른다. |
| `runbook/README.md` | 주제별 운용 절차를 찾는 진입점 |
| `.claude/UNFINISHED.md` | 세션 시작 시 항상 — Orca 자체의 미완료 작업 |
| `Unity\{P}\.claude\UNFINISHED.md` | 특정 프로젝트 작업 시작 시 |
| `ParallelWorkContract.MD` | 레인 2개 이상으로 병렬 작업을 짤 때, 또는 Orca/Unity CLI 모델 자체를 다시 확인할 때 (특히 §11 이름 기반 소프트 락) |
| `LocalPaths.json` | **프로젝트 원본(`<원본:{P}>`)을 읽거나 쓰기 직전 항상** — 실제 경로가 여기에만 있다 |
| `WorkBranchFlow.MD` | **Unity 프로젝트의 동작을 바꾸는 수정을 시작하기 전 항상** — 작업 브랜치/검증/병합 절차 |
| `UnityLauncher.MD` | 런처가 이상하게 동작하거나 새 PC에 셋업할 때 |
| `Unity\README.md` | 프로젝트 문서(class/prefab/agents 등)를 갱신하기 전에 항상 |
| `Unity\{P}\.claude\class\{Class}.md` | 그 클래스를 수정하기 전에 항상 (없으면 수정 후 생성) |

---

## 4. 핵심 원칙 요약 (각 문서에 상세 근거 있음)

1. **정본 위치가 종류별로 다르다** — 코딩 규칙은 루트 1부, 에이전트 정의는 `agents\`가 마스터(단 실제 실행엔 프로젝트 로컬 사본이 필요), 프로젝트 문서는 `Unity\{P}\.claude\`가 정본이고 `<원본:{P}>\.claude\`는 그 시점 스냅샷. (`Unity\README.md` 참고)
2. **에이전트를 실행하기 전엔 이름에 프로젝트명을 붙인다** — `{ProjectName}_{ClassName}_class` 형식. 여러 프로젝트가 같은 "Glory" 라이브러리를 쓰면 클래스명이 겹치기 때문. 스폰 전 `ListAgents`로 같은 이름이 이미 실행 중이면 대기한다. (`ParallelWorkContract.MD` §11)
3. **Unity 에디터·MCP 브릿지는 공유 자원, 한 번에 하나만** — Play Mode 검증이나 프리팹 편집은 병렬 불가. 코드/문서 편집만 병렬 가능. (`ParallelWorkContract.MD` §2)
4. **MCP for Unity 전역 자동연결은 과거 PC 실측이다** — 당시 PC에서 `MCPForUnity.AutoStartOnLoad`가 레지스트리(모든 프로젝트 공유)에 `true`였고, 런처로 연 프로젝트에서 자동으로 서버가 떴다. 새 PC의 설정은 별도로 확인한다. (`UnityLauncher.MD` §6)
5. **검증 전 변경은 기본 브랜치에 올리지 않는다** — Unity 프로젝트의 동작을 바꾸는 수정은 `work/{날짜}-{주제}` 브랜치에서 하고, Play Mode 확인까지 끝난 뒤 `--no-ff`로 합류한다. (`WorkBranchFlow.MD`)
6. **프로젝트 고유 기록은 프로젝트 문서에만 남긴다** — 공용 문서에는 일반화한 규칙만 적는다. `runbook/feedback.md`의 "피드백 반영 프로세스" 참고.
7. **Codex는 후속 처리 전용이 아니다** — 저장소 전체 분석·자동화·테스트·리팩터링·문서 정합성은 처음부터 Codex에 배정한다. Unity 에디터 전용 검증과 프로젝트별 Claude 노하우는 필요할 때 명시적으로 핸드오프한다. (`CODEX.md` 참고)
   - **저장소 Git 일(commit·merge·push)은 Codex 메인 세션, 즉 Orca의 Codex 터미널 탭이 한다.** Claude가 `codex exec`로 대신 넘기면 `.claude/hooks/codex-exec-git-guard.js`가 막는다. (`runbook/codex-handoff.md` 「금지」)
8. 모델·effort는 `CODEX.md` §2에서 고른다.

---

## 5. 알려진 이슈 / 다음에 볼 것

미완료 정본은 `.claude/UNFINISHED.md`, 프로젝트별은 `Unity/{P}/.claude/UNFINISHED.md`.

막히면 `orca skills get orca-cli` / `orca skills get orchestration`, 상세는 [Orca CLI 런북](runbook/orca-cli.md)을 확인한다.

신규 프로젝트 편입은 [Day-1 체크리스트](runbook/new-project-onboarding.md)를 따른다.
