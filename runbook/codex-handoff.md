# Runbook — Codex 인계

마지막 적용: 2026-11-25

## 현행 기본 경로 — Orca 작업자 시작과 완료 반환

실행 구조는 [AGENT.MD](../AGENT.MD) 「Claude 역할 에이전트 실행 방식」을 따른다. Claude 메인 채팅이 지휘하고 Codex 작업자는 배정 범위를 직접 수행하며 재위임하지 않는다. **신규 작업은 `worker-start` → `worker_done` → `worker-release`로 회수·종료한다.** 기존 탭을 자동 재사용하거나 `codex exec`로 대신하지 않는다.

명령·오류 복구는 설치본 `orca skills get orchestration`·`orca skills get orca-cli`를 먼저 읽는다. 영수증의 `next`가 있으면 따르며, 가벼운 조회가 아니면 토큰을 쓰는 호출 전에 사용자에게 알린다.

과거 관찰(2026-08-30): Agent 도구의 `ListAgents`에 Codex가 없었던 사실을 Orca orchestration 메시징 불가로 해석하지 않는다.

### 인계문 필수 정보

맥락은 `.claude/briefs/{날짜}-{주제}.md`에 적고 절대경로로 전달한다. **역할 에이전트라면 첫 줄에 역할 정의서를 읽고 따르라는 지시를, 둘째 줄에 답변·중간 보고는 한국어 존댓말, 산출물은 한국어라는 지시를 넣는다. 역할 정의서가 없는 작업은 언어 지시를 첫 줄에 넣는다.** 브리프 자체와 에이전트 간 메시지도 존댓말로 쓴다([CODEX.md](../CODEX.md) §0). 질문·검토라면 전제·확인된 사실·제안·질문을 넣고, 2차 질문은 `-r2.md`로 구분한다.

| 필수 항목 | 적을 내용 |
|---|---|
| 목표·경로 | 닫힌 목표, 프로젝트·브리프 절대경로. 작업자의 cwd를 추정하지 않는다 |
| 파일 소유권 | 소유 파일·수정 허용/금지 범위·산출물 경로. 읽기 전용이면 **프로젝트 파일 수정 금지, 산출물은 `Temp/` 아래에만** 명시 |
| Git 경계 | 더티 상태여도 커밋하면 안 되는 파일 목록, Git 마무리 배정 여부 |
| 확인된 근거 | 이미 측정한 값과 재측정 금지, 판정에서 제외할 기존 결함 |
| 검증 | 검증 명령·성공 조건·시나리오. Play Mode QA는 [전체](codex-qa-full.md) 또는 [재확인](codex-qa-quick.md) 절차서 경로 |
| 보고·반환 | UTF-8 md 보고서 절대경로 하나, 완료 반환문. 답변·중간 보고는 한국어 존댓말, 산출물은 한국어 |
| 기존 탭의 수신 세션 | 원래 지휘자 handle·세션. 자기 탭은 최근 `lastOutputAt`과 `preview`의 자기 문장을 함께 대조해 특정 |

**한글 보고는 UTF-8 파일로 받으며 `reportPath`(`--report-path`)로 알린다.** 메시지 본문에는 결론 한 줄만 적는다(2026-11-25: `worker_done` 본문과 수신함의 한글 깨짐 확인).

### 시작·질문·수신

```text
orca orchestration worker-start --environment local --worktree current --agent codex --model <모델 ID> --effort <강도> --spec-file <브리프 절대경로> --json
```

