# 미완료 작업

## 2026-09-04 — env-check 훅(SessionStart) 실물 검증

**브랜치**: `work/2026-11-06-hook-chat-display`(커밋 e39f35a, main 미병합·미push)
**관련 파일**: `.claude/hooks/env-check.js`(신규), `.claude/settings.json`(SessionStart 세 번째 훅으로 등록), `CLAUDE.md`("세션 시작 시 환경 체크" 절)

**지금까지 확인한 것**: 훅을 직접 호출(stdin에 JSON 파이핑)해서 출력 포맷·타이밍(~1.8초)·JSON 유효성만 봤다.

### ✅ 2026-09-10 세션에서 실물 확인됨 (항목 1 · 항목 3 절반)

실제 Claude Code 세션이 열릴 때 사용자 화면에 아래 표가 **떴다**(사용자 확인):

```
[환경 체크]
  node          OK  v24.14.1
  git           OK  2.53.0.windows.1
  codex CLI     OK  codex-cli 0.150.1
  PowerShell    OK  OpenUnityProject.ps1
  훅            OK  3종
  서브에이전트  OK  10개
  Unity Hub     OK  projects-v1.json
  Orca 저장소   OK  최신
```

- **항목 1 닫힘** — SessionStart에서 훅이 실제로 실행되고 `systemMessage`가 렌더된다
- **항목 3 절반 닫힘** — `Orca 저장소 OK 최신`이 뜨려면 `git fetch`가 성공해야 하므로,
  **fetch 포함 전체가 `settings.json`의 timeout(20초) 안에 끝난다**는 것이 증명됐다.
  오프라인일 때 "원격 확인 실패"로 강등되는 분기는 여전히 미확인

> ⚠️ **훅의 `systemMessage`는 사용자 화면에만 뜨고 세션 컨텍스트로는 안 들어온다.**
> 그래서 이 검증은 **세션이 스스로 못 한다** — 사용자에게 물어야만 확인된다.
> (2026-09-10 실측: 세션은 프로젝트 목록 훅 출력만 받았고 `[환경 체크]` 표는 못 봤다)

### ✅ 2026-09-12 — 항목 2·4 닫힘 (실물 확인)

`work/2026-09-04-env-check-hook`을 `e4a4603`으로 1커밋 되돌려 `behind=1`을 만들고
`--continue` 없이 새 세션을 열었다. **훅이 정확히 발동했다.**

| 항목 | 결과 |
|---|---|
| **4. "origin보다 뒤" 분기** | ✅ 환경 체크 표에 `origin/work/2026-09-04-env-check-hook보다 1커밋 뒤`로 떴다 |
| **2. `additionalContext` → 세션이 `AskUserQuestion`으로 묻기** | ✅ 세션에 전달됐고 첫 응답에서 pull 여부를 물어 처리했다 |

`action` 문구의 "워킹트리에 미커밋 변경이 있으면 pull 전에 알릴 것"도 지켜졌다 —
`.claude/UNFINISHED.md`가 더티였고, origin 커밋이 그 파일을 건드리지 않아 `pull --ff-only`가
충돌 없이 통과함을 미리 확인한 뒤 물었다.

복구 완료: `git pull --ff-only` → `0c4a115`, behind 0. 런북 5파일도 돌아왔다.

**남은 것은 항목 3의 절반뿐이다.**

### ⬜ 남은 것 — 전부 "일부러 망가뜨린 상태로 새 세션을 열어야" 확인된다

훅은 SessionStart에만 돌므로 **진행 중인 세션에서는 아래를 검증할 방법이 없다.**

3. **(절반) 오프라인·원격 접근 실패 시 "원격 확인 실패"로 정상 강등되는지**

이건 `action`이 없는 분기라 `additionalContext`를 만들지 않고 화면 표에만 warn으로 뜬다(코드로 확인).
실제로 `work/2026-09-11-doc-slim`은 원격에 없어서 **그 브랜치에 있는 동안 이 분기를 탄다** —
2026-09-12 이전 세션에서 그렇게 떴을 것이나 사용자 확인을 받지 못했다.
진짜 오프라인(네트워크 차단)에서의 강등은 여전히 미확인이다.

**중요도 낮음**: 실패해도 화면 표시가 덜 정확해질 뿐이고 세션 행동은 안 바뀐다.
이것만 남았으므로 **main 병합을 더 막지 않는다.**

### ✅ 병합 가능 상태

항목 1·2·4가 닫혔고 3은 영향이 작다. 따라서 이 브랜치와 그 위에 쌓인
`work/2026-09-11-doc-slim`(`9eeff52`, 자동 주입 문서 다이어트)을 **main에 병합할 수 있다.**
Git 마무리는 Codex 메인 세션 담당이므로 인계한다.

