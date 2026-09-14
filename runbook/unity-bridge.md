# Runbook — Unity 에디터에 붙는 두 가지 통로

마지막 적용: 2026-09-14 (Unity CLI Pipeline 통로를 확인 — MCP를 놓친 세션에서도 에디터가 조작된다)

에디터에 붙는 길은 **두 개고 서로 독립이다.** 아래 첫 절이 우선이다.

| | Unity MCP (8080) | **Unity CLI Pipeline (7801~)** |
|---|---|---|
| 붙는 시점 | 세션이 열릴 때 **한 번** | **매 호출마다 새로** |
| 놓치면 | 그 세션은 끝까지 못 쓴다 | 놓칠 것이 없다 |
| 부르는 법 | `mcp__unityMCP__*` 도구 | `unity command <이름>` (셸) |

**MCP가 ConnectionRefused여도 CLI는 붙는다.** 2026-09-14에 같은 세션에서
`unity command verify-compile --project-path <원본:HouseRulez>`가 성공하는 것으로 실측했다.

## 조작 경로 우선순위

1. `LocalPaths.json`에서 대상 프로젝트의 절대경로를 읽고, **`--project-path`를 붙인 Unity CLI**를 먼저 쓴다.
2. 필요한 기능이 현재 노출된 CLI 명령에 없을 때만 **Unity MCP**를 쓴다.
3. 두 통로가 모두 없을 때만 다른 세션이나 사람에게 **수동 인계**한다.

이 순서는 접근 통로만 정한다. 실행자 선택과 구현자·검증자 분리는 `AGENT.MD`, Codex의 책임은
`CODEX.md`가 정본이다.

## ★ Unity CLI — 세션 수명과 무관한 통로

`unity` CLI(`1.0.0-beta.9` 실측)가 프로젝트의 `com.unity.pipeline` 패키지를 통해
**돌고 있는 에디터를 직접 조작한다.** 144개 명령이 노출된다.

```bash
# 연결 확인은 status 가 아니라 무해한 command 로 한다 (아래 이유)
unity command verify-compile --project-path "D:/Unity/.../Project" --json --no-banner
unity command --project-path "..." --json --no-pager     # 노출 명령 목록
```

### ★ `--project-path`를 항상 붙인다 — 워크스페이스 루트에서는 필수다

**안 붙이면 셸의 cwd가 속한 프로젝트**를 고른다. 워크스페이스 루트(`D:\Orca`)는 Unity
프로젝트가 아니므로 **아무것도 못 찾고 실패한다.** 2026-09-14 실측:

| 호출 | cwd | 결과 |
|---|---|---|
| `unity command verify-compile --project-path <경로>` | 어디든 | **성공** |
| `unity command verify-compile` | `D:\Orca` | 실패 (`No Unity Editor instances found`) |
| `unity status` | 프로젝트 안 | 성공 |
| `unity status` | `D:\Orca` | 실패 (`STATUS_NO_INSTANCES`) |
| `unity status --project-path <경로>` | `D:\Orca` | **실패 — status 는 이 옵션을 안 받는다** |
| `UNITY_PROJECT_PATH=<경로> unity status` | `D:\Orca` | **실패 — 스킬 문서의 "honored by status"와 다르다** |

**그래서 `unity status`를 연결 판정에 쓰지 않는다.** 대상을 지정할 방법이 없어
워크스페이스 세션에서는 늘 실패한다. 판정은 **무해한 command 를 `--project-path`로
실제 실행해** 성공하는지로 한다(`verify-compile`이나 `editor_status`).
대상 절대경로는 `LocalPaths.json`에서 읽는다.

에디터가 둘 이상일 때 엉뚱한 쪽을 조작하는 것도 같은 옵션으로 막힌다.

### 포트는 고정이 아니다

같은 에디터 프로세스(pid 36376)가 한 시간 안에 **7801 → 7802**로 바뀐 것을 봤다.
포트를 적어두고 재사용하지 않는다 — 매번 CLI가 찾게 둔다.

### ★ Unity CLI 는 orca 터미널에서 돌린다 — 사용자가 화면에서 본다