- 모델·강도는 [AGENT.MD](../AGENT.MD)의 기준과 [CODEX.md](../CODEX.md) §2 프로필로 고른다. `--display-name`은 current worktree 예시에 붙이지 않는다.
- 지휘자는 시작 영수증의 Task·Dispatch ID를 보관한다. 질문·추가 지시는 orchestration 메시지로 주고받고 작업자 터미널에 `terminal send`로 넣지 않는다. 작업자는 프리앰블의 `ask`·반환 명령을 따른다.
- 진행·결과는 Orca 작업자 기록과 브리프의 보고서 경로에 남긴다. 과거 `codex exec`의 stdout 기록을 현행 로그 수집 경로로 쓰지 않는다.
- 파일 소유권·공유 자원은 [ParallelWorkContract.MD](../ParallelWorkContract.MD)를 따른다. **에디터 조작은 한 번에 하나만** 배정한다.

### Codex 작업 완료 후 원래 Claude Code 세션으로 직접 반환

브리프 끝에 다음 반환문을 직접 넣는다. 사용자에게만 답하거나 복사용 문구만 주는 것으로 반환을 대신하지 않는다(2026-09-12: Git 마무리 후 직접 반환 누락).

> Orca 작업자는 작업이 끝나면 프리앰블의 `--from`·Task·Dispatch ID와 실제 성공·실패(`--outcome succeeded|failed`)로 `worker_done`을 정확히 한 번 보내고 성공 영수증을 확인해 주세요. 보고서는 UTF-8 md 파일로 저장하고 `--report-path`로 알려 주세요.

#### 반환 명령 예시

```text
orca orchestration send --from <프리앰블의 from> --type worker_done --subject "<작업명·결과>" --body "<결론 한 줄>" --task-id <Task ID> --dispatch-id <Dispatch ID> --outcome <succeeded|failed> --report-path <UTF-8 보고서 절대경로>
```

명령 값은 프리앰블과 실제 결과를 사용한다. 결과 파일이 없는 경로나 임의의 Task·Dispatch ID를 넣지 않는다.

- 작업자는 전송이 성공하면 그 작업을 끝내며 같은 결과를 `terminal send`로 중복 전송하지 않는다. 실패하면 CLI가 제시한 복구만 따른다.
- 지휘자는 `worker_done`과 보고서로 회수한다. `terminal wait --for tui-idle`, rollout 수신 기록, `accepted: true`를 이 경로의 완료 판정으로 쓰지 않는다.
- 보고에는 결과, 변경 파일 또는 커밋 해시, 검증 상태, 남은 위험·다음 작업을 담는다. 실패·미검증을 성공으로 보고하지 않는다.

### 원본 재확인·사용자 요약·정리

1. **받은 보고의 핵심 주장을 원본에서 재확인한 뒤에만 사용한다.** 좌표·개수는 직접 다시 센다. 보고뿐 아니라 검사 스크립트도 틀릴 수 있다([검사기 검증](verification-scripts.md), 2026-09-10 실측).
2. **Codex 의견을 반드시 사용자에게 요약한다.** 지적 내용, 사실 확인한 것과 못 한 것, 채택/미채택과 이유를 짧게 쓰고 길면 표로 적는다. 보고서 경로만 남기지 않는다.
3. 지휘자는 `worker_done`을 받고 보고한 그 턴에 `orca orchestration worker-release --dispatch <id>`로 닫는다. release가 이미 닫힘·비활성으로 답하면 그대로 둔다. `--keep-open`은 사용자가 원할 때만 쓴다. 아직 끝나지 않은 작업자는 release할 수 없으므로 `worker-stop`으로 멈춘다. `worker-list`의 `next`가 다른 조치를 요구하면 그것을 따른다.
4. **사용자 요약을 마친 그 턴에 일회용 브리프·산출물과 빈 `.claude/briefs/`를 묻지 않고 지운다.** 남길 결론은 요약과 채택한 md에 기록한다(`.gitignore` 대상, 2026-11-05 사용자 지시).
5. **아직 답을 못 받았거나 2차 질문이 남은 인계 파일은 보존한다.** 그 인계가 닫힐 때 정리하며, 세션 종료 훅으로 일괄 삭제하지 않는다. 세션을 넘겨 계속할 브리프도 보존한다.

## 사용자가 지정한 기존 Codex 탭에 직접 인계 — `orca terminal`

