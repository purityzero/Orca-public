AGENT.MD

Orca의 작업을 Codex 또는 Claude Code 서브에이전트에 배정하는 기준. Codex의 상세 책임과 완료 조건은 `CODEX.md`, Claude Code의 개별 서브에이전트 절차는 `agents/{이름}.md`를 따른다.

## 실행자 선택 — Codex도 정식 작업 에이전트다

| 작업 성격 | 우선 실행자 | 기준 |
|---|---|---|
| 저장소 전체 분석, 대규모 리팩터링, 마이그레이션 | **Codex** | 여러 파일의 흐름을 추적하고 구현·테스트·문서를 한 작업으로 닫아야 함 |
| CLI, PowerShell, 자동화, 검사기, 테스트 기반 수정 | **Codex** | 수동 규칙을 재현 가능한 명령과 종료 코드로 바꾸는 작업 |
| 문서-코드 정합성, 중복 규칙, 오래된 참조 감사 | **Codex** | 저장소 전역 검색과 실제 파일 수정이 함께 필요 |
| Unity 에디터 조작 전반(공식 CLI `unity`) — 씬·프리팹 **편집**, 리임포트 | **Codex** | 2026-09-10 방침. 2026-11-17 MCP for Unity를 걷어내고 CLI로 전환(`runbook/codex-qa-unity-cli.md`). 구현자의 컴파일 오류 확인은 예외(아래 방침) |
| Play Mode **검증·QA** | **Codex** | **구현한 주체가 자기 구현을 검증하지 않는다.** 구현=Claude Code / 검증=Codex로 가른다 |
| 프로젝트 전용 기획·밸런스 | `design-planner` / `design-issue-resolver` | 기존 에이전트 정의의 절차와 누적 노하우 사용 |
| 사용자가 실행자를 지정 | **사용자 지정 우선** | 다른 기준보다 우선 |

- Codex는 Claude Code가 실패하거나 남긴 일만 받는 예비 인력이 아니다. 위 표에 해당하면 처음부터 Codex가 작업을 소유한다.
- 한 작업을 Codex와 Claude Code가 비교 수행하면 동일한 목표·범위·성공 조건을 주고, 설명의 설득력이 아니라 테스트와 diff로 채택한다.
- Codex와 Claude Code가 협업하면 파일 소유권을 먼저 나누고, Unity 에디터 검증은 한 번에 하나만 수행한다. 상세는 `ParallelWorkContract.MD`를 따른다.

Claude 지휘자는 Codex로 배정할 때 `CODEX.md` §2의 프로필로 model/effort를 고른다. Codex Orca 작업자는 배정받은 범위를 직접 수행하고 서브에이전트·다른 작업자를 만들어 재위임하지 않는다.

### ★ Orca 작업자는 작업마다 모델·추론 강도를 골라 띄운다 (2026-11-17 사용자 지시)

Claude Code 메인 세션은 작업을 맡기기 전에 **작업 성격을 한 번 판단해** Orca 작업자(Claude Code 또는 Codex)의 모델과 추론 강도를 정한다. 무조건 가장 강한 조합을 쓰지 않는다 — 토큰을 아끼는 쪽이 기본이다.

```
orca orchestration worker-start --environment local --spec-file <브리프> --worktree current \
  --agent <claude|codex> --model <모델 ID> --effort <low|medium|high|xhigh|max>
```

`--worktree current` 예시에는 `--display-name`을 붙이지 않는다. 설치본 1.4.274 도움말은 current/existing worktree에서 거부한다고 적지만, 2026-11-25 실측에서는 오류 없이 무시되어 탭 이름이 바뀌지 않았다(아래 「Claude 역할 에이전트 실행 방식」 참고).