**에이전트의 자기 셸에서 돌리지 않는다.** 그러면 에디터를 무엇으로 어떻게 건드렸는지가
사용자 화면에 한 줄도 안 남는다. 에디터는 사용자와 공유하는 자원이므로 보이게 해야 한다.
(근거: 2026-09-14 사용자 지시. Codex 세션은 `orca terminal create`로 띄우면서
Unity CLI 는 Bash 로만 돌렸더니, 에디터에 무슨 일이 일어나는지 볼 길이 없었다)

세션당 터미널 **하나**를 만들어 재사용한다. 명령마다 새로 띄우지 않는다.

```bash
orca terminal create --worktree active --title "Unity CLI" --json
# 셸 터미널이라 TUI 가 없어 wait --for tui-idle 은 필요 없다
orca terminal send --terminal <handle> --enter --json --text 'unity command verify-compile --project-path "D:/Unity/.../Project" --json --no-banner'
orca terminal read --terminal <handle> --json      # 결과를 수거한다
```

**범위는 Unity CLI 까지다.** git, 빌드 스크립트, 파일 조회 같은 일반 명령은 Bash 로 돌려도 된다 —
에디터라는 공유 자원을 건드리는 것만 보이게 하면 된다.

주의할 것 둘 —

- **핸들은 매 전송 직전에 `orca terminal list`로 다시 확인한다.** 죽은 세션은 목록에서 빠진다
- **화면 tail 에는 입력 에코가 중복해 보인다.** 정상이다 — JSON 본문만 읽으면 된다

**비용**: 결과를 `read`로 긁어야 해서 Bash 직행보다 왕복이 한 번 늘고 파싱도 거칠다.
그래도 사용자가 진행을 볼 수 있는 쪽을 택한다.

### 이 프로젝트에서 특히 쓸 것

| 명령 | 무엇 |
|---|---|
| `verify-compile` | **아래 3단계 증거 절차를 대체한다.** 컴파일 중 아님 + 최신 컴파일 성공을 한 번에 |
| `verify-tables` | `Resources/Table` CSV 15개를 전부 Record 필드와 대조 — 헤더 오타를 구조로 막는다 |
| `recompile` | **포커스 없이·최소화 상태에서도 된다.** `.meta` 문제의 정공법 |
| `set_autotick` | 에디터가 포커스 없어도 계속 틱 — 백그라운드 Play Mode 검증의 전제 |
| `editor_play` / `editor_stop` | Play Mode 출입 |
| `eval` | Roslyn으로 임의 C# 실행 |
| `run_tests` / `list_tests` / `test_status` | UnityTestFramework를 CLI로 |
| `capture_game_view` / `get_console_logs` | 화면과 콘솔 |

`verify-compile`·`verify-tables`는 이 프로젝트가 만든 것이다 — `[CliCommand]` 속성으로
`Assets/Editor/Verification/ProjectVerificationCommands.cs:15` 에 선언돼 있다(커밋 `f0d0913`).
검증 절차를 문서가 아니라 **명령**으로 내리는 자리가 여기다.

### 전제와 함정

- 패키지 `com.unity.pipeline`이 **CLI 버전과 맞아야 한다.** 낮으면 `unity status`와 명령
  *목록*까지는 되는데 **실행만 거부**된다. 조회가 된다고 통했다고 읽지 않는다.
- **`unity pipeline upgrade`만으로는 안 통한다.** manifest는 바뀌지만 실행 중인 에디터는
  옛 어셈블리를 메모리에 들고 있다. 2026-09-14 실측: 업그레이드 뒤 창에 포커스를 줘도
  `packages-lock.json`이 사흘 전 그대로였다. **에디터 재시작이 유일한 길이다.**
- 재시작 직후엔 `503 Server Busy`가 온다(임포트·컴파일 중). 죽은 게 아니라 아직인 것이므로
  `until ... ; do sleep 10; done`으로 기다린다.
- 미저장 변경 판정: Unity는 창 제목에 `*`를 붙인다. 닫기 전에 `MainWindowTitle`을 읽으면
  날릴 것이 있는지 알 수 있다. 강제 종료(`Stop-Process`) 대신 `CloseMainWindow()`를 쓴다.

## Unity MCP — CLI에 필요한 기능이 없을 때

> 아래는 **MCP 통로에만** 해당한다. CLI는 이 제약을 받지 않으므로 위 절을 먼저 시도한다.

