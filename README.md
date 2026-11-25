# Orca 워크스페이스

**이게 뭔가:** 이 저장소는 Unity 게임 프로젝트를 Claude Code·Codex + Orca 앱으로 관리하기 위한 **메타 작업공간**이다. 게임 코드 자체는 여기 없다(각 Unity 프로젝트 폴더에 따로 있음) — 여긴 코딩 규칙, 에이전트 역할 계약, 프로젝트 문서(class/prefab/design/qa), 실행 스크립트, 운용 원칙 문서를 모아둔 곳이다.

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
2. Unity 프로젝트 번호 선택 → 해당 버전 에디터 자동 실행
3. Orca 앱이 뒤이어 자동으로 뜸 (Unity 로딩과 병렬)

상세 메커니즘은 `UnityLauncher.MD` 참고.

### Orca 채팅에서 시작할 때 — `/시작`으로 셋팅한다
Orca 채팅은 세션 시작 훅의 화면 출력(환경 체크 표·프로젝트 목록)을 **보여주지 않는다**. 그래서 채팅에서는 환경 확인과 프로젝트 선택을 명령으로 한다.

1. 새 채팅의 첫 메시지로 `/시작`(영문 `/Start`도 같음)을 보낸다.
2. 환경 체크 표와 Unity Hub 프로젝트 목록이 응답으로 나온다. 사용자 조치가 필요한 항목이 있으면 함께 묻는다.
3. 번호·이름·절대경로로 프로젝트를 고른다. `/시작 2`처럼 인자로 바로 줘도 된다. 목록이 비어 있으면 절대경로를 입력한다.
4. 고른 프로젝트의 에디터가 `OpenUnityProject.ps1`로 열리고(이미 열린 다른 에디터는 유지), 세션 작업 대상이 `.claude/session-project/{세션ID}.json`에 기록된다.

