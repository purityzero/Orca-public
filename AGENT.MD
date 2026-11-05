AGENT.MD

Orca의 작업을 Codex 또는 Claude Code 서브에이전트에 배정하는 기준. Codex의 상세 책임과 완료 조건은 `CODEX.md`, Claude Code의 개별 서브에이전트 절차는 `agents/{이름}.md`를 따른다.

## 실행자 선택 — Codex도 정식 작업 에이전트다

| 작업 성격 | 우선 실행자 | 기준 |
|---|---|---|
| 저장소 전체 분석, 대규모 리팩터링, 마이그레이션 | **Codex** | 여러 파일의 흐름을 추적하고 구현·테스트·문서를 한 작업으로 닫아야 함 |
| CLI, PowerShell, 자동화, 검사기, 테스트 기반 수정 | **Codex** | 수동 규칙을 재현 가능한 명령과 종료 코드로 바꾸는 작업 |
| 문서-코드 정합성, 중복 규칙, 오래된 참조 감사 | **Codex** | 저장소 전역 검색과 실제 파일 수정이 함께 필요 |
| Unity MCP 호출 전반 — 씬·프리팹 **편집**, 리임포트·재컴파일 | **Codex** | 2026-09-10 방침. `--approve-for-me`로 조작 도구가 통과한다(§Codex의 Unity 접근) |
| Play Mode **검증·QA** | **Codex** | **구현한 주체가 자기 구현을 검증하지 않는다.** 구현=Claude Code / 검증=Codex로 가른다 |
| 프로젝트 전용 기획·밸런스 | `design-planner` / `design-issue-resolver` | 기존 에이전트 정의의 절차와 누적 노하우 사용 |
| 사용자가 실행자를 지정 | **사용자 지정 우선** | 다른 기준보다 우선 |

- Codex는 Claude Code가 실패하거나 남긴 일만 받는 예비 인력이 아니다. 위 표에 해당하면 처음부터 Codex가 작업을 소유한다.
- 한 작업을 Codex와 Claude Code가 비교 수행하면 동일한 목표·범위·성공 조건을 주고, 설명의 설득력이 아니라 테스트와 diff로 채택한다.
- Codex와 Claude Code가 협업하면 파일 소유권을 먼저 나누고, Unity 에디터 검증은 한 번에 하나만 수행한다. 상세는 `ParallelWorkContract.MD`를 따른다.

Codex로 배정한 뒤에는 `CODEX.md` §2의 프로필로 model/effort를 고른다. 기본 대응은 복잡한 설계·감사=`gpt-5.6-sol/high`, 일반 구현·문서=`gpt-5.6-terra/medium`, 명확한 국소 수정=`gpt-5.6-luna/low`다. 서브에이전트가 필요 없는 단일 흐름은 Codex 메인 세션이 직접 끝낸다.

## Claude Code가 Codex를 직접 호출하는 경우 (2026-08-30 확인)

`codex` CLI가 로컬에 설치돼 있어 Claude Code가 `codex exec`로 비대화형 실행을 시킬 수 있다. 다만 **`ListAgents`에는 Codex가 안 잡힌다** — 돌고 있는 Codex 세션에 `SendMessage`로 지시하는 건 불가능하고, 새 프로세스를 띄우는 것만 된다.

### Codex의 Unity 접근 — 조작까지 된다 (2026-09-10 정정)

`~/.codex/config.toml`에 `[mcp_servers.unityMCP] url = "http://127.0.0.1:8080/mcp"`가 등록돼 있어 **Codex도 같은 Unity 에디터에 붙는다.**

**`--approve-for-me`를 붙이면 조작 도구까지 호출된다.**

```
codex exec --approve-for-me --color never -C "<작업 루트>" -o "<보고서>" - < "<브리프 파일>"
```

`refresh_unity` 호출에서 `PermissionRequest` 훅이 자동 심사로 통과하는 것을 실측했다(codex-cli 0.150.1).
Play Mode 진입·조작·종료까지 실제 QA 1회를 완주했다.

> 2026-09-09에 이 절은 "읽기만 된다"였다. 그건 **`--approve-for-me` 없이** 시험한 결과였고,
> 그때 본 `MCP tool call requires approval, but approval policy is never`는 옵션 부재가 원인이었다.

### ★ 방침 — Unity MCP를 부르는 작업은 Codex가 맡는다 (2026-09-10 사용자 지시)