**사용자가 기존 탭을 지정했고 orchestration Dispatch가 없는 경우만** 이 별도 경로를 쓴다. Dispatch가 있으면 위 orchestration 경로를 유지한다. 다른 에이전트와의 대화·반환은 `orca orchestration send --to <handle 또는 orca_session_id:...>`를 우선하며, `terminal send`는 사용자가 지정한 기존 탭에만 한정한다.

1. `orca worktree ps --json`과 `orca terminal list --json`으로 지정 탭의 현재 세션·handle을 **전송 직전** 대조한다. `agentIdentity == "codex"`나 최근 출력만으로 임의 탭을 고르지 않는다. 새 세션 직후면 목록을 한 번 더 확인하고 지정 탭이 없거나 애매하면 확인한다.
2. 탭 상태와 실제 cwd를 화면 아랫줄 또는 최신 rollout의 `session_meta.cwd`로 확인한다. `worktreePath`가 실제 cwd를 보장하지 않는다. cwd가 다르면 그 탭을 쓰지 않고 새 탭도 다시 확인한다.
3. 지정 탭에 브리프 절대경로와 **완료 시 원래 수신 세션으로 직접 반환할 것**을 보낸다. `accepted: true`·`turn_started`는 지정 세션의 처리나 완료 증거가 아니다(2026-09-12: 종료 직전 옛 세션 수신).

```text
orca terminal send --terminal <지정 handle> --text "<브리프 절대경로>를 읽고 검토 후 <원래 수신 세션>에 직접 반환해 주세요" --enter --json
orca terminal read --terminal <지정 handle> --screen --json
```

- 화면 확인은 `--screen`을 붙인다. 누적 출력은 TUI repaint로 불완전하고 빈 화면도 가능하므로, **결과는 산출물 파일로 읽는다.**
- 수신은 해당 rollout의 전송 시각 이후 `role: user`·`input_text`가 보낸 내용과 일치해야 확인된다. 파일 생성·갱신이나 `tui-idle`만으로 판정하지 않는다. 30초는 첫 점검 시점이며, 못 찾으면 미확인으로 두고 화면·세션 상태를 본다.
- **제출되지 않았음이 확인된 경우만 재전송한다.** 전송 오류에 `--retry-request` ID가 있으면 같은 ID로 CLI 복구를 따른다. 침묵을 이유로 같은 질문을 자동 재전송하지 않는다.
- 대기는 `orca terminal wait --terminal <handle> --for tui-idle --timeout-ms <대기 ms>`로 하되 총 10분까지만 한다. 브리프에 파일 끝의 `<!-- codex-done -->`를 요구하고, 표시가 없으면 미완료로 두고 상한 안에서 기다린다. 상한을 넘기면 중단·오류 가능성을 사용자에게 알린다.
- 반환 시 원래 지휘자 세션을 프롬프트·최근 출력·identity로 특정한다. 지정 수신 탭에 `terminal send`한 경우 `accepted: true`를 확인하되 완료 증거로 확대하지 않는다. 원래 세션이 종료됐거나 특정할 수 없을 때만 대체 전달 방법을 요청하며, 새 Claude 프로세스로 대신하지 않는다.
- 전달이 불가능하면 사용자에게 그 사실과 결과·변경 파일·검증·위험·다음 작업을 담은 복사용 인계문을 보고한다. 정상적인 직접 반환 대신 처음부터 사용자 복사를 요구하지 않는다.
- 안전 필터가 차단하면 명령을 바꿔 우회하지 않는다. 사용자에게 알리고 사용자가 탭을 열어 붙여 넣는 방법으로 전달한 뒤 파일 회수·재확인·요약을 수행한다(2026-11-05 실측). 파일 정리는 위 공통 절차를 따른다.

## Codex의 Unity 접근 — 과거 MCP 실측 (2026-11-17 폐기)

