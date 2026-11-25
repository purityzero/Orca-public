# Runbook — Codex 인계

마지막 적용: 2026-11-25

## 현행 기본 경로 — Orca 작업자 시작과 완료 반환

Claude 메인 채팅이 지휘자이며, **신규 Codex 작업은 `worker-start`로 새 Orca 작업자 세션에 배정한다.** 기존 탭을 자동 재사용하지 않으며, `codex exec`로 대신하지 않는다. Codex는 브리프의 수정 허용 범위를 직접 수행하고 재위임하지 않는다(`AGENT.MD` 「Claude 역할 에이전트 실행 방식」).

```
orca orchestration worker-start --environment local --worktree current --agent codex --model <모델 ID> --effort <강도> --spec-file <브리프 절대경로> --json
```

- 브리프에는 목표·소유 파일·금지 범위·검증 조건·UTF-8 보고서 경로를 적는다. `--display-name`은 current worktree 예시에 붙이지 않는다(`AGENT.MD`).
- 지휘자는 시작 영수증의 Task·Dispatch ID와 `next`를 따른다. 작업자와의 질문·추가 지시는 orchestration 메시지로 주고받으며, 작업자 터미널에 `terminal send`로 넣지 않는다.
- 작업자는 프리앰블의 `--from`·Task·Dispatch ID와 `--outcome succeeded|failed`로 `orca orchestration send --type worker_done ... --report-path <보고서 절대경로>`를 정확히 한 번 보내고, 성공 영수증을 확인하면 그 작업을 끝낸다. 전송 실패 시 CLI가 안내한 복구만 따른다.
- 지휘자는 `worker_done`과 보고서로 결과를 회수하고 핵심 주장을 원본에서 재확인한다. 이 경로에는 `terminal wait --for tui-idle`, rollout 수신 확인, `accepted: true`를 완료 판정으로 쓰지 않는다.

**사용자가 기존 탭을 지정한 경우만** 아래 기존 탭 경로를 쓴다. 이 탭이 orchestration 작업자로 등록됐다고 가정하지 않는다. 이미 Dispatch가 있는 작업자는 지정된 탭이어도 orchestration 메시지와 `worker_done` 경로를 유지한다.

## Claude Code가 Codex를 직접 호출한 과거 기록 (2026-08-30 확인)

아래 `codex exec`·MCP 관련 내용은 당시 실측 기록이며 현재 실행 지침이 아니다. 현행 신규 작업은 위 `worker-start` 경로를 따른다. 당시 **`ListAgents`에는 Codex가 안 잡혔다** — 이 관찰을 Orca orchestration 메시징이 불가능하다는 뜻으로 해석하지 않는다.

### Codex의 Unity 접근 — 과거 MCP 실측 (2026-11-17 폐기)

현행 에디터 접근은 Unity 공식 CLI와 Pipeline을 쓴다. 준비·대상 지정은 `runbook/codex-qa-unity-cli.md`를 따른다. 아래는 MCP 시절 기록이다.

`~/.codex/config.toml`에 `[mcp_servers.unityMCP] url = "http://127.0.0.1:8080/mcp"`가 등록돼 있어 **Codex도 같은 Unity 에디터에 붙는다.**

**`--approve-for-me`를 붙이면 조작 도구까지 호출된다.**

```
codex exec --approve-for-me --color never -C "<작업 루트>" -o "<보고서>" - < "<브리프 파일>"
```

`refresh_unity` 호출에서 `PermissionRequest` 훅이 자동 심사로 통과하는 것을 실측했다(codex-cli 0.150.1).
Play Mode 진입·조작·종료까지 실제 QA 1회를 완주했다.

> 2026-09-09에 이 절은 "읽기만 된다"였다. 그건 **`--approve-for-me` 없이** 시험한 결과였고,
> 그때 본 `MCP tool call requires approval, but approval policy is never`는 옵션 부재가 원인이었다.