- 작업 중에 프로젝트를 바꿀 때도 `/시작`을 다시 보낸다.
- Play Mode 검증은 Unity 공식 CLI와 프로젝트의 Pipeline으로 한다. 대상 지정과 준비는 `runbook/codex-qa-unity-cli.md`를 따른다.
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
├── agents\                 ← 역할 정의서 마스터(역할·모델은 AGENT.MD)
├── rules\glory.md           ← 마스터 보관용(paths가 Assets/Scripts 전용이라 여기선 발동 안 함)
├── runbook\                ← 주제별 운용 절차(runbook/README.md)
├── .claude\                ← settings·hooks·commands(`/시작`)·UNFINISHED.md
├── tools\                  ← 검사·자동화 도구
├── .local\                 ← PC·세션 로컬 기록(git 제외)
├── UnityLauncher.cmd       ← Unity 런처 진입점
├── OpenUnityProject.ps1    ← 원본 프로젝트 에디터 실행
├── WorkBranch.cmd          ← 브랜치 시작/병합 진입점(WorkBranchFlow.MD)
└── Unity\                  ← 프로젝트 문서 정본(내부 구조: Unity/README.md)
<원본:{프로젝트명}>\.claude\  ← 에디터가 읽는 문서 스냅샷(게임 코드는 원본 프로젝트)
```

> 원본 경로의 실제 값은 `LocalPaths.json`에 있다. 프로젝트 원본을 건드리기 전엔 **항상 그 파일을 먼저 읽어 경로를 확인한다** — 같은 프로젝트의 오래된 클론이 PC에 같이 있을 수 있어서 폴더명만 보고 짐작하면 틀린다. 값이 `null`이면 그 프로젝트는 이 PC에 없는 것이므로, 원본 동기화 작업은 건너뛰고 그 사실을 사용자에게 알린다.

루트 규칙 문서는 아래 문서 지도에서 찾는다. 프로젝트 문서를 갱신하기 전에는 **[Unity/README.md](Unity/README.md)**의 내부 구조·정본·동기화 규칙부터 읽는다.

2026-11-25에 읽기 전용 검토 역할 `code-flow-reviewer`(흐름 판단)와 `code-theory-reviewer`(이론 판단)를 추가했다. QA는 Codex 절차서 `runbook/codex-qa-*.md`를 따른다. `CLAUDE.md`의 커뮤니케이션 세부 규칙은 `runbook/task-execution.md` 「커뮤니케이션 세부」로 옮겼다.

Stop 훅 `reread-before-cite-guard.js`는 답변에 `.cs:줄`을 인용하면서 이번 턴에 해당 파일을 읽은 흔적이 없으면 막는다. 2026-11-25 실제 세션에서 1회 차단을 확인했다. Claude 세션이 끝나면 공유 `.claude/agents/` 사본이 지워진다. 사본 복구와 Agent 도구 목록 문제는 [서브에이전트 목록 복구](runbook/subagents.md)를 따른다.

---

## 3. 문서 지도 — 뭘 언제 읽나

| 문서 | 언제 읽나 |
|---|---|
| `AGENTS.md` | Codex 세션 시작 시 자동 적용되는 진입 지침 — 필수 공통 문서와 작업 대상별 추가 문서의 로드 순서를 정의 |
| `CLAUDE.md`/`CODEX.md`/`AGENT.MD` | 지휘자 행동 / Codex 책임·완료 조건·§2 역할 프로필 / 실행자·역할·모델 선택 정본 |
| `CODE.MD`/`runbook/coding-principles.md` | Claude는 C# 수정 전 두 파일을 Read로 읽는다(세션별 훅 강제). Codex는 AGENTS.md의 필수 읽기 유지 |
| `runbook/prefab-ui.md` | 프리팹·UI를 만들거나 고칠 때만 읽는 컴포넌트·편집 규칙 |
| `runbook/README.md` | 주제별 운용 절차를 찾는 진입점 |
| `runbook/subagents.md` | Agent 도구의 서브에이전트 목록 누락과 공유 정의 사본 복구를 확인할 때 |
| `.claude/UNFINISHED.md` | `/해야할일`을 받을 때, 미검증 작업을 기록할 때 — Orca 자체의 미완료 작업 |
| `Unity\{P}\.claude\UNFINISHED.md` | 특정 프로젝트 작업 시작 시 |
| `ParallelWorkContract.MD` | 레인 2개 이상으로 병렬 작업을 짤 때, 또는 Orca/Unity CLI 모델 자체를 다시 확인할 때 (특히 §11 이름 기반 소프트 락) |
| `LocalPaths.json` | **프로젝트 원본(`<원본:{P}>`)을 읽거나 쓰기 직전 항상** — 실제 경로가 여기에만 있다 |
| `WorkBranchFlow.MD` | **Unity 프로젝트의 동작을 바꾸는 수정을 시작하기 전 항상** — 작업 브랜치/검증/병합 절차 |
| `UnityLauncher.MD` | 런처가 이상하게 동작하거나 새 PC에 셋업할 때 |
| `Unity\README.md` | 프로젝트 문서(class/prefab/agents 등)를 갱신하기 전에 항상 |
| `Unity\{P}\.claude\class\{Class}.md` | 그 클래스를 수정하기 전에 항상 (없으면 수정 후 생성) |

---

## 4. 핵심 원칙 요약 (각 문서에 상세 근거 있음)

**Claude 메인 채팅이 지휘하고 역할 에이전트는 Orca 작업자(새 세션)로 실행한다. Codex는 작업자이며 재위임하지 않는다.** 배정 전에 [AGENT.MD](AGENT.MD) 「Claude 역할 에이전트 실행 방식」을 읽고 역할 에이전트의 브리프 첫 줄에서 역할 정의서를 읽게 하고 둘째 줄에 언어·존댓말 지시를 넣는다. 역할 정의서가 없는 작업은 언어 지시를 첫 줄에 넣는다(2026-11-25).

| 원칙 | 적용할 정본 |
|---|---|
| 코딩 규칙은 루트, 역할 정의는 `agents/`, 프로젝트 문서는 `Unity/{P}/.claude/`가 정본 | [CODE.MD](CODE.MD), [AGENT.MD](AGENT.MD), [Unity/README.md](Unity/README.md) |
| Agent 도구 이름에는 프로젝트명 포함; Orca 작업자는 파일 소유 범위로 충돌 방지 | [ParallelWorkContract.MD](ParallelWorkContract.MD) §11 |
| Unity 조작은 한 번에 하나, 공식 CLI·Pipeline에 대상 프로젝트 명시 | [ParallelWorkContract.MD](ParallelWorkContract.MD) §2, [Unity CLI QA](runbook/codex-qa-unity-cli.md) |
| 동작 변경은 작업 브랜치에서 검증 후 병합 | [WorkBranchFlow.MD](WorkBranchFlow.MD) |
| 프로젝트 고유 기록과 일반 규칙을 구분 | [피드백 반영 프로세스](runbook/feedback.md) |
| Codex 우선 배정·직접 구현, 역할별 모델·effort 선택 | [AGENT.MD](AGENT.MD), [CODEX.md](CODEX.md) §2 |
| Git 마무리는 배정된 Codex 작업자, `codex exec` 차단 훅 적용 | [CODEX.md](CODEX.md) 「Git 마무리 전담」, [인계 런북](runbook/codex-handoff.md) 「금지」 |

---

## 5. 알려진 이슈 / 다음에 볼 것

미완료 정본은 `.claude/UNFINISHED.md`, 프로젝트별은 `Unity/{P}/.claude/UNFINISHED.md`.

막히면 `orca skills get orca-cli` / `orca skills get orchestration`, 상세는 [Orca CLI 런북](runbook/orca-cli.md)을 확인한다.

신규 프로젝트 편입은 [Day-1 체크리스트](runbook/new-project-onboarding.md)를 따른다.