Unity가 꺼진 채로 Claude Code나 Codex 세션이 열리면 **그 세션은 끝까지 Play Mode를 못 쓴다.**
뒤늦게 에디터를 켜도 스스로 재연결하지 않는다. Claude·Codex 양쪽 동일하다.
2026-09-11~13에 이 순서 때문에 QA가 네 번 막혔다.

**Codex 쪽에서 실측으로 확인했다**(2026-09-13). 브릿지가 살아있는 동안, 그보다 먼저 열린 Codex
세션에 도구를 실제로 호출시켰더니 `mcp__unityMCP__manage_editor`가 **등록조차 안 되어 not callable**
이었다. 그 직전에 같은 세션이 "도구 목록에 없다"만 보고 판단해 자기 정정을 낸 적이 있어 실제 호출로
갈랐다 — **도구 목록이 아니라 호출로 판정한다.**

로그온 시 Unity를 미리 띄우는 장치가 있다 — `StartUnityOnLogon.ps1`,
시작 폴더의 `Orca-StartUnity.vbs`가 부른다.

### 지연을 길게 잡아도 소용없다 (2026-09-13 실측)

첫 실전에서 자동 실행은 **설계대로 정확히 작동했다.** 그런데도 세션은 브릿지를 놓쳤다.

| 시각 | 일 |
|---|---|
| 부팅 + 0초 | 부팅 |
| 부팅 + 약 60초 | 로그온 → vbs 실행 → `Start-Sleep 120` |
| 부팅 + 141초 | **사용자가 세션을 열었다** ← 여기서 이미 늦었다 |
| 부팅 + 181초 | Unity 프로세스 시작 |
| Unity + 2~4분 | 8080이 응답 시작 |

**병목은 지연이 아니라 Unity 자체의 로드 시간이다.** 지연을 0으로 해도 로그온 + 4분이다.
그래서 지연은 로그온 부하만 피할 만큼(30초)으로 줄였고, 실질 대책은 아래다.

### CLI에도 필요한 기능이 없고 MCP를 놓쳤으면 새 세션을 직접 띄운다

브릿지가 이미 살아있는 상태에서 만든 세션은 붙는다. `orca terminal create`가
**orca가 관리하는** 터미널을 만든다. `codex exec`로 별도 프로세스를 띄우는 것과 다르다 —
사용자가 금지한 쪽은 후자이고 이것은 orca 세션이므로 허용 범위다.
**2026-09-13 사용자 지시로 이것이 기본 절차가 됐다.**

```
orca terminal create --worktree active --title "Codex QA" --command "codex" --json
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 60000 --json
```

그 뒤 인계문을 보낸다(`codex-handoff.md`의 전송 절차 그대로).

`wait --for tui-idle`을 건너뛰면 Codex TUI가 아직 부팅 중이어서 입력이 흘러버린다.

**이 절 이전에는 "사용자가 Orca UI에서 새 세션을 열어줘야 한다"고 판단했다.**
네 번 막히는 동안 매번 사람을 기다렸는데, CLI로 직접 되는 일이었다.

### 브릿지 생존 판정 — HTTP 406이 정상이다

```powershell
try { Invoke-WebRequest -Uri http://127.0.0.1:8080/mcp -TimeoutSec 5 -ErrorAction Stop }
catch { if ($_.Exception.Response) { "HTTP $([int]$_.Exception.Response.StatusCode) — 살아있음" } }
```

**406은 브릿지가 살아있다는 뜻이다**(MCP가 `Accept` 헤더를 요구해 거절한 것).
살아있지 않으면 예외에 `Response` 자체가 없다. 상태 코드가 200이 아니라고 죽었다고 읽지 않는다.

## ★ 새 .cs 를 만들면 .meta 도 만들어야 한다 (Unity 가 백그라운드일 때)

**Unity 는 포커스를 받을 때 새 파일을 스캔해 `.meta` 를 만든다.** 백그라운드면 안 만든다.
`.meta` 가 없는 `.cs` 는 **AssetDatabase 에 들어가지 않고, 그래서 컴파일 입력에서도 빠진다.**

2026-09-14 에 `FieldLayout.cs` 를 만들고 다섯 파일에서 참조했더니 `CS0103 FieldLayout 없음` 이
났다. 파일은 디스크에 멀쩡히 있는데 Unity 가 그 타입을 모른다 — 리플렉션 조회도 `found=false`.