> **도구가 막혔다고 결론 내기 전에 `--help`를 끝까지 읽는다.**

### 사용자가 지정한 기존 Codex 탭에 직접 인계 — `orca terminal`

사용자가 기존 탭을 지정했고 그 탭이 orchestration Dispatch에 속하지 않을 때만 쓰는 별도 경로다. 신규 작업자를 이 흐름으로 시작하지 않는다. 지정한 기존 세션에 넣으려면:

```
orca terminal list --worktree path:<워크트리> --json     # agentIdentity == "codex" 를 찾는다
orca terminal send --terminal <handle> --text "<인계문>" --enter
orca terminal read --terminal <handle> --screen          # 결과 회수
```

- `read`는 **`--screen`을 붙인다.** 안 붙이면 누적 출력이라 프롬프트 repaint가
  `cclclaclauclaudclaude`처럼 조각으로 쌓여 읽을 수 없다.
- 보낸 메시지는 사용자가 친 것처럼 그 세션에 들어간다.

### 터미널이 여러 개일 때 잘못 보내지 않기

Claude 터미널이 2개 이상일 수 있다. **`lastOutputAt`이 방금인 쪽 + `preview`에 내가 쓴 문장이
보이는 쪽**이 자기 터미널이다. 인계문에 자기 핸들을 적어 보내면 Codex가 되묻지 않는다.

### Codex에 넘길 때 지킬 것

- **맥락은 브리프 파일로 넘긴다.** `.claude/briefs/{날짜}-{주제}.md`에 적고 신규 작업은 `worker-start --spec-file`로 준다. 사용자가 지정한 기존 탭에는 브리프 절대경로를 전달한다.
  세션을 이어붙이는 길이 Windows에선 막혀 있어서(아래) 브리프가 그 역할을 대신한다.
  브리프와 Codex 산출물은 일회용이다 — **요약 보고 직후 지운다**(`.gitignore` 대상, 절차는 `runbook/codex-handoff.md` 7단계).
- **진행과 결과는 Orca 작업자 기록과 브리프의 보고서 경로에 남긴다.** 위 `codex exec` stdout 기록은 과거 관찰이며 현행 로그 수집 경로가 아니다.
- **파일 소유권과 산출물 경로를 브리프에 명시한다.** 읽기 전용 검토라면
  프롬프트에 **"프로젝트 파일 수정 금지, 산출물은 `Temp/` 아래에만"**을 명시한다.
- 에디터를 쓰는 주체가 동시에 둘이 되지 않게 **한 번에 하나만** 돌린다.
- 받은 보고서는 **핵심 주장을 원본에서 재확인한 뒤에만** 사용한다. Codex 출력도 「검증은 프로덕션 경로를 타야 한다」의 적용 대상이다.
  긴 문서의 **앞뒤 모순 찾기**엔 쓸 만하지만 **단순 계수는 틀린 적이 있다**(줄 수를 158로 답했는데 실제 223).
- **한글 보고는 파일로 받는다.** Orca `worker_done` 본문의 한글이 `?`로 깨져 도착한 적이 있다. 수신함 원문도 같이 깨져 있었다. 그래서 브리프에 "보고는 UTF-8 md 파일로 저장하고 `reportPath`로 경로를 알려 달라"를 넣는다. 본문은 결론 한 줄만 받는다. (2026-11-25, 풀링 흐름 확인 보고가 깨져서 줄 번호만 보고 직접 다시 읽었다)
- **Codex가 낸 의견은 반드시 사용자에게 요약해 보여준다.** 보고서 경로만 남기고 넘어가지 않는다 — 사용자는 그 파일을 열어보지 않는다. ①무엇을 지적했나 ②내가 사실 확인한 것과 못 한 것 ③채택/미채택과 이유를 짧게. 길면 표로.

### Windows에서 막혀 있던 것 (2026-09-10 과거 실측)

아래는 당시 `codex exec` 경로의 한계이며, 현재 신규 작업을 그 경로로 실행하라는 뜻이 아니다.