| 작업 성격 | Claude Code 작업자 | Codex 작업자 |
|---|---|---|
| 구조 설계·어려운 원인 분석·넓은 감사 | `claude-opus-5-5` / `high` | `gpt-6.1-sol` / `high` |
| 스펙이 정해진 구현·문서 정리·일반 QA | `claude-sonnet-5-5` / `medium` | `gpt-6.1-terra` / `medium` |
| 원인이 명확한 국소 수정·검색·단순 확인 | `claude-haiku-5-5` / `low` | `gpt-6-luna` / `low` |
| 실패 비용이 아주 큰 판단 | `claude-fable-5-2` / `high` 이상 | `gpt-6.1-sol` / `xhigh` 이상 |

- **누구에게 맡길지(Claude/Codex)는 위 「실행자 선택」 표가 먼저다.** 이 표는 정해진 실행자의 모델·강도만 고른다.
- 이 기준은 Claude Code 지휘자가 띄우는 Claude·Codex Orca 작업자에 적용한다. 지휘자는 Codex 작업자의 역할을 `CODEX.md` §2 프로필로 고르고, 모델·강도는 이 표에서 작업 성격에 맞춰 최종 선택한다. 프로필 기본값과 다르면 그 이유를 보고한다. Codex는 다른 작업자를 띄우거나 재위임하지 않는다.
- 사용자가 모델이나 강도를 지정하면 그것을 따른다(예: 2026-11-17 웹 조사·토론은 사용자 지정 `gpt-6-astra` / `high`).
- 선택 이유를 한 줄로 사용자에게 알린다. 표와 다르게 고르면 그 이유도 적는다.
- 끝난 작업자는 보고한 턴에 `orca orchestration worker-release --dispatch <id>`로 닫는다.
- 실측(2026-11-17): `--agent claude --model claude-haiku-5-5 --effort low`로 띄운 작업자가 그 모델로 응답했다. 추론 강도는 작업자가 스스로 확인하지 못하므로 시작 영수증(`effort` 필드)으로 확인한다. 화면 표시 방식(터미널 탭 / 구조화 채팅)은 Orca의 새 에이전트 탭 설정을 따른다.
- 모델 ID는 바뀐다. Codex는 `~/.codex/models_cache.json`, Claude는 시스템 안내의 최신 모델 목록으로 확인하고 이 표를 갱신한다.

### ★ 방침 — Unity 에디터를 조작하는 작업은 Codex가 맡는다 (2026-09-10 사용자 지시, 2026-11-17 CLI 전환)

| 작업 | 담당 |
|---|---|
| **씬·프리팹 편집, Play Mode, 리임포트** (Unity CLI로 에디터를 조작하는 일 전반) | **Codex** |
| 자기 변경의 **컴파일 오류 확인**(`unity recompile`·`script recompile_status`) | **구현자(Claude Code)도 가능** — 2026-11-17 사용자 결정. Play Mode·화면 판정·QA 통과 선언은 안 한다(`runbook/codex-qa-unity-cli.md` §4) |
| `.cs` · CSV · md 파일 편집 | **Claude Code** |
| Git 마무리(stage·commit·merge·push) | **지휘자가 배정한 Codex Orca 작업자** |

**경계의 목적은 파일 소유가 안 겹치게 하는 것이다.** Claude Code가 코드를 쓰는 동안 Codex는 씬·프리팹만 만진다. 둘이 같은 파일을 동시에 건드리면 `ParallelWorkContract.MD`의 계약이 깨진다.

**검증은 만든 쪽이 하지 않는다**(계속 유효). 코드를 짠 주체가 자기 코드를 검증하면 같은 맹점을 두 번 지난다 — 실제로 하루에 세 번(콜백 직접 호출, 표시 문자열 미확인, 한 종족만 확인) 놓쳤다. 이제 Play Mode를 Codex가 돌릴 수 있으므로, **구현=Claude Code / 검증=Codex**로 자연스럽게 갈린다.