| 작업 | 담당 |
|---|---|
| **씬·프리팹 편집, Play Mode, 리임포트·재컴파일** (Unity MCP 호출 전반) | **Codex** |
| `.cs` · CSV · md 파일 편집 | **Claude Code** |
| Git 마무리(stage·commit·merge·push) | Codex **메인 세션** |

**경계의 목적은 파일 소유가 안 겹치게 하는 것이다.** Claude Code가 코드를 쓰는 동안 Codex는 씬·프리팹만 만진다. 둘이 같은 파일을 동시에 건드리면 `ParallelWorkContract.MD`의 계약이 깨진다.

**검증은 만든 쪽이 하지 않는다**(계속 유효). 코드를 짠 주체가 자기 코드를 검증하면 같은 맹점을 두 번 지난다 — 실제로 하루에 세 번(콜백 직접 호출, 표시 문자열 미확인, 한 종족만 확인) 놓쳤다. 이제 Play Mode를 Codex가 돌릴 수 있으므로, **구현=Claude Code / 검증=Codex**로 자연스럽게 갈린다.

트레이드오프: 위치를 이미 아는 **작은 편집은 왕복이 늘어난다.** 구현자의 맥락이 Codex엔 없어 브리프에 전부 실어야 하고 사용자 토큰도 쓴다. 그래도 조작과 검증을 한쪽에 모으는 이점이 더 크다는 판단이다.

### Codex에 넘길 때 지킬 것

- **맥락은 브리프 파일로 넘긴다.** `.claude/briefs/{날짜}-{주제}.md`에 적고 그 파일을 stdin으로 준다.
  세션을 이어붙이는 길이 Windows에선 막혀 있어서(아래) 브리프가 그 역할을 대신한다.
- **진행 로그는 Orca 안에 남긴다** — `D:\Orca\보고서\{주제}-{날짜}.log`. 그래야 사용자가 다른 창에서 흐름을 본다.
  `codex exec`의 stdout에는 세션 id·모델·승인 정책과 호출하는 MCP 도구가 한 줄씩 찍힌다.
- **`--approve-for-me`는 workspace-write 샌드박스를 쓴다.** 파일 소유권을 지키려면
  프롬프트에 **"프로젝트 파일 수정 금지, 산출물은 `Temp/` 아래에만"**을 명시한다.
- 에디터를 쓰는 주체가 동시에 둘이 되지 않게 **한 번에 하나만** 돌린다.
- 받은 보고서는 **핵심 주장을 원본에서 재확인한 뒤에만** 사용한다. Codex 출력도 「검증은 프로덕션 경로를 타야 한다」의 적용 대상이다.
  긴 문서의 **앞뒤 모순 찾기**엔 쓸 만하지만 **단순 계수는 틀린 적이 있다**(줄 수를 158로 답했는데 실제 223).
- **Codex가 낸 의견은 반드시 사용자에게 요약해 보여준다.** 보고서 경로만 남기고 넘어가지 않는다 — 사용자는 그 파일을 열어보지 않는다. ①무엇을 지적했나 ②내가 사실 확인한 것과 못 한 것 ③채택/미채택과 이유를 짧게. 길면 표로.

### Windows에서 막혀 있는 것 (2026-09-10 실측)

- `codex app-server daemon`이 **`only supported on Unix platforms`** — 그래서 `codex agents`(세션 브라우징 TUI)와 `codex remote-control`을 쓸 수 없다.
- `~/.codex/sessions/`에 **rollout이 안 남는다**(`codex exec`가 session id를 찍어도 파일이 없다) — `codex exec resume`으로 이어가거나 되짚을 수 없다.
- → **QA 한 건 = `codex exec` 한 번.** 맥락은 매번 브리프로 싣는다.
- 대화형 TUI는 Claude Code의 비대화형 셸에서 직접 못 띄운다. **대신 Orca의 Codex 터미널 탭으로 묻고 답한다** — 브리프 파일 → `orca terminal send` → `orca terminal wait --for tui-idle` → 산출물 파일 읽기. 절차는 `runbook/codex-handoff.md` 「Codex와 묻고 답하기」(2026-11-05 실측).

### Codex 작업 완료 후 원래 Claude Code 세션으로 직접 반환

Claude Code가 Codex에 넘긴 작업은 Codex의 사용자 보고만으로 끝내지 않는다. 작업 완료 후 **인계한 원래 Claude Code 세션에 결과를 직접 전송**해야 한다.