## 2026-09-11 — 자동 주입 문서 다이어트 (브랜치 `work/2026-09-11-doc-slim`)

세션이 첫 응답 전에 지침 문서만 55,256자를 싣고 있었다(사용자 지적). **36,069자로 35% 줄였다.**

| 무엇 | 어떻게 |
|---|---|
| 글로벌 `~/.claude/CODE.md` | Orca `CODE.MD`와 내용이 같은 사본이라 **삭제**. 글로벌 `CLAUDE.md`는 정본 경로를 가리키는 포인터로 교체 |
| `PREFAB.MD` | `runbook/prefab-ui.md`로 이동. `CLAUDE.md`엔 표준 컴포넌트 표 4행만 남김 |
| `CLAUDE.md` 상황 한정 3절 | `runbook/recurring-bugs.md`로 이동(데이터 레이어 5종·로컬라이제이션·바이너리 자산). 상시 규칙 2줄만 남김 |
| `CLAUDE.md` 5절 | 문장 압축(미완료 보고·환경 체크·착수 체크리스트·재사용 원칙·권한 경계) |

### ⬜ 검증 못 한 것 — 다음 세션을 열어야 확인된다

1. **실제 주입량이 줄었는가** — 새 세션의 시스템 프롬프트에 글로벌 `CODE.md`와 `PREFAB.MD`가
   더 이상 안 들어오는지. 이번 세션은 이미 옛 문서를 실은 채 시작해서 확인할 수 없다.
2. **압축으로 규칙이 깎이지 않았는가** — 런북으로 옮긴 3절은 원문 줄 단위 대조로 누락 0을 확인했지만,
   문장을 다시 쓴 5절은 기계 대조가 불가능하다. 사람이 읽어 확인해야 한다.
3. **글로벌 포인터가 Orca 밖 세션에서 실제로 읽히는가** — 다른 워크스페이스에서 C# 작업을 할 때
   `D:\Orca\CODE.MD`를 실제로 열어 보는지. 안 읽으면 Orca 밖에서 코드 규칙이 사라진 셈이 된다.

### 📌 이 작업 중 드러난 별건 — 어제 문서 작업이 통째로 main 미병합

`work/2026-09-04-env-check-hook`(`0c4a115`)에만 있고 main에는 없다: runbook 5파일,
`CLAUDE.md` 승격 사다리 절, `CODE.MD` bool 반환 메서드 규칙, `AGENT.MD` Codex 방침, env-check 훅.
막혀 있는 이유는 위 2026-09-04 항목의 훅 검증 2·4가 안 끝나서다.
`work/2026-09-11-doc-slim`은 그 브랜치 위에 쌓았으므로 **함께 병합되거나 함께 막힌다.**

## 2026-11-05 — 브랜치 확인 필요

위 env-check·doc-slim 항목의 브랜치(`work/2026-09-04-env-check-hook`, `work/2026-09-11-doc-slim`)는 원격에 없다(원격엔 `main`, `work/2026-09-13-codex-handoff-unity-bridge`만). 이미 main에 병합됐는지 확인하고, 됐으면 두 항목을 닫는다.

## 2026-11-05 — 세션 공용 에이전트 사본 폴더 삭제 문제 (별도 작업)

**증상**: `.claude/agents/`를 모든 Claude 세션이 같이 쓴다. 한 세션이 종료되면 SessionEnd `cleanup`이 폴더째 지워 다른 세션의 사본이 사라진다.
**실측**: 시험 탭 `/exit` 직후 0개 → `node .claude/hooks/session-agents.js sync`로 10개 복구.
**관련 파일**: `.claude/hooks/session-agents.js:20`(SESSION_DIR 하나), `:46`(rmSync 폴더 전체)
**남은 작업**: 다른 세션이 살아 있으면 지우지 않는 방안(참조 카운트·세션별 마커 등) 설계·구현·검증. 브랜치 미생성.
**임시 대응**: 에이전트가 안 보이면 위 sync 명령. 이미 떠 있는 세션의 목록이 사본 삭제 후에도 호출 가능한지는 미확인.

## 2026-11-06 — README에서 이관한 미완료 항목

- **MCP 멀티 인스턴스 (a)/(b) 미확정** — Unity 에디터를 켠 상태에서 이 세션에 MCP for Unity 도구를 붙여 `mcpforunity://instances`를 한 번 읽으면 닫을 수 있다. `ParallelWorkContract.MD` §2 참고.
- **Orca 바탕화면 바로가기가 실제로 `OrcaStart.cmd`를 가리키는지 미확인.**

## 2026-11-06 — /시작 명령의 에디터 실행 (미검증)

