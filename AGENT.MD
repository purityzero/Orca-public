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

### ★ 방침 — Unity MCP를 부르는 작업은 Codex가 맡는다 (2026-09-10 사용자 지시)

| 작업 | 담당 |
|---|---|
| **씬·프리팹 편집, Play Mode, 리임포트·재컴파일** (Unity MCP 호출 전반) | **Codex** |
| `.cs` · CSV · md 파일 편집 | **Claude Code** |
| Git 마무리(stage·commit·merge·push) | Codex **메인 세션** |

**경계의 목적은 파일 소유가 안 겹치게 하는 것이다.** Claude Code가 코드를 쓰는 동안 Codex는 씬·프리팹만 만진다. 둘이 같은 파일을 동시에 건드리면 `ParallelWorkContract.MD`의 계약이 깨진다.

**검증은 만든 쪽이 하지 않는다**(계속 유효). 코드를 짠 주체가 자기 코드를 검증하면 같은 맹점을 두 번 지난다 — 실제로 하루에 세 번(콜백 직접 호출, 표시 문자열 미확인, 한 종족만 확인) 놓쳤다. 이제 Play Mode를 Codex가 돌릴 수 있으므로, **구현=Claude Code / 검증=Codex**로 자연스럽게 갈린다.

Codex는 넘겨받은 작업 결과를 원래 Claude 터미널로 직접 보내고 `accepted: true`까지 확인한다.

### Codex의 Unity 접근

Codex 호출·Unity 접근·인계·직접 반환 전에 `runbook/codex-handoff.md`를 읽는다.

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

서브에이전트 완료 알림을 보내거나 목록 누락을 복구하기 전에 `runbook/subagents.md`를 읽는다.