MCP 접속·승인 옵션을 쓰던 실행 경로는 **2026-11-17 폐기**했다. 현행 Unity 공식 CLI·Pipeline의 준비와 대상 지정은 [Unity CLI QA](codex-qa-unity-cli.md)를 따른다.

## Windows에서 막혀 있던 것 (2026-09-10 과거 실측)

2026-09-10 Windows의 `codex exec`에서 Unix 전용 daemon·agents·remote-control 및 기본 홈 rollout/resume 제한을 관찰했으며 당시 버전은 미기록이다. 반면 2026-11-05 **codex-cli 0.166.0의 Orca 대화형 탭**은 같은 `$CODEX_HOME`의 `sessions/YYYY/MM/DD/rollout-*.jsonl`·`session_index.jsonl`과 `codex resume <ID>`를 확인했으므로, 과거 exec 관찰을 현행 작업자에 일반화하지 않는다.

## 인계할 때 꼭 넣을 것

### 에이전트가 Claude CLI를 실행할 때

자동화·검증용 Claude CLI를 실행하는 **실제 자식 프로세스 환경**에 `ORCA_SKIP_CHAT_REDIRECT=1`을 넣는다. PowerShell은 원래 값을 보존했다가 `finally`에서 복구한다. `-p`/SDK·조상 제외와 데몬 경유 환경 상속의 한계는 [세션 환경 런북](session-environment.md#orca-터미널-claude-cli--채팅-안내)이 정본이다.

```powershell
$previousChatRedirect = $env:ORCA_SKIP_CHAT_REDIRECT
try {
    $env:ORCA_SKIP_CHAT_REDIRECT = '1'
    claude -p '<검증 프롬프트>'
} finally {
    $env:ORCA_SKIP_CHAT_REDIRECT = $previousChatRedirect
}
```

호출자에게만 skip을 붙인 `orca agent launch --agent claude --surface terminal`은 제외를 보장하지 않는다. 대화형 시험이 필요하면 빈 Orca PowerShell 터미널 안에서 skip을 설정하고 `claude`를 실행한다. 시험 탭·자동 생성 채팅인지 확인한 후 검증이 끝나면 정리한다.

## 토큰이 떨어질 수 있다

긴 작업을 넘기기 전에 남은 한도를 확인하거나 권한 있는 Git 담당자에게 중간 커밋을 배정한다. 한도에 걸리면 **미커밋 상태로 멈추고 워킹트리를 되돌리지 않는다.** 이어받을 수 있는지 상태부터 확인한다(2026-09-10: 씬 재배치 도중 중단).

## 금지

- `--dangerously-bypass-approvals-and-sandbox`로 호출하지 않는다. 승인 관련 옵션은 설치본 `--help`를 확인하며, 도구가 막혔다고 결론 내리기 전에 도움말을 끝까지 읽는다.
- **Git 마무리(stage·commit·merge·push)는 지휘자가 배정한 Codex Orca 작업자가 맡고 `codex exec`로 대신하지 않는다.** 소유권·검증·브랜치 삭제·원격 권한 조건은 [CODEX.md](../CODEX.md) 「Git 마무리 전담」을 따른다.
- `.claude/hooks/codex-exec-git-guard.js`의 PreToolUse(`Bash|PowerShell`)가 명령 인수·stdin 브리프의 Git 마무리 위임을 차단한다. **stdin 브리프를 읽지 못해도 차단하므로 먼저 파일을 만들고 별도 명령으로 처리한다.** 동적 변수·래퍼·중첩 치환 등 셸 전체 문법을 완전 해석하지 못해 누락·오탐이 가능하다(2026-11-06: 재발 3회 후 훅 승격).
- Claude도 Git 마무리를 직접 하지 않는다. 사용자가 특정 건을 직접 맡기면 그 건에만 적용하고 다음 작업에는 인계로 돌아간다. 일회 허락을 상시 권한으로 확대하지 않는다(2026-08-30: 허락 범위 확대 사례).
