# Unity 프로젝트 런처

**목적:** Unity Hub를 띄우지 않고, Hub에 등록된 프로젝트 목록에서 골라 **버전에 맞는 에디터로 바로 실행**한다.
**작성일:** 2026-08-20
**관련 문서:** `ParallelWorkContract.MD` (병렬 작업 원칙 · Orca/Unity CLI 조사 결과), `README.md` (전체 사용법)

> 이 문서만 있으면 다른 PC에서도 그대로 재현할 수 있다. 스크립트 전문이 아래 4절에 있다.

---

## 1. 무엇을 하는가

```
런처 실행 → Hub 등록 프로젝트 목록 표시 → 번호 선택
         → 해당 프로젝트 버전의 Unity.exe -projectPath 로 실행
         → (에디터 로드 후) MCP for Unity 자동 연결
```

**Unity Hub는 실행하지 않아도 된다.** 목록은 Hub 프로세스가 아니라 JSON 파일에 있고, 실행도 `Unity.exe`를 직접 호출한다. Hub GUI를 띄우는 단계는 하는 일이 없어서 뺐다.

**git과 무관하다.** Hub에 등록된 프로젝트를 전부 보여준다. (Orca 워크트리를 쓰려면 git이 필요하지만, 그건 이 런처의 범위가 아니다.)

---

## 2. 전제 — 이 두 경로가 핵심

### 프로젝트 목록

```
%APPDATA%\UnityHub\projects-v1.json
```

구조 (`data` 아래에 경로를 키로 하는 객체):

```json
{
  "data": {
    "C:\\Unity\\MyProject": {
      "title": "MyProject",
      "path": "C:\\Unity\\MyProject",
      "version": "6000.3.7f1",
      "lastModified": 1773805431691,
      "architecture": "x86_64",
      "changeset": "82314a941f2d",
      "isFavorite": false
    }
  }
}
```
(경로/이름은 예시일 뿐 — PC마다 실제 등록된 프로젝트로 채워진다)

쓰는 필드는 4개뿐: `title`(표시) / `path`(실행 인자) / `version`(에디터 선택) / `lastModified`(정렬).

> `data` 래퍼가 없는 형식도 있을 수 있어, 스크립트는 `data` 속성이 있으면 그 아래를, 없으면 최상위를 순회한다.

### 에디터 경로 규칙

```
C:\Program Files\Unity\Hub\Editor\<version>\Editor\Unity.exe
```

`version`을 그대로 끼워 넣으면 된다. 여러 버전이 섞여 있어도(예: `2021.3.38f1`, `6000.0.38f1`, `6000.3.7f1`, `6000.3.16f1`) 프로젝트별로 알아서 맞춰 실행된다.

### 실행 명령

```
Unity.exe -projectPath "<프로젝트 경로>"
```

---

## 3. 설치 절차

1. `UnityLauncher.ps1` 과 `UnityLauncher.cmd` 를 같은 폴더에 둔다 (4절 소스)
2. **`.ps1`을 UTF-8 **with BOM**으로 저장한다** ← 아래 주의사항
3. `UnityLauncher.cmd` 더블클릭

### ⚠️ 인코딩 주의 — 한글이 깨지는 원인

Windows PowerShell 5.1은 **BOM 없는 UTF-8 파일을 시스템 ANSI 코드페이지로 읽는다.** 한글이 든 `.ps1`을 BOM 없이 저장하면 출력이 전부 깨진다.

BOM을 붙이는 방법:

```powershell
$p = "<경로>\UnityLauncher.ps1"
$text = [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
[IO.File]::WriteAllText($p, $text, (New-Object Text.UTF8Encoding($true)))
```

확인 — 앞 3바이트가 `239,187,191` 이면 정상:

```powershell
[IO.File]::ReadAllBytes($p)[0..2] -join ','
```

---

## 4. 스크립트 — 실제 파일이 정본

| 파일 | 역할 |
|---|---|
| `UnityLauncher.cmd` | `UnityLauncher.ps1`을 `-NoProfile -ExecutionPolicy Bypass`로 실행하는 진입점 |
| `UnityLauncher.ps1` | Hub의 `projects-v1.json`을 읽어 목록을 띄우고, 프로젝트에 기록된 버전의 에디터로 실행 |
| `OpenUnityProject.ps1` | 경로를 인자로 받아 곧장 실행(이미 그 프로젝트가 떠 있으면 건너뜀) |

**전문을 이 문서에 옮겨 적지 않는다.** 예전에는 여기에 두 스크립트를 통째로 복사해 뒀는데, 코드가 바뀔 때마다 손으로 맞춰야 하고 어긋나면 어느 쪽이 맞는지 알 수 없다. 읽을 일이 있으면 저장소 루트의 실제 파일을 연다.