- `codex app-server daemon`이 **`only supported on Unix platforms`** — 그래서 `codex agents`(세션 브라우징 TUI)와 `codex remote-control`을 쓸 수 없다.
- `~/.codex/sessions/`에 **rollout이 안 남는다**(`codex exec`가 session id를 찍어도 파일이 없다) — `codex exec resume`으로 이어가거나 되짚을 수 없다.
  - **단, Orca 탭의 대화형 Codex는 남는다**(2026-11-05 실측, codex-cli 0.166.0): `$CODEX_HOME`(Orca 계정 홈)`/sessions/YYYY/MM/DD/rollout-*.jsonl`과 제목 색인 `session_index.jsonl`이 쌓이고, `codex resume <ID>`로 다시 열 수 있다(같은 `CODEX_HOME`에서). 위 관측은 기본 홈의 `codex exec` 기준이다.
- 당시에는 QA 한 건마다 `codex exec`를 한 번 실행했다. 현행 QA도 신규 작업은 Orca 작업자에 배정하고 맥락을 브리프로 싣는다.
- 대화형 TUI를 Claude Code의 비대화형 셸에서 직접 띄우지 못했던 관찰이다. 현행은 `worker-start` → `worker_done` → 보고서 회수이며, 사용자가 기존 탭을 지정했을 때만 아래 「Codex와 묻고 답하기」의 `terminal send`·대기·파일 회수 절차를 쓴다.

### 사용자가 "새 세션 열었다"고 하면 **전송 직전에** 핸들을 다시 확인한다

이 절은 사용자가 인계받을 기존 탭을 지정한 경우에만 적용한다. 새 세션을 열었다는 말만으로 아무 Codex 탭이나 골라 재사용하지 않으며, 지정 탭을 특정할 수 없으면 확인한다. 신규 작업자 배정에는 시작 영수증의 Dispatch를 사용한다.

터미널 핸들은 세션마다 바뀐다. 그런데 **목록을 확인한 시점과 전송 시점 사이에 세션이 또 바뀔 수 있다.**

2026-09-12에 실제로 그랬다 — 사용자가 새 세션을 열었다고 해서 목록을 확인했는데 그때는 옛 터미널
하나만 잡혔고(새 세션이 아직 목록에 안 올라옴), 그쪽으로 인계문을 보냈다. `accepted: true`와
`turn_started`까지 받았지만 **그 세션은 곧 종료됐고** 사용자가 "다시 인계해봐"라고 해서야 알았다.

**`turn_started`는 "그 시점에 살아있는 세션이 받았다"는 증거일 뿐, 사용자가 보고 있는 세션이라는
증거가 아니다.** 죽어가는 세션도 입력은 받는다.

**그래서 이렇게 한다**
- 목록에서 `lastOutputAt`이 **가장 최근인** codex 터미널을 고른다. 방금 열린 세션은 시작 화면을
  막 출력했으므로 그게 가장 최근이다
- 새 세션을 열었다는 말을 들은 직후라면 **한 번 더 목록을 확인한다.** 목록에 아직 안 올라올 수 있다
- `orca terminal read`로 도착을 확인하려 하지 마라 — 이 환경에서는 빈 화면을 주는 경우가 많다

## Codex와 묻고 답하기 — Orca 탭 (2026-11-05 실측)

사용자가 "Codex랑 논의해줘, 생각도 보이게"라고 해도 **신규 작업은 위 `worker-start`·`worker_done` 경로가 기본**이다. 아래 2~5단계는 사용자가 기존 Codex 탭을 지정한 경우만 적용하는 별도 절차이며, 그 탭의 대화 과정이 사용자 화면에 보인다. `codex exec`는 쓰지 않는다.

