# Runbook — Codex 인계

마지막 적용: 2026-09-10

## 되는 것

### Unity 조작까지 위임된다 — `--approve-for-me`

```
codex exec --approve-for-me --color never -C "<프로젝트 루트>" -o "<보고서>" - < "<브리프 파일>"
```

`refresh_unity` 호출에서 `PermissionRequest` 훅이 자동 심사로 통과한다. Play Mode 진입·조작·종료까지 완주한다.

> **2026-09-09에 "읽기만 된다"고 결론 냈던 것은 틀렸다.**
> 그때 본 `MCP tool call requires approval, but approval policy is never`는
> **`--approve-for-me`를 안 붙여서** 난 것이었다. 옵션 하나를 몰라 하루를 돌아갔다.
> → **도구가 막혔다고 결론 내기 전에 `--help`를 끝까지 읽는다.**

⚠️ 이 옵션은 **workspace-write 샌드박스**를 쓴다. 프롬프트에 반드시 명시할 것:
**"프로젝트 파일 수정 금지, 산출물은 `Temp/` 아래에만"**

### 실행 중인 Codex 세션에 직접 인계 — `orca terminal`

`codex exec`는 새 프로세스라 대화가 안 이어진다. 살아 있는 세션에 넣으려면:

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

## 안 되는 것 (Windows)

| 시도 | 결과 |
|---|---|
| `codex app-server daemon` | `only supported on Unix platforms` |
| `codex agents` (세션 브라우징 TUI) | 위 데몬에 붙는 기능이라 **불가** |
| `codex exec resume` | `~/.codex/sessions/`에 **rollout이 안 남는다**(session id는 찍히는데 파일이 없다) |
| 대화형 TUI를 Claude가 띄우기 | 비대화형 셸이라 불가. 사용자가 `! codex`로 직접 여는 건 가능 |

→ **QA 한 건 = `codex exec` 한 번.** 맥락은 매번 **브리프 파일**로 싣는다.

## 인계할 때 꼭 넣을 것

1. **프로젝트 절대경로** — Codex 터미널의 cwd가 워크스페이스 루트일 수 있다. 브리프 경로도 절대경로로.
2. **소유 파일 경계** — "이 파일은 내가 소유 중이니 건드리지 마라"를 명시. 안 적으면 동시 수정으로 충돌한다.
3. **커밋 금지 목록** — 프로젝트마다 "더티로 뜨지만 커밋하면 안 되는 것"이 있다.
4. **이미 측정한 값** — "다시 재지 마라"를 적어야 같은 측정을 반복하지 않는다.
5. **제외 대상인 기존 결함** — 안 적으면 그걸 실패로 세어 판정이 흐려진다.
   (적어도 놓칠 수 있다 — 2026-09-10에 EventSystem 중복을 제외 대상으로 적었는데도 "항목 8 실패"로 왔다)

## 받은 결과는 재확인한다

Codex 출력도 「검증은 프로덕션 경로를 타야 한다」의 적용 대상이다.

- 긴 문서·코드의 **앞뒤 모순 찾기**엔 잘 맞는다
- **단순 계수는 틀린 적이 있다** — 줄 수를 158로 답했는데 실제 223이었다
- 좌표·개수 같은 수치는 **원본에서 직접 다시 센다**

다만 **반대 방향도 있다** — 2026-09-10에 Codex 보고가 맞고 **내 검사 스크립트가 틀린** 적이 있다.
[verification-scripts.md](verification-scripts.md) 참고.

## 토큰이 떨어질 수 있다

작업 도중 사용량 한도에 걸리면 **미커밋 상태로 멈춘다.** 2026-09-10에 씬 재배치가
거의 끝난 채 커밋 없이 중단됐다.

→ **긴 작업을 넘기기 전에 남은 한도를 확인**하거나, **중간 커밋을 지시**한다.
→ 멈췄으면 워킹트리 상태부터 확인한다. 되돌리지 말고 이어받을 수 있는지 먼저 본다.

## 사용자에게 반드시 요약한다

보고서 파일 경로만 남기고 넘어가지 않는다 — 사용자는 그 파일을 열어보지 않는다.
①무엇을 지적했나 ②내가 사실 확인한 것과 못 한 것 ③채택/미채택과 이유. 길면 표로.