Codex는 넘겨받은 작업 결과를 원래 Claude 지휘자에게 직접 반환한다. Orca 작업자는 프리앰블의 Task·Dispatch ID로 `worker_done`을 보내고 영수증을 확인한다. 사용자가 지정한 기존 탭의 별도 반환 경로는 `runbook/codex-handoff.md`를 따른다.

### Codex의 Unity 접근

Codex 호출·Unity 접근·인계·직접 반환 전에 `runbook/codex-handoff.md`를 읽는다.

## Claude Code 서브에이전트 감독 방식
별도 감독 에이전트를 따로 두지 않는다 — **Claude Code 메인 채팅이 지휘자**로서 아래 기준으로 분류해 맞는 역할 에이전트를 띄운다. Codex 작업은 이 표 밖에서 `CODEX.md`에 따라 Codex 작업자가 수행한다.

### ★ Claude 역할 에이전트 실행 방식 (2026-11-25 사용자 결정)
- **역할 에이전트는 새 세션(Orca 작업자)으로 띄운다.** Agent 도구 서브에이전트는 기본 경로가 아니다. Orca 작업자로 띄울 수 없을 때만 쓰고, 그 사실을 사용자에게 알린다.
  `orca orchestration worker-start --environment local --worktree current --agent claude --model <아래 표 model의 ID> --effort <아래 표 effort> --spec-file <브리프>`
  `--display-name`은 `--worktree current`에서는 탭 이름을 바꾸지 못한다(설치본 1.4.274 도움말은 "current/existing worktree에서 거부"라고 하지만, 실제로는 오류 없이 무시됐다 — 2026-11-25 이 세션의 작업자 탭은 모두 기본 이름으로 떴다).
- **역할 파일(`agents/{이름}.md`)은 정의서로 쓴다.** 브리프 첫 줄에 "`C:\AI\Orca\agents\{이름}.md`를 읽고 그 역할·절차·금지 사항을 따른다"를 넣는다.
- **frontmatter의 도구 제한(`tools`·`disallowedTools`)은 Orca 작업자에 자동으로 적용되지 않는다.** 읽기 전용, 재위임 금지, 수정 허용 파일 같은 제한은 브리프에 문장으로 명시한다. 이것은 지시일 뿐 구조적 강제가 아니다. 작업자가 끝나면 diff로 지켰는지 확인한다.
- **Codex 세션은 작업자 역할만 한다.** 지휘하거나 다른 작업자를 재위임하지 않는다. Git 마무리도 지휘자가 맡기는 작업으로 수행한다.
- 파일 소유권이 겹치는 작업자는 순차로, 겹치지 않으면 병렬로 띄운다(`ParallelWorkContract.MD`).
- Claude 작업자가 끝나면 SessionEnd 훅이 `.claude/agents/` 사본을 지운다. 닫은 뒤 `node .claude/hooks/session-agents.js sync`로 다시 깐다(`runbook/subagents.md`).

| 축 | 세부 | 에이전트 | model | effort | 기준 |
|---|---|---|---|---|---|
| 설계 | — | `code-architect` | opus | high | 새 시스템/리팩터링 방향처럼 구조 판단이 필요 |
| 컨텐츠 | — | `code-writer` | sonnet | low | 설계가 끝난 스펙을 그대로 구현 |
| 분량 | 큰 범위 | `client-bugfixer` | sonnet | medium | 여러 파일/이슈에 걸친 진단된 버그 수정 |
| 분량 | 작은 범위 | `quick-fix` | haiku | low | 원인이 명확한 단일 파일 국소 수정 |
| 검토 | 흐름 판단 | `code-flow-reviewer` | opus | high | 실제 호출 흐름에서 일어나는 문제만 판정(방어코드 필요 여부·과잉 지적 가리기). 읽기 전용 |
| 검토 | 이론 판단 | `code-theory-reviewer` | sonnet | medium | API 계약·내부 동작 근거로 이론상 실패 조건과 발생 조건을 정리. 수정 여부는 흐름 판단이 정함. 읽기 전용 |
| 마무리 리뷰 | — | `code-reviewer-committer` | sonnet | medium | 여러 에이전트 산출물의 참조 정합성·규칙을 검토하고 Codex에 커밋 가능 여부를 인계(이름은 호환용, 직접 커밋 금지) |