1. **질문은 브리프 파일로 쓴다** — `.claude/briefs/{날짜}-{주제}.md`. 전제·확인된 사실·내 안·묻는 것·범위 제한,
   그리고 **산출물 경로 하나**(`…-codex.md`)를 적는다. 2차 질문은 `-r2.md`처럼 이어 붙인다.
   **맨 위에 "답변·중간 보고는 한국어 존댓말로, 산출물은 한국어로" 한 줄을 넣는다** — 사용자가 Codex 출력을 직접 읽는다(2026-11-05 지시, 존댓말은 2026-11-17 요청, `CODEX.md` §0). 브리프 자체도 존댓말로 쓴다.
2. **사용자가 지정한 기존 탭을 확인한다** — `orca terminal list --json`으로 지정 탭의 handle과 현재 세션을 대조한다. `agentIdentity == "codex"`라는 이유만으로 다른 탭을 재사용하지 않는다. 지정 탭이 없으면 확인하며, 신규 배정은 `worker-start`로 한다.
3. **지정한 기존 탭에만 보낸다** — `orca terminal send --terminal <handle> --text "<브리프 절대경로> 를 읽고 요청대로 검토해 주세요" --enter`
   - **보내기 전에 탭 상태와 작업 폴더를 확인한다.** `orca terminal list --json`에 그 handle이 없으면 그 탭에 보내지 않는다
     (보내면 `terminal_not_writable`). `terminal list`의 `worktreePath`는 Orca가 관리하는 경로라 실제 Codex cwd와 다를 수 있다 —
     **화면 아랫줄 또는 최신 rollout 첫 줄 `session_meta.cwd`**로 확인한다. 2026-11-05에 Codex 탭의 cwd가
     `$CODEX_HOME/worktrees/433e/Orca`(커밋 기준 분리 worktree)였다. 다르면 그 탭을 쓰지 말고 새로 열되, 새 탭도 cwd를 다시 확인한다.
   - **보낸 뒤 수신을 확인한다.** `accepted: true`와 `tui-idle`은 Codex가 입력을 처리했다는 증거가 아니다.
     rollout 파일이 생기거나 갱신되는 것도 부족하다(지침·메타데이터·응답도 파일을 갱신한다).
     **해당 rollout에 전송 시각 이후 `role: user` 레코드가 생기고 그 `input_text`가 보낸 내용과 일치해야** 받은 것이다.
     30초는 첫 점검 시점일 뿐 보장 시간이 아니다. 못 찾으면 '미확인'으로 두고 화면·세션 상태부터 본다.
     **다시 보내는 것은 제출되지 않았음이 확인됐을 때만** 한다(중복 작업 위험). 전송 오류로 `--retry-request` ID를 받았으면 그 ID로 재시도한다.
     (근거: 2026-11-05 `/new` 직후 보낸 브리프가 `accepted: true`·`tui-idle`인데 어느 rollout에도 user 레코드가 없었다. Codex 검토로 판정 기준을 좁혔다)
4. **끝날 때까지 기다린다** — `orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 540000`
   (Bash timeout 600000). 실측 2~6분.
5. **결과는 화면이 아니라 산출물 파일로 읽는다.** 화면 읽기는 TUI repaint 때문에 불완전하다.
   - 브리프에 "산출물 맨 끝 줄에 `<!-- codex-done -->`"를 요구한다. `tui-idle`이 떠도 파일이 다 쓰였다는 보장이 없어서다.
     표시가 없으면 미완료로 보고 다시 기다린다.
   - 재대기는 **총 10분까지.** 그때도 없으면 중단·오류 가능성을 사용자에게 알리고, 같은 질문을 자동으로 다시 보내지 않는다.
   - (근거: 2026-11-05 Codex와 묻고 답하기 테스트에서 Codex가 동의하고 상한 규칙을 보탰다)