## 5. 동작 확인 결과

> ⚠️ **이 절의 프로젝트 이름·개수·경로는 검증에 쓰인 노트북 한 대의 스냅샷일 뿐이다.** 스크립트 자체(§4)는 어느 PC의 `projects-v1.json`이든 그 자리에서 동적으로 읽으므로 이 예시를 그대로 따라 할 필요가 없다 — "이렇게 동작한다"는 증거로만 볼 것. 다른 PC(등록된 프로젝트 구성이 다른)에서 그대로 실행해도 스크립트는 동일하게 동작해야 한다.

**2026-08-21, 이 노트북에서의 재실행 로그(Hub 등록 4개, 전부 C: 드라이브):**
```
  Unity 프로젝트 선택
  ---------------------------------------------------------------------
   1. 2026-08-19  6000.3.16f1   HouseRulez
   2. 2026-08-15  6000.3.7f1    GeometryDefender
   3. 2026-08-15  6000.3.16f1   Client
   4. 2026-06-17  6000.3.7f1    ProjectM_U6
  ---------------------------------------------------------------------
  번호 입력 (그냥 엔터면 취소)
```
- 최근 수정순 정렬 ✅
- **`Start-Process`로 실제 Unity 실행 확인 완료** — 번호 입력 → 해당 프로젝트로 `Unity.exe` 프로세스 기동까지 실측(`Get-Process` PID 확인).
- stdin 없는 환경(빈 입력)에서 "취소했습니다"로 정상 종료 확인.

**2026-08-20 최초 검증 시점(Hub 등록 15개였을 때)의 샘플 — 아래 두 항목은 그때만 재현 가능했던 케이스라 참고용으로 남겨둠:**
```
  14. 2026-03-18  6000.0.38f1   TombRaiderKing  (D:\ㄴ\던라이크)
  15. 2026-03-18  6000.0.38f1   TombRaiderKing  (D:\BackUp)
```
- 같은 이름 중복 시 상위 폴더로 구분 ✅ (15개 등록 시점에 확인, 지금 4개 상태론 재현 불가)
- 폴더 없음 / 에디터 미설치는 표시 + 실행 차단 ✅ (마찬가지로 15개 등록 시점에 확인)
- 여러 Unity 버전 혼재 상태에서 버전별 매칭 ✅ (지금도 6000.3.7f1/6000.3.16f1 두 버전으로 재확인됨)

**목록은 실행 시점마다 새로 읽으므로**, Hub 등록 프로젝트 수는 15개→4개로 이미 한 번 바뀌었다 — 이 문서의 "몇 개"라는 숫자는 항상 스냅샷일 뿐이니 실제 동작 여부와 혼동하지 말 것.

---

## 6. 마지막 조각 — MCP 자동 연결

런처는 Unity를 띄우는 데까지다. MCP 연결은 **MCP for Unity 패키지의 설정**이 담당한다.

> **MCP for Unity 창 → Advanced → `Auto-Start Server on Editor Load` 체크**

관련 사실:

- 이 설정의 EditorPrefs 키는 `MCPForUnity.AutoStartOnLoad`, **기본값 `false`** (안 켜면 매번 수동 연결) — **2026-08-21 전역으로 `true`로 켜둠, 레지스트리 실측 확인 완료.** 스크립트로 자동 세팅하려던 시도가 Hot Reload 때문에 실패한 사례는 8절 참고.
- 구현은 `HttpAutoStartHandler` (`[InitializeOnLoad]`) — 도메인 리로드마다 pref를 다시 읽으므로, 켜면 다음 리로드부터 적용된다
- **EditorPrefs 저장소는 `HKCU\Software\Unity Technologies\Unity Editor 5.x` 하나뿐** → **한 번만 켜면 모든 Unity 버전·모든 프로젝트에 적용된다**
- 서버는 `uvx`로 뜬다. **`uv`가 PATH에 없으면 조용히 실패**한다 → Advanced Settings의 `UvxPath` 오버라이드에 절대경로를 넣어 해결
- 배치모드(`-batchmode`)에서는 환경변수 **`UNITY_MCP_ALLOW_BATCH=1`** 이 없으면 자동시작을 아예 건너뛴다
- CI/헤드리스용 진입점도 있다:
  ```
  Unity.exe -projectPath <path> -executeMethod MCPForUnity.Editor.McpCiBoot.StartStdioForCi
  ```

---

## 7. Orca 기본 작동 시퀀스로 묶기

목표 흐름:

```
[바로가기 클릭]
  → Unity 프로젝트 선택 → 해당 버전 에디터 실행 → MCP 자동 연결
  → Orca 실행
```

### ⚠️ Orca에는 "앱 시작 훅"이 없다 (확인됨)