- **QA는 이 표에 없다 — Codex가 한다.** Claude는 만들고 코드 검수(읽기·규칙·정합성)까지 한다. Unity CLI를 쓰는 Play Mode QA는 Codex에 인계하고, 브리프에 절차서를 넣는다: 전체 플레이 `runbook/codex-qa-full.md`, 고친 것 재확인 `runbook/codex-qa-quick.md`. (2026-11-13 사용자 확인으로 `qa-tester`·`qa-quick-check` 서브에이전트를 이 절차서로 전환)
- 표의 model·effort는 기본값이다. Orca 작업자는 `--model`·`--effort`로 지정한다. 작업 성격에 따라 위 「모델·추론 강도」 표로 바꿀 수 있고, 바꾸면 이유를 알린다. 모델 별칭은 ID로 바꿔 쓴다: opus=`claude-opus-5-5`, sonnet=`claude-sonnet-5-5`, haiku=`claude-haiku-5-5`.
- **검토 축 순서**: 방어코드·예외 처리 검토는 `code-theory-reviewer`가 먼저 조건을 뽑고, 그 결과 표를 `code-flow-reviewer` 브리프에 넣어 실사용 기준으로 판정받는다. 고칠지 말지는 흐름 판단 결과로 정한다. 둘 다 읽기 전용이라 위 우선순위(설계 > 분량 …)와 겹치지 않고, 구현 에이전트보다 앞에 붙는다.
- 애매한 경우(둘 이상 축에 걸침) 더 무거운 쪽(설계 > 분량-큰 > 컨텐츠 > 분량-작은) 기준으로 판단.
- `code-reviewer-committer`는 다른 축과 배타가 아니라 **뒤에 붙는다** — 구현 계열 에이전트를 돌린 뒤 Codex의 Git 마무리 직전에 태운다. 이름은 기존 호출 호환을 위해 유지하지만 commit·merge·push는 하지 않고 참조 정합성·규칙 검토 결과를 Codex에 넘긴다.

## Design 버킷 에이전트의 model/effort (라우팅 기준은 별도, 여기선 값만)
| 에이전트 | model | effort |
|---|---|---|
| `design-planner` | opus | high |
| `design-issue-resolver` | sonnet | medium |

## 위 9개 에이전트(Client 7 + Design 2) 공통 규칙
- **자체 재위임 금지**: 위임 순서는 지휘자(메인 채팅)만 정한다. Agent 도구로 띄우면 `disallowedTools: Agent`로 구조적으로 막히지만, Orca 작업자로 띄우면 막히지 않으므로 브리프에 "다른 에이전트·작업자를 띄우지 않는다"를 명시한다.
- **Unity 에디터를 조작하지 않는다**: Play Mode 확인은 Codex 몫이므로 결과는 "Codex 검증 대기"로 보고한다. 컴파일 오류 확인만은 메인 세션이 할 수 있다(`runbook/codex-qa-unity-cli.md` §4). (QA 서브에이전트 시절의 재시도 상한 80·45턴은 Codex QA 절차서로 옮겼다)
- **설계→구현 핸드오프**: `code-architect`가 구현까지 안 가고 설계안만 낸 경우, 그 설계안은 `.claude/architecture/{주제}.md`에 저장한다 — `code-writer`는 매번 새 세션으로 뜨는 작업자라 대화 내용을 못 보므로, 이어서 구현을 맡길 땐 반드시 이 파일 경로를 함께 전달한다. (`.claude/design/`은 design-planner의 기획 스펙 전용이라 혼용하지 않는다.)

서브에이전트 목록 누락을 복구하기 전에 `runbook/subagents.md`를 읽는다.