**증상으로 알아보는 법** — 방금 만든 타입만 "없다"고 하고 기존 타입은 멀쩡하면 이것이다.
문법 오류가 아니라 임포트 문제다.

### 직접 만든다

이 프로젝트의 `.cs.meta` 는 **최소 형식**이다(끝 개행 없음).

```
fileFormatVersion: 2
guid: <32자리 hex>
```

GUID 는 무작위 생성하되 **기존 것과 겹치지 않는지 확인한다** — `Assets` 아래 `.meta` 를 훑어
`guid: ([0-9a-f]{32})` 를 모으면 된다(이 프로젝트는 602개).

만든 뒤에도 **AssetDatabase refresh 가 필요하다.**
`unity command recompile` 이 포커스 없이도 이것을 한다 — 인계할 필요가 없다.
CLI를 못 쓰면 브릿지가 붙은 세션에 리임포트를 요청한다.

### 인계할 때 제약을 과하게 걸지 말 것

같은 날 QA 브리프에 "프로젝트 파일 수정 금지"라고만 적었더니, 검증 담당이 **리임포트도 못 하고
막혀서 멈췄다.** 그 판단은 옳았다 — 제약이 과했던 것이다.

Unity MCP 호출(리임포트·재컴파일)은 `AGENT.MD` 상 검증 담당의 소유 영역이다.
**"소스 편집 금지"와 "에디터 조작 금지"를 구분해 적는다.**

## 컴파일 확인 — CLI가 없을 때의 수동 절차

> **`unity command verify-compile` 한 줄이면 끝난다.** 아래는 CLI도 쓸 수 없을 때의 대비책이다.

MCP가 안 붙어도 **컴파일 성패는 판정할 수 있다.** 재컴파일을 시킬 수는 없지만,
에디터가 이미 돌린 결과는 파일로 남아 있다. 증거 세 개를 함께 본다 — 하나만으로는 부족하다.

1. **`Library/ScriptAssemblies/Assembly-CSharp.dll`의 수정 시각이 모든 소스보다 뒤인가**
   → 뒤라면 그 소스들을 포함해 빌드된 것이다. 앞이면 아직 안 돌았거나, 실패해서 옛 DLL이 남은 것이다.
2. **`%LOCALAPPDATA%\Unity\Editor\Editor.log`에 `error CS` + 숫자 패턴이 0건인가**
3. **DLL 바이너리에 새로 만든 타입 이름이 들어 있는가** — 메타데이터 문자열 힙에 남는다

```powershell
$bytes = [System.IO.File]::ReadAllBytes($dll)
$ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
$ascii.Contains('UnitBattleStat')   # 새 타입이 실제로 들어갔는가
```

2026-09-13에 이 셋으로 유닛 테이블 1단계(7개 파일에 걸친 `Atk`/`Hp` float 승격)의
컴파일을 확정했다. 그때까지 네 번 미뤄져 있던 항목이다.

### 로그 파일은 락이 걸려 있다

에디터가 켜져 있으면 `Get-Content`와 `[File]::ReadAllText`가 모두
`being used by another process`로 실패한다. 공유 모드로 열어야 한다.

```powershell
$fs = New-Object System.IO.FileStream($log, [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
```

**⚠️ 이 실패는 조용하다.** PowerShell이 예외를 찍은 뒤에도 뒤따르는
`$lines | Where-Object ...`가 그대로 돌아 **"error CS 0건"**을 출력한다.
읽기에 실패한 빈 문자열을 뒤져 0건이 나온 것을 컴파일 성공으로 읽을 뻔했다.
**먼저 줄 수를 찍어 확인한다** — 5,828줄이 정상이고 1줄이면 읽기가 실패한 것이다.

## 컴파일이 됐다는 것은 통과가 아니다

위 셋이 전부 초록이어도 확인된 것은 **"빌드된다"**까지다. CLAUDE.md의
「기본 브랜치에는 사람이 실제로 돌려보고 통과시킨 것만」이 그대로 적용된다.
Play Mode 검증은 구현하지 않은 쪽이 맡는다. 우선 `--project-path`를 붙인 Unity CLI로 수행하고,
필요한 기능이 CLI에 없을 때 MCP를 쓰며, 둘 다 불가능할 때만 `codex-handoff.md` 절차로 인계한다.