6. 핵심 주장은 원본에서 재확인하고 사용자에게 표로 요약한다(「Codex에 넘길 때 지킬 것」).
7. **요약을 보고한 그 턴에 브리프·산출물을 지운다** — 묻지 않고 지운다. 빈 `.claude/briefs/`도 지운다.
   남길 결론은 요약 보고와, 반영할 경우 해당 md에 들어간다. 폴더는 `.gitignore` 대상이라 커밋되지 않는다.
   - 아직 답을 못 받았거나 2차 질문이 남은 인계의 파일은 지우지 않는다. 그 인계가 끝날 때 함께 지운다.
   - 세션 종료 훅으로 일괄 삭제하지 않는 이유: 세션을 넘겨 이어지는 인계의 브리프까지 지워진다.
   - (근거: 2026-11-05 사용자 지시 "수행을 끝낸 임시 파일 같은 애들은 자동으로 지워주자")

- 2026-11-05에 2단계·3단계를 Claude가 직접 하려다 **안전 필터에 막힌 적이 있다.** 그때는 사용자가 탭을 열고
  붙여 넣었고, 4~6단계(대기·파일 읽기·요약)는 Claude가 했다. 막히면 같은 명령을 바꿔 재시도하지 말고
  사용자에게 알려 위 방식으로 진행한다.

## 인계할 때 꼭 넣을 것

### 에이전트가 Claude CLI를 실행할 때

이 워크스페이스는 사람이 Orca 터미널에서 Claude CLI를 시작하면 채팅으로 안내한다.
에이전트가 검증·자동화를 위해 CLI를 실행할 때는 **그 Claude 프로세스가 상속할 환경**에 `ORCA_SKIP_CHAT_REDIRECT=1`을 넣는다.
`-p`/SDK와 Claude·Codex 조상도 자동 제외하지만, 명시적 변수는 그 판정의 보조 수단이다.

```bash
ORCA_SKIP_CHAT_REDIRECT=1 claude -p "<검증 프롬프트>"
```

PowerShell에서는 원래 값을 보존하고 끝나면 복구한다.

```powershell
$previousChatRedirect = $env:ORCA_SKIP_CHAT_REDIRECT
try {
    $env:ORCA_SKIP_CHAT_REDIRECT = '1'
    claude -p '<검증 프롬프트>'
} finally {
    $env:ORCA_SKIP_CHAT_REDIRECT = $previousChatRedirect
}
```

