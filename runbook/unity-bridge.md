# Runbook — Unity MCP 브릿지

마지막 적용: 2026-09-13 (컴파일 확인을 브릿지 없이 통과, 새 Codex 세션을 CLI로 직접 띄움)

## 브릿지는 세션이 열릴 때 한 번만 붙는다

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

### ★ 놓쳤으면 새 세션을 직접 띄운다 — 사용자를 기다리지 않는다

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

## ★ 브릿지 없이 컴파일을 확인하는 법

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
Play Mode 검증은 브릿지가 붙은 세션에 따로 인계한다 — 인계 절차는 `codex-handoff.md`.