| 후보 | 결과 |
|---|---|
| `hookSettings.scripts` | `setup`(워크트리 생성 시) / `archive` 둘뿐 |
| `automations --trigger` | `preset` / `cron` / `rrule` — **전부 스케줄 기반**, 이벤트 트리거 없음 |
| Orca `Preferences` | 시작 관련 항목 없음 |

→ **Orca를 실행하는 지점을 래퍼로 감싸는 것이 유일한 방법이다.** 바로가기 대상을 `Orca.exe`가 아니라 아래 `.cmd`로 바꾼다.

### `OrcaStart.cmd`

```bat
@echo off
chcp 65001 >nul
title Orca 시작 시퀀스

rem Orca 기본 작동 시퀀스
rem   1. Unity 프로젝트 선택 -> 해당 버전 에디터로 실행 (MCP 자동 연결)
rem   2. Orca 실행
rem Orca 자체에는 앱 시작 훅이 없으므로, 이 래퍼가 그 역할을 한다.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0UnityLauncher.ps1"

echo.
echo   Orca 실행 중...

start "" "%LOCALAPPDATA%\Programs\orca\Orca.exe"

timeout /t 2 >nul
exit /b 0
```

### 적용 방법

1. `OrcaStart.cmd`를 `UnityLauncher.ps1`과 **같은 폴더**에 둔다 (`%~dp0`로 상대 참조)
2. 기존 Orca 바로가기의 대상을 `OrcaStart.cmd`로 바꾸거나, 이 `.cmd`의 바로가기를 새로 만들어 작업표시줄에 고정한다
3. Orca 실행 파일 경로: `%LOCALAPPDATA%\Programs\orca\Orca.exe`

### 설계 메모

- **Unity를 먼저, Orca를 나중에.** Unity는 로딩이 길어서 `start`로 띄워두고 바로 Orca를 실행하면 둘이 병렬로 뜬다.
- **프로젝트 선택을 취소해도 Orca는 뜬다.** 런처가 `exit 0`으로 끝나고 `.cmd`가 그다음 줄을 계속 실행한다. Unity 없이 Orca만 쓰고 싶을 때 그냥 엔터를 치면 된다.
- **Orca가 이미 떠 있으면** Electron 단일 인스턴스 동작으로 기존 창이 포커스된다(중복 실행 아님).

---

## 8. 알려진 제약 / 나중에 붙일 것

- **선택한 프로젝트가 Orca에 자동 등록되지는 않는다.** `orca repo add`는 git 저장소만 받으므로 지금은 범위 밖으로 뒀다. 필요해지면 런처 뒤에 한 줄 붙이면 된다.
- **여러 프로젝트 동시 실행 시 MCP 포트 충돌 가능성.** 클라이언트 설정의 URL이 고정값(`http://127.0.0.1:8080/mcp`)이라, 두 번째 프로젝트가 다른 포트로 뜨면 클라이언트가 못 찾는다. 멀티 인스턴스 지원 여부는 `mcpforunity://instances` 리소스로 확인 필요(미검증).
- 목록은 **실행 시점에 매번 새로 읽으므로** Hub에서 프로젝트를 추가/삭제해도 자동 반영된다.
- **`AutoStartOnLoad`를 스크립트로 자동 세팅하려는 시도는 Hot Reload가 켜진 프로젝트에서 조용히 실패한다(2026-08-21 확인).** `[InitializeOnLoad]` 정적 생성자로 `EditorPrefs.SetBool("MCPForUnity.AutoStartOnLoad", true)`를 실행시키는 임시 스크립트를 `Assets/Editor/`에 넣고 에디터 포커스를 강제로 줘서 컴파일까지는 성공시켰으나(로그에 `new=1, changed=1` 확인), Unity 6의 **Hot Reload**(`Scripting: domain reloads=0 ... Hotreload: 14.966ms`)가 켜져 있으면 **완전한 도메인 리로드 자체가 스킵**되어 새로 추가된 타입의 `[InitializeOnLoad]` cctor가 전혀 실행되지 않는다 — 컴파일 에러도 없고 어떤 로그도 안 남아서 겉보기엔 "성공"처럼 보이지만 레지스트리엔 반영되지 않는다(재확인 완료, 키 자체가 안 생김).
  - **대응**: 이 값은 한 번만 켜면 전역(레지스트리 공유) 적용되므로, 자동화보다 **`MCP for Unity 창 → Advanced → Auto-Start Server on Editor Load`를 수동으로 한 번 켜는 쪽이 안전하고 확실**하다. 정말 자동화가 필요하면 Play 모드 진입/종료나 스크립팅 정의 심볼 변경처럼 강제 도메인 리로드를 유발하는 조치가 필요한데, 이는 현재 작업 중인 씬 상태에 영향을 줄 수 있어 사용자 동의 없이는 시도하지 않는다.