1. `orca worktree ps --json`과 `orca terminal list --json`으로 같은 워크트리의 기존 Claude 터미널을 찾는다.
2. 프롬프트·최근 출력·터미널 identity를 대조해 인계한 세션을 특정한다. 애매하면 임의 전송하지 말고 사용자에게 확인한다.
3. `orca terminal send --terminal <handle> --text "<인계 요약>" --enter --json`으로 결과를 직접 보낸다.
4. 응답의 `accepted: true`를 확인한다. 실패하면 한 번 재조회·재시도하고, 그래도 실패할 때만 사용자에게 전달 불가 사실과 복사용 인계문을 보고한다.

인계 요약에는 결과, 변경 파일 또는 커밋 해시, 검증 상태, 남은 위험과 다음 작업을 넣는다. **사용자에게 인계문만 보여주고 복사해 달라고 하거나, 새 Claude 프로세스를 띄우는 것은 직접 반환이 아니다.** 원래 세션이 이미 종료됐거나 찾을 수 없을 때만 사용자에게 대체 전달 방법을 요청한다.

**금지**
- `--dangerously-bypass-approvals-and-sandbox`로 호출하지 않는다. 승인이 필요하면 `--approve-for-me`를 쓴다.
- Git 마무리(stage·commit·merge·push)를 `codex exec`로 대신하지 않는다. 그건 Codex **메인 세션**의 몫이고, 여기서 띄우는 건 별도 프로세스라 같은 저장소를 두 주체가 동시에 건드리게 된다.

> **Claude Code 자신도 Git 마무리를 하지 않는다.** `CODEX.md`의 전담 조항 그대로다. 사용자가 특정 건에 대해 "네가 처리해라"라고 하면 **그 건에 한해** 수행하고, 다음 작업부터는 다시 인계로 돌아간다 — 한 번의 허락을 상시 권한으로 확대하지 않는다. (근거: 2026-08-30, 한 건에 받은 허락을 세션 내내 이어가 8회 커밋한 사례)
- 사용자 계정의 토큰이 소모되므로, 가벼운 조회가 아니면 호출 전에 알린다.

## Claude Code 서브에이전트 감독 방식
별도 감독 에이전트를 따로 두지 않는다 — **Claude Code 메인 세션이 아래 기준으로 분류해 맞는 서브에이전트를 순차로(병렬 아님) 호출**한다. Codex 작업은 이 표 밖에서 `CODEX.md`에 따라 직접 수행한다.

| 축 | 세부 | 에이전트 | model | effort | 기준 |
|---|---|---|---|---|---|
| 설계 | — | `code-architect` | opus | high | 새 시스템/리팩터링 방향처럼 구조 판단이 필요 |
| 컨텐츠 | — | `code-writer` | sonnet | low | 설계가 끝난 스펙을 그대로 구현 |
| 분량 | 큰 범위 | `client-bugfixer` | sonnet | medium | 여러 파일/이슈에 걸친 진단된 버그 수정 |
| 분량 | 작은 범위 | `quick-fix` | haiku | low | 원인이 명확한 단일 파일 국소 수정 |
| QA | 큰 범위 | `qa-tester` | opus | high | 여러 시스템 걸친 전체 플레이+영상분석+판단 |
| QA | 작은 범위 | `qa-quick-check` | sonnet | medium | 이미 고친 버그/특정 시나리오 하나만 재확인 |
| 마무리 리뷰 | — | `code-reviewer-committer` | sonnet | medium | 여러 에이전트 산출물의 참조 정합성·규칙을 검토하고 Codex에 커밋 가능 여부를 인계(이름은 호환용, 직접 커밋 금지) |

- `effort`는 에이전트 정의에 고정되어 호출 시점에 못 바꾼다(`model`은 호출 시 오버라이드 가능) — 그래서 축마다 별도 에이전트 파일로 나눠뒀다.
- 애매한 경우(둘 이상 축에 걸침) 더 무거운 쪽(설계 > QA-큰 > 분량-큰 > QA-작은 > 컨텐츠 > 분량-작은) 기준으로 판단.
- `code-reviewer-committer`는 다른 축과 배타가 아니라 **뒤에 붙는다** — 구현 계열 에이전트를 돌린 뒤 Codex의 Git 마무리 직전에 태운다. 이름은 기존 호출 호환을 위해 유지하지만 commit·merge·push는 하지 않고 참조 정합성·규칙 검토 결과를 Codex에 넘긴다.

## Design 버킷 에이전트의 model/effort (라우팅 기준은 별도, 여기선 값만)
| 에이전트 | model | effort |
|---|---|---|
| `design-planner` | opus | high |
| `design-issue-resolver` | sonnet | medium |