**파일**: `.claude/commands/시작.md`, `OpenUnityProject.ps1`
**확인됨**: 2026-11-06 새 채팅에서 `/시작` 인식·실행, 환경 표·"프로젝트가 없습니다." 표시까지.
**미검증**: 프로젝트를 골라 에디터를 실제로 띄우는 단계 — 이 PC는 Hub DB 등록 프로젝트가 0개이고 Unity 에디터가 설치돼 있지 않아 확인 불가.
**보완**: `work/2026-11-06-hub-db-projects`에서 Hub JSON/SQLite 공용 조회와 `ProjectSettings/ProjectVersion.txt` 대체 버전 조회, 기본/보조 에디터 경로 검색을 구현했다. 임시 fixture에서 버전 조회 후 에디터 미설치 안내까지 확인했다. 실제 에디터 실행은 여전히 미검증이다.

## 2026-11-06 — Hub SQLite 목록 지원 (등록 프로젝트·에디터 실물 검증 대기)

**구현 커밋**: `92760b6`, `68c8311` (작업 브랜치 `work/2026-11-06-hub-db-projects`)
**파일**: `tools/unity-hub.js`, `tools/UnityHub.ps1`, `tools/unity-hub.test.js`, 목록 picker·env-check, `OpenUnityProject.ps1`, `SetupLocalPaths.ps1`, `UnityLauncher.ps1`
**확인됨**: 임시 JSON·SQLite/WAL fixture에서 picker·환경 표의 Hub 행·PowerShell 버전 조회 검증. Claude가 실제 `/시작`에서 「Unity Hub OK hub.db · 프로젝트 0개」와 "프로젝트가 없습니다." 확인. 실제 `OpenUnityProject.ps1`과 임시 프로젝트의 BOM 없음·있음+CRLF `ProjectVersion.txt`에서 버전 `6000.0.30f1` 조회 후 에디터 미설치 안내·종료 코드 1 확인.
**남은 것**: 프로젝트가 실제 등록된 hub.db 실물 확인과 실제 에디터 실행. 현재 PC에는 등록 프로젝트·설치된 에디터가 없어 확인 불가.
- **별도 미완료**: env-check 「Unity 에디터」 행이 스토어판 Hub를 "Hub 없음"으로 표시한다(`.claude/hooks/env-check.js:90`·`:113`). `hubInfo.json`의 실행 경로 존재 여부로 판정하는 보완이 필요하다.

## 2026-11-09 — Orca 터미널 Claude CLI → 채팅 유도 훅 (사람의 UI 진입 확인 대기)

**작업 브랜치**: `work/2026-11-09-orca-chat-default`에서 구현·검증 완료. 남은 UI 확인은 아래 재현으로 진행한다.
**파일**: `.claude/hooks/orca-chat-default.js`·`orca-chat-session.js`·`orca-chat-processes.ps1`·`orca-chat-default.test.js`, `.claude/settings.json`, `runbook/session-environment.md`, `runbook/codex-handoff.md`.
**확인됨**: 훅 테스트 17개와 기존 규칙·Git 가드 회귀 2개 통과. 실제 Orca PowerShell 탭의 `claude` 시작에서 채팅 1개 생성·화면 안내·additionalContext 전달(훅 1,763ms), 두 번째 CLI의 생성 억제, Claude 실행 셸의 `ORCA_SKIP_CHAT_REDIRECT=1`일 때 무출력(훅 217ms)을 확인했다. 이전 실측의 `claude -p`(`sdk-cli`)·채팅(`sdk-ts`) 무출력도 재사용했다. 설정 DB는 읽기 전용이며 `agentDefaultSurface=terminal`, `nativeChatProviders.claude=true` 그대로다.
**남은 확인**: 사용자가 Orca UI에서 직접 여는 CLI와 에이전트가 `orca agent launch`로 여는 CLI의 환경·부모 비교. 이번 실물 검증은 에이전트가 만든 Orca 터미널에서 수행했으므로 사람의 클릭을 재현했다고 판정하지 않는다. 정확한 Chat | CLI 메뉴 경로도 미확정이다.
**알려진 한계**: Orca 데몬 경유 launch는 호출한 Claude/Codex 조상이 없고, 호출자 셸에만 준 skip도 자식에게 전달되지 않았다. 확실히 제외하려면 실제 Claude 실행 셸에 skip을 설정한다. 자동 판별할 구분 변수는 확정하지 못했다. 표시 범위는 PC·체크아웃당 1회이며, Windows 이외 환경·판정 불가는 조용히 제외한다.
**다음 확인**: 시험 표시를 지운 상태에서 사용자가 새 CLI를 한 번 열어 채팅 생성·첫 안내를 확인하고, 두 번째 시작에서 새 채팅이 생기지 않는지 확인한다. 의도적으로 CLI를 유지하려면 skip을 설정한다. 기본값 변경은 승인된 방침대로 UI 안내만 하며 DB를 쓰지 않는다.