`orca agent launch --agent claude --surface terminal`은 Orca 데몬이 새 프로세스를 띄우므로 호출자 환경·조상이 그대로 전달되지 않는다.
이 CLI에는 임의 환경 변수를 지정하는 launch 옵션이 없어, **호출자에게만 skip을 붙인 launch를 확실한 제외 방법으로 쓰지 않는다.**
대화형 검증에 skip이 필요하면 빈 Orca PowerShell 터미널을 만들고, 그 터미널 안에서
`$env:ORCA_SKIP_CHAT_REDIRECT='1'`을 설정한 다음 `claude`를 실행한다.
이 방식으로 만든 시험 탭은 검증 후 닫는다. 자동 생성된 채팅도 시험 탭인지 확인하고 정리한다.
상세 조건·표시 위치·한계는 [세션 환경 런북](session-environment.md#orca-터미널-claude-cli--채팅-안내)을 참고한다.

### 인계문 필수 정보

1. **프로젝트 절대경로** — Codex 터미널의 cwd가 워크스페이스 루트일 수 있다. 브리프 경로도 절대경로로.
2. **소유 파일 경계** — "이 파일은 내가 소유 중이니 건드리지 마라"를 명시. 안 적으면 동시 수정으로 충돌한다.
3. **커밋 금지 목록** — 프로젝트마다 "더티로 뜨지만 커밋하면 안 되는 것"이 있다.
4. **이미 측정한 값** — "다시 재지 마라"를 적어야 같은 측정을 반복하지 않는다.
5. **제외 대상인 기존 결함** — 안 적으면 그걸 실패로 세어 판정이 흐려진다.
   (적어도 놓칠 수 있다 — 2026-09-10에 EventSystem 중복을 제외 대상으로 적었는데도 "항목 8 실패"로 왔다)
6. **QA 절차서 경로** — Play Mode QA를 맡길 때는 `runbook/codex-qa-full.md`(전체 플레이) 또는 `runbook/codex-qa-quick.md`(고친 것 재확인)를 브리프에 넣고, 확인할 시나리오와 통과 기준을 함께 적는다. (2026-11-13: QA 서브에이전트를 Codex 절차서로 전환)

### ★ 완료 반환 경로를 **인계문에 직접 쓴다**

`CODEX.md` §5와 `AGENT.MD`에 원래 지휘자에게 직접 반환하는 규칙이 있다. 신규 Orca 작업자는 **프리앰블의 Task·Dispatch ID로 `worker_done`을 보내도록** 브리프에 명시한다. 사용자가 지정한 기존 탭에는 아래 별도 반환문을 쓴다.

**문서에 있다는 것만으로는 안 지켜진다** — 2026-09-12에 Codex가 Orca Git 마무리를
끝낸 뒤 사용자에게만 답하고 이 절차를 건너뛰었다(사용자가 지적한 뒤에야 전송).

그래서 **인계문 끝에 한 줄을 직접 넣는다.** 눈앞에 있는 지시가 문서보다 강하다.

> Orca 작업자는 작업이 끝나면 프리앰블의 Task·Dispatch ID로 `worker_done`을 정확히 한 번 보내고 성공 영수증을 확인해 주세요. 보고서는 UTF-8 md 파일로 저장하고 `--report-path`로 알려 주세요.

사용자가 지정한 기존 탭 경로에만 다음 문장을 쓴다.

> 작업이 끝나면 지정한 원래 Claude 세션으로 아래 별도 반환 절차에 따라 결과를 직접 보내 주세요. `terminal send`를 쓰는 경우 `accepted: true`도 확인해 주세요.

**왜 이게 중요한가** — 돌려주지 않으면 세션이 결과를 모른 채 다음 작업을 시작한다.
사용자가 중간에서 복사해 옮기게 되고, 그러면 인계가 사람 손을 거치는 구조가 된다.

(Codex는 그 원인을 "런북을 안 읽어서"로 자기 진단했는데 **부정확하다** — 이 런북에는 원래 그 절차가
없었다. 규칙은 `CODEX.md`·`AGENT.MD`에 있었고 그걸 안 지킨 것이다. 그 사실을 알아야 다음에 엉뚱한
곳을 고치지 않는다)

## 계수 검증 보충

- 좌표·개수 같은 수치는 **원본에서 직접 다시 센다**

다만 **반대 방향도 있다** — 2026-09-10에 Codex 보고가 맞고 **내 검사 스크립트가 틀린** 적이 있다.
[verification-scripts.md](verification-scripts.md) 참고.

## 토큰이 떨어질 수 있다

작업 도중 사용량 한도에 걸리면 **미커밋 상태로 멈춘다.** 2026-09-10에 씬 재배치가
거의 끝난 채 커밋 없이 중단됐다.

→ **긴 작업을 넘기기 전에 남은 한도를 확인**하거나, **중간 커밋을 지시**한다.
→ 멈췄으면 워킹트리 상태부터 확인한다. 되돌리지 말고 이어받을 수 있는지 먼저 본다.


### Codex 작업 완료 후 원래 Claude Code 세션으로 직접 반환

Claude Code가 Codex에 넘긴 작업은 Codex의 사용자 보고만으로 끝내지 않는다. 작업 완료 후 **인계한 원래 Claude Code 세션에 결과를 직접 전송**해야 한다.

**Orca 작업자는 `worker_done`으로 반환한다.** 프리앰블의 `--from`·Task·Dispatch ID와 실제 성공·실패를 사용하고 `--report-path`로 UTF-8 보고서를 전달한다. 성공 영수증을 확인하면 그 작업은 끝이며, 같은 결과를 `terminal send`로 중복 전송하지 않는다. 전송 실패 시 CLI가 제시한 복구 절차만 따른다.

**아래 1~4단계는 사용자가 기존 탭을 지정했고 orchestration Dispatch가 없는 경우에만 적용한다.** 지휘자의 명시된 수신 세션으로 `orca orchestration send --to <handle 또는 orca_session_id:...>`를 우선 사용한다. `terminal send`는 사용자가 기존 수신 탭을 지정한 경우에만 사용하며, 다른 탭을 임의로 고르지 않는다.

1. `orca worktree ps --json`과 `orca terminal list --json`으로 같은 워크트리의 기존 Claude 터미널을 찾는다.
2. 프롬프트·최근 출력·터미널 identity를 대조해 인계한 세션을 특정한다. 애매하면 임의 전송하지 말고 사용자에게 확인한다.
3. `orca terminal send --terminal <handle> --text "<인계 요약>" --enter --json`으로 결과를 직접 보낸다.
4. `terminal send` 응답의 `accepted: true`를 확인한다. 실패하면 CLI가 안내한 복구를 따르고, 임의로 새 요청을 재전송하지 않는다. 전달이 불가능하면 사용자에게 그 사실과 복사용 인계문을 보고한다.

인계 요약에는 결과, 변경 파일 또는 커밋 해시, 검증 상태, 남은 위험과 다음 작업을 넣는다. **사용자에게 인계문만 보여주고 복사해 달라고 하거나, 새 Claude 프로세스를 띄우는 것은 직접 반환이 아니다.** 원래 세션이 이미 종료됐거나 찾을 수 없을 때만 사용자에게 대체 전달 방법을 요청한다.

**금지**
- `--dangerously-bypass-approvals-and-sandbox`로 호출하지 않는다. 승인이 필요하면 `--approve-for-me`를 쓴다.
- Git 마무리(stage·commit·merge·push)는 지휘자가 배정한 Codex Orca 작업자가 맡는다. `codex exec`로 대신하지 않는다. 별도 프로세스에 중복 배정하면 같은 저장소를 두 주체가 동시에 건드리게 된다. 소유권·검증·삭제 조건은 `CODEX.md` 「Git 마무리 전담」을 유지한다.
  - `.claude/hooks/codex-exec-git-guard.js`의 PreToolUse 훅(`Bash|PowerShell`)으로 명령 인수·stdin 브리프 파일의 Git 마무리 위임을 차단한다. 근거: 2026-11-06 재발 3회로 문서 규칙을 훅으로 승격했다.
  - stdin 브리프 파일을 읽을 수 없어도 차단한다. 브리프를 먼저 만든 뒤 별도 명령으로 실행한다(2026-11-06: 한 명령에서 파일 생성 후 위임하면 훅 시점에 파일이 없어 검사를 빠져나간 사례 보완).
  - 한계: 셸 전체 문법·동적 변수/래퍼·복잡한 중첩 치환은 완전 해석하지 않으므로 누락·오탐 가능성이 있다.

> **Claude Code 자신도 Git 마무리를 하지 않는다.** `CODEX.md`의 전담 조항 그대로다. 사용자가 특정 건에 대해 "네가 처리해라"라고 하면 **그 건에 한해** 수행하고, 다음 작업부터는 다시 인계로 돌아간다 — 한 번의 허락을 상시 권한으로 확대하지 않는다. (근거: 2026-08-30, 한 건에 받은 허락을 세션 내내 이어가 8회 커밋한 사례)
- 사용자 계정의 토큰이 소모되므로, 가벼운 조회가 아니면 호출 전에 알린다.

트레이드오프: 위치를 이미 아는 **작은 편집은 왕복이 늘어난다.** 구현자의 맥락이 Codex엔 없어 브리프에 전부 실어야 하고 사용자 토큰도 쓴다. 그래도 조작과 검증을 한쪽에 모으는 이점이 더 크다는 판단이다.