## 위 9개 에이전트(Client 7 + Design 2) 공통 규칙
- **자체 재위임 금지 — 구조적으로 강제**: 전부 `disallowedTools: Agent`가 걸려 있어 Agent 툴 자체가 없다. 스스로 다른 서브에이전트를 호출할 수 없고, 위임 순서는 감독(메인 세션)만 결정한다.
- **QA 계열엔 `maxTurns` 안전장치**: `qa-tester`는 80, `qa-quick-check`는 45 — Play Mode 포커스/프레임 문제 등으로 반복 재시도에 빠졌을 때 무한정 턴을 소모하지 않도록 상한을 둔다. 나머지 에이전트는 보통 스스로 끝나는 작업이라 아직 안 걸어뒀다.
- **설계→구현 핸드오프**: `code-architect`가 구현까지 안 가고 설계안만 낸 경우, 그 설계안은 `.claude/architecture/{주제}.md`에 저장한다 — `code-writer`는 매번 새 컨텍스트로 뜨는 서브에이전트라 대화 내용을 못 보므로, 이어서 구현을 맡길 땐 반드시 이 파일 경로를 함께 전달한다. (`.claude/design/`은 design-planner의 기획 스펙 전용이라 혼용하지 않는다.)

## 완료 알림 (카카오톡)
위 9개 에이전트(Client 7 + Design 2) 또는 `Agent` 툴로 호출한 fork/서브에이전트가 끝나면(성공/실패 무관, 결과를 받은 직후), `mcp__claude_ai_PlayMCP__KakaotalkChat-MemoChat` 도구로 완료 알림을 보낸다. 결과가 나중 턴에 알림으로 도착하는 백그라운드 fork도 동일 — 그 결과를 확인한 시점에 바로 보낸다.

**포맷** (줄바꿈 포함, 메시지 200자 제한 — 각 항목은 핵심만 짧게):
```
[Agent : {에이전트명 또는 fork 이름}]
[desc : {무엇을 했는지 한 줄 요약}]
[다음 추천 작업 : {이어서 하면 좋을 작업 한 줄, 없으면 "없음"}]
```

- 사용자가 이번 요청에서 "알림 필요 없다"고 명시하면 이번 건만 생략한다(이 규칙 자체를 지우지는 않는다).
- 단순 조회성 Explore/general-purpose 같은 가벼운 탐색 호출까지는 대상 아님 — 위 9개 에이전트와 명시적 fork(작업 위임 성격)에 한정.

상세 절차는 각 에이전트 정의 파일(`agents/{이름}.md`, 프로젝트에서는 `.claude/agents/{이름}.md`) 참고.

## 9개가 목록에 안 보이면
Claude Code는 subagent_type을 **작업 디렉토리**의 `.claude/agents/`에서만 찾는다. 워크스페이스 루트 세션은 SessionStart 훅이 마스터를 `.claude/agents/`로 깔아주고 종료 시 지운다 — 그래도 안 보이면 `node .claude/hooks/session-agents.js sync`를 직접 돌린다. **위임이 불가능한 상태면 조용히 직접 처리하지 말고 그 사실을 먼저 알린다**(2026-08-24, 못 지키는 규칙을 말 안 해서 문제가 늦게 발견됨). 상세는 `ParallelWorkContract.MD` §11.

- **에이전트 목록은 세션 시작 시 한 번 잡히고, 그 뒤엔 파일을 고쳐도 안 바뀐다.** 세션 도중 목록에서 사라졌다면 파일을 다시 깔거나 `sync`를 돌려도 그 세션에서는 복구되지 않는다.
- **`claude --continue`로는 복구되지 않는다** — 대화뿐 아니라 에이전트 목록 같은 세션 상태까지 이전 것을 그대로 복원하므로, 망가진 목록이 계속 따라온다. SessionStart 훅도 안 돈다(프로젝트 목록이 안 뜨는 것으로 확인 가능). **`--continue` 없이 새 세션으로 열어야** 훅이 돌고 목록이 새로 스캔된다.
- 그래서 위임을 재시도하려면 대화 맥락을 잃는다. 넘길 내용이 길면 먼저 **브리프 파일로 저장해두고** 새 세션에서 그 파일을 읽어 위임한다.
  - (근거: 2026-08-25, 세션 중 커스텀 에이전트 9개가 목록에서 빠진 뒤 `--continue`로 두 번 재시작했으나 그대로였다. 파일과 `sync`는 내내 정상이었어서 원인을 엉뚱한 곳에서 찾았다)
