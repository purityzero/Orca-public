# Orca + Unity CLI 준비 작업

**대상:** 신규 Unity 프로젝트 (프로젝트 시작 시점에 셋업하는 것을 전제)
**작성일:** 2026-08-20

> 조사 단계의 결론이며 실제 운영으로 검증된 절차는 아니다.
> Unity CLI / Pipeline은 **experimental**이라 명령 형식이 바뀔 수 있다.
> 아래 Orca CLI 명령·설정 구조는 실제 설치본에서 확인한 것이다.

---

## 0. 요약

1. **Orca 워크트리는 "Unity를 절대 열지 않는 텍스트 편집 샌드박스"로만 쓴다.**
2. **편집은 병렬, 검증은 원본 체크아웃에서 중앙집중 + 순차.**
3. **기계가 판정하는 성공 조건이 없으면 Orca를 켤 이유가 없다.** (에이전트의 *주장*만 비교하게 됨)

---

## 0-1. 진행 상태 (2026-08-20 기준)

> **새 세션에서 이어서 작업할 때 여기부터 읽을 것.**
> 관련 문서: `UnityLauncher.MD`, `병렬_작업분할계약.MD`
> 실행 파일(같은 폴더에 있어야 함 — `%~dp0` 상대 참조): `UnityLauncher.ps1` / `UnityLauncher.cmd` / `OrcaStart.cmd` (3개뿐 — `.MD` 문서는 상대 참조와 무관)

### 완료

- Orca 모델·CLI 구조 조사 (`orca` CLI 위치, repo/worktree/orchestration 명령군)
- Unity CLI / Pipeline 조사 (미설치 상태, 락과 무관함 확인)
- MCP for Unity 자동 연결 구조 파악 (`AutoStartOnLoad` pref, 배치모드 가드, CI 진입점, uvx 의존)
- Unity Hub 프로젝트 목록 읽기 확인 (`projects-v1.json`) — **2026-08-21 재확인 시점 4개**(GeometryDefender/Client/ProjectM_U6/HouseRulez, 전부 C: 드라이브). 15개였던 건 스테일 기록 — 목록은 실행 시점마다 새로 읽으므로 등록 상태에 따라 계속 바뀐다.
- 런처 스크립트 3종 작성 — 목록 출력·정렬·중복 구분 + **`Start-Process`로 Unity 실제 실행까지 2026-08-21 검증 완료**
- **`MCP for Unity → Auto-Start Server on Editor Load` 전역 활성화 완료(2026-08-21)** — 레지스트리 `MCPForUnity.AutoStartOnLoad = 1` 실측 확인. 콜드 부팅만으로 포트 8080 자동 오픈까지 확인(단, 이 값을 스크립트로 자동 세팅하려는 시도는 Hot Reload 때문에 실패할 수 있다는 함정을 발견 — `UnityLauncher.MD` §8 참고).
- **`OrcaStart.cmd` 체인 실행 검증 완료(2026-08-21)** — Unity 실행 → 프로세스 확인까지.
- Orca CLI PATH 등록 완료, `orca repo list` 확인 — `HouseRules`(git, `C:/Unity/HouseRules`)/`Orca`(folder, `C:\Orca`) 2건 등록됨. **GeometryDefender는 아직 미등록.**
- `C:\Orca\Unity\{GeometryDefender,HouseRulez}\.claude\` 사본 구조 신설, 마스터-사본 관계 정리 완료 — 상세는 [[project_unity_management]] 참고.
- 문서 2종 작성

### 미검증 (실행해봐야 아는 것)

- `unity` CLI가 실행 중인 에디터에 붙는지 (`unity doctor`) — CLI 자체가 미설치
- §5 (a)/(b) — MCP 브릿지 멀티 인스턴스 지원 여부. `mcpforunity://instances`를 이 세션에서 아직 못 읽음(이 세션엔 Unity MCP 도구가 안 붙어있음). 간접 증거는 (a) 쪽: 레지스트리에 `LocalHttpServer.LastPidFilePath`가 **프로젝트별 pid 파일**로 기록되는데 포트는 8080 고정 — 브로커 존재 흔적 없음. Unity 켠 상태에서 이 세션에 MCP 붙여서 한 번만 읽으면 닫을 수 있는 항목.
- Orca 바탕화면 바로가기 대상이 실제로 `OrcaStart.cmd`로 바뀌었는지 — 미확인.

### 다음 할 일 (순서대로)

1. `mcpforunity://instances` 읽어 **멀티 인스턴스 지원 여부 확정** → §5 (a)/(b) 결론 내기
2. Orca 바탕화면 바로가기 대상이 `OrcaStart.cmd`인지 확인, 아니면 교체
3. GeometryDefender를 `orca repo add`로 등록 (단, 등록 전에 §7-1 Git 기준점 체크리스트부터 — 2026-08-21에 PAT 노출/gitignore/detached HEAD 3건은 이미 해결함)
4. 신규 프로젝트 시작 시 → §7 Day-1 체크리스트

### 보류한 결정

- **git 저장소 관리 자체(Orca 워크트리 모델)는 지금 고려하지 않는다** (사용자 결정 — 복잡도 때문). Orca 워크트리를 실제로 쓸 때 다시 꺼낼 것.
  - 단, 이 결정과 별개로 **GeometryDefender 원본 저장소 자체의 위생 문제(PAT 노출/detached HEAD/부실한 gitignore)는 2026-08-21에 이미 발견·수정했다** — 이건 "Orca 워크트리를 쓸지"와 무관하게 그 프로젝트 자체의 git 상태 문제였다.
- 선택한 프로젝트를 `orca repo add`로 자동 등록하는 것도 범위 밖으로 뒀었으나, HouseRules/Orca는 이미 등록됨 확인(위 완료 항목 참고) — GeometryDefender만 남음.

---

## 1. Orca의 모델 — 분담이 아니라 경쟁

Orca는 "에이전트를 많이 켜면 빨라진다"는 도구가 **아니다.** 병렬 시도를 격리해 **비교 가능한 Git 변경으로 바꾸는** 도구다.

```
Git 저장소 + 기준 브랜치
  → 작업별 worktree · 브랜치
  → CLI 에이전트 실행
  → 테스트와 diff 비교
  → 채택할 변경만 commit · push
```

| 적합 | 부적합 |
|---|---|
| 같은 문제에 두 가지 해법 시도 (같은 테스트로 비교) | 순차 작업 (앞 단계가 바뀌면 뒤가 재작업) |
| 원인 가설이 갈리는 버그 | 여러 에이전트가 같은 설정·lockfile 줄 수정 |
| 시안 두 가지 구현 (화면으로 선택) | Git 미사용 일회성 작업 |

> **"A는 코드, B는 CSV, C는 문서" 식 작업 분담은 부적합 쪽이다.**
> 같은 문제 → 서로 다른 접근 → 하나 채택, 이 형태일 때만 값어치가 있다.

**보충:** Orca에는 `orchestration` 명령군(에이전트 간 메시징, blocking ask/reply, task dispatch, 감독 워커 start/stop)이 내장돼 있다. 즉 워크트리가 **완전히 고립된 것은 아니고** 코디네이터–워커 구조를 짤 수 있다. 다만 실제 동작은 미검증이므로, 처음에는 위의 단순 경쟁 모델로 시작한다.

---

## 2. Unity 프로젝트의 결정적 제약 3가지

### ① worktree 비용은 "Unity를 여느냐"에만 달려 있다

`Library/`는 gitignore 대상이므로 **worktree에 따라가지 않는다.**
→ `git worktree add`는 몇 초, 소스 크기만큼의 텍스트 폴더 하나가 생길 뿐이다.
→ **그 폴더에서 Unity를 여는 순간 수 GB~수십 GB 재임포트가 시작된다. 절대 열지 않는다.**

### ② Unity 에디터 + MCP 브릿지는 격리되지 않는 공유 자원

Orca 문서의 경고 *"worktree는 포트·자격증명·DB를 격리하지 않는다"* 에서
Unity 프로젝트가 정확히 해당하는 항목이 **에디터 인스턴스와 MCP 브릿지**다.
→ **Unity를 만지는 레인은 항상 하나만.** Play Mode QA·프리팹 편집은 병렬 불가.

### ③ 다른 레인이 `.cs`를 저장하면 에디터가 재컴파일된다

Play Mode 중 재컴파일은 UI 플러그인 계열에서 세션이 통째로 깨지는 원인이 된다.
→ **QA 레인이 도는 동안 코드 레인은 저장 금지.** (에디터 설정에서 `Stop Playing And Recompile`로 예방)

---

## 3. 함정 2가지 — 조용히 틀리는 종류

### 함정 A. 에이전트 설정 폴더가 gitignore돼 있으면 워크트리는 맨몸이 된다

`.claude/`(또는 동급의 에이전트 설정 폴더)를 gitignore하면, worktree에는 그게 **통째로 없다.**
거기서 뜬 에이전트가 잃는 것: 프로젝트 지침, 커스텀 서브에이전트 정의, 누적 작업 기록, 권한 설정.

**신규 프로젝트라면 시작 시점에 정책을 정할 것:**

| 방식 | 장점 | 단점 |
|---|---|---|
| **git 추적** (권장) | worktree가 자동으로 갖는다 | 기록 md가 커밋 로그에 섞인다 |
| **junction** | 저장소가 깨끗하다 | 워크트리마다 수동 1줄, 다시 공유 자원이 됨 |

junction 방식:
```cmd
mklink /J "<worktree경로>\.claude" "<원본경로>\.claude"
```
(Windows junction은 관리자 권한 불필요)

**junction을 택했다면 짝으로 필요한 규칙:**
> **워크트리 에이전트는 md 기록을 쓰지 않는다. 최종 보고만 한다.**
> 어차피 경쟁 실행이라 하나만 채택된다. 기록은 채택 후 원본에서 한 번만 남긴다.
> 여러 레인이 같은 기록 파일을 동시 편집하는 충돌도 이걸로 함께 막힌다.

### 함정 B. 워크트리 에이전트가 검증 명령을 부르면 *원본*을 검증한다

**가장 위험하다. 에러 없이 그럴듯한 초록불이 뜬다.**

Unity Pipeline이 제어하는 건 **실행 중인 에디터**이고, 그 에디터는 **원본 체크아웃**을 열고 있다.
worktree-A의 에이전트가 자기 폴더를 고친 뒤 검증 명령을 돌리면 —
**자기 변경이 아니라 원본을 검증하고 "통과"를 보고한다.**

자기 워크트리를 검증하려면 그 폴더로 에디터를 열어야 하고, 그건 함정 ①로 되돌아간다.

> **Unity CLI는 검증을 *스크립트로* 만들어주지 *병렬로* 만들어주지 않는다.**

**운영 형태:**
```
[워크트리 A] ─┐
[워크트리 B] ─┤  코드/데이터만 편집. Unity 안 엶. diff 생성    (병렬, 비용 ~0)
              │
              └→ [원본 체크아웃 + 실행 중인 Editor]            (순차, 공유 자원)
                   A 적용 → 검증 → 되돌림
                   B 적용 → 검증 → 되돌림
                   → 이긴 쪽만 채택 → Play Mode QA
```

검증 대기가 **실제로** 병목이 되면 그때 CI 사본(프로젝트 복제본 1개)을 추가해 컴파일/테스트만 떼어낸다.
병목인지 확인되기 전에 미리 만드는 건 과투자다.

---

## 4. Orca CLI — 프로젝트 등록과 선택

### 위치

Orca에는 CLI가 번들돼 있으나 **PATH에 자동 등록되지 않는다.**

```
%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe
```

**Settings → Experimental → CLI**에서 등록하면 `orca`로 바로 쓸 수 있다.

### 프로젝트는 "실행 시 선택"이 아니라 "등록 후 전환"이다

`orca open`은 프로젝트 인자를 받지 않는다(옵션이 `--json`뿐). **repo를 여러 개 등록해두고 사이드바에서 전환**하는 모델이다.

```bash
orca repo add --path "D:/Unity/NextProject"   # 등록 (GUI: 사이드바 Add Repo)
orca repo list                                 # 등록 목록
orca repo set-base-ref ...                     # worktree가 뻗어나갈 기준 브랜치
```

작업 단위인 worktree를 만들 때 `--repo`로 프로젝트를 고른다:

```bash
orca worktree create --repo name:NextProject --name task-a --agent claude --prompt "..."
```

셀렉터 형식: `name:`, `id:`, `path:` / worktree 쪽은 `branch:`, `path:`, `active` 등.

### `repo`와 `project`는 다른 개념

- **repo** — 로컬 파일시스템 경로 단위. 로컬만 쓸 거면 이것으로 충분
- **project** — durable, 원격 저장소 연결 단위 (`project setup-clone`, `project setup-existing-folder`)

### 주요 명령군

| 명령군 | 용도 |
|---|---|
| `repo` | 프로젝트 등록·조회·기준 ref |
| `worktree` | 생성·조회·삭제, `ps`로 전체 요약 |
| `terminal` | 워크트리 안 터미널 생성/입력/대기/종료 |
| `orchestration` | 에이전트 간 메시징, task dispatch, 워커 감독 |
| `automations` | 스케줄 자동화 |
| `skills list / get` | **번들된 공식 가이드** (`orca-cli`, `orchestration` 등) ← 막히면 여기부터 |

---

## 5. "프로젝트 선택 → Unity 자동 실행 → MCP 연결" 체인

목표 흐름:

```
Orca 실행 → 프로젝트 선택 → Unity 자동 실행 → 프로젝트 열림 → MCP 자동 연결
```

### 고리별 실현 가능성

| 고리 | 가능 | 수단 |
|---|---|---|
| 프로젝트 선택 | ✅ | `orca repo add` + 사이드바 |
| Unity 자동 실행 | ✅ | repo의 **setup 스크립트 훅** |
| 프로젝트 열림 | ✅ | `unity <projectPath>` 또는 `Unity.exe -projectPath` |
| **MCP 자동 연결** | ⚠️ | **고정 포트 문제 — 아래** |

### setup 훅은 실제로 존재한다

`orca repo show --repo name:<이름> --json`에서 확인되는 구조:

```json
"hookSettings": {
  "mode": "auto",
  "setupRunPolicy": "run-by-default",
  "setupAgentStartupPolicy": "start-immediately",
  "scripts": { "setup": "", "archive": "" }
}
```

`scripts.setup`이 비어 있고 정책은 이미 `run-by-default`다. 여기에 명령을 넣으면 자동 실행된다.
worktree 생성 시 `--setup run|skip|inherit`로 개별 제어 (기본 `inherit`).

### ⚠️ setup은 *워크트리 생성 시* 실행된다 — 반드시 가드할 것

"프로젝트를 열 때"가 아니라 **워크트리를 만들 때** 도는 훅이다.
여기에 Unity 실행을 그냥 걸면 **워크트리마다 Unity가 뜨고 Library가 N개 생긴다** — 제약 ①의 정확히 그 시나리오.

Orca에는 **"앱 시작" 훅도 "프로젝트 선택" 훅도 없다** (확인됨):

| 후보 | 결과 |
|---|---|
| `hookSettings.scripts` | `setup`(워크트리 생성 시) / `archive` 둘뿐 |
| `automations --trigger` | `preset` / `cron` / `rrule` — 전부 스케줄 기반, 이벤트 트리거 없음 |
| Orca `Preferences` | 시작 관련 항목 없음 |

→ 앱 시작 시점에 무언가를 실행하려면 **Orca를 실행하는 지점을 래퍼(`.cmd`)로 감싸는 것이 유일한 방법이다.** 구현은 `UnityLauncher.MD` 7절 참고.

→ setup 훅을 쓸 경우, 스크립트 안에서 직접 판별한다:

```bash
# 원본 체크아웃일 때만 Unity 실행, 워크트리면 즉시 종료
[ "$PWD" = "<원본 프로젝트 경로>" ] || exit 0
unity "$PWD"
```

### ⚠️ MCP 브릿지는 고정 포트를 쓴다

MCP for Unity의 클라이언트 설정 형태:

```json
"UnityMCP": { "type": "http", "url": "http://127.0.0.1:8080/mcp" }
```

**포트가 고정**이라는 건 Orca 문서의 *"각 worktree에 별도 포트 배정"* 경고에 정면으로 걸린다는 뜻이다.
→ **프로젝트를 2개 동시에 열면 포트를 두고 충돌한다.**

두 갈래 중 하나를 택해야 한다:

| | 방식 | 결과 |
|---|---|---|
| **(a)** | **한 번에 Unity 하나만.** 프로젝트 전환 시 이전 에디터를 닫고 새로 연다 | 단순·확실. **지금 바로 됨.** 프로젝트 간 병렬은 포기 |
| **(b)** | **MCP 서버가 멀티 인스턴스 브로커.** 서버 1개가 Unity N개를 중개, 에이전트가 인스턴스를 선택 | 목표 흐름이 그대로 성립. **미검증** |

**(b) 확인 방법:** MCP for Unity에는 `mcpforunity://instances` 리소스(복수형, `instance_count` 필드)가 있다.
브릿지를 켠 뒤 이 리소스를 읽어 **인스턴스 목록에 프로젝트 경로가 함께 나오는지** 보면 확정된다.
나온다면 (b), 단일 인스턴스만 잡힌다면 (a)로 간다.

### 이 체인은 메인 체크아웃 전용이다

**워크트리 에이전트는 이 체인을 타지 않는다.** 걔들은 텍스트만 고치고, Unity는 메인 체크아웃 것 하나만 산다.
제약 ①·②, 함정 B와 그대로 일치한다.

---

## 6. Unity CLI 요점

- **Unity CLI** — Hub 없이 터미널에서 Editor 설치·모듈·실행·인증
- **Unity Pipeline** — 이미 실행 중인 Editor/Player를 외부에서 제어

```
AI 에이전트 → MCP 서버 → Unity CLI → Unity Pipeline → Editor/Player
```

| 작업 | 명령 |
|---|---|
| 버전 설치 | `unity install <버전>` / `unity install lts` |
| 모듈 추가 | `unity install lts -m android ios webgl` |
| Pipeline 설치 | `unity pipeline install` |
| 진단 | `unity doctor` |
| 로그인 | `unity auth login` |

CI 친화: JSON/TSV 출력, `--accept-eula --yes`, 종료 코드 0(성공)/1(오류)/130(취소)

### 에디터 락과 무관하다

`Temp/UnityLockfile` 때문에 **batchmode(두 번째 에디터를 새로 띄우는 방식)** 는 에디터가 켜져 있으면 못 쓴다.
하지만 **Pipeline은 실행 중인 에디터를 제어**하므로 애초에 락과 경쟁하지 않는다. 사본 없이 검증 가능.

### MCP가 이미 있는데 왜 필요한가

기능은 크게 겹친다(`eval` ≈ MCP의 코드 실행). **겹치지 않는 것은 하나:**

> **Unity CLI는 셸에서 호출된다. MCP는 MCP 클라이언트가 붙은 에이전트만 쓸 수 있다.**

→ Orca 워크트리에서 뜬 맨몸 에이전트도 한 줄로 검증을 돌릴 수 있다.
→ **`CliCommand` 속성**(C# 정적 메서드에 부착)으로 프로젝트 전용 검증 명령을 만들 수 있다. 이게 Orca의 "평가 계약"을 실행 가능하게 만드는 핵심이다.

### 주의

- `eval`은 임의 C# 실행 → 신뢰할 수 없는 입력에 직접 노출 금지
- 런타임 제어는 개발용 Player에서만
- experimental이므로 여기 의존하는 자동화는 **얇게** 유지

---

## 7. 신규 프로젝트 Day-1 셋업 체크리스트

- [ ] **1. Git 기준점**
  - [ ] 프로젝트 `.gitignore`에 Unity 표준 항목을 **직접** 넣는다 (전역 `core.excludesFile`에 의존하지 말 것 — 그 파일이 사라지면 `Library/`가 통째로 추적된다)
  - [ ] 에이전트 설정 폴더의 추적 여부를 **지금** 결정 (함정 A)
  - [ ] 기준 브랜치·remote 확정
- [ ] **2. 검증 수단 확보** ← **Orca보다 먼저**
  - [ ] 테스트 asmdef 생성 (`com.unity.test-framework`)
  - [ ] `verify-compile` — 컴파일 에러 0건
  - [ ] `verify-tables` — 데이터 파일 헤더 ↔ 코드 필드명 대조
        (*존재하지 않는 컬럼을 조회해도 에러 없이 기본값을 반환하는 파서가 많다. 컴파일도 실행도 되는데 항상 기본값만 나오는 버그가 반복 발생하는 지점이라, 자동 검증 1순위다.*)
  - [ ] 둘 다 **종료 코드**로 성공/실패를 알릴 것 (에이전트가 스스로 판정 가능해야 함)
- [ ] **3. Unity CLI**
  - [ ] `unity install <프로젝트 버전>` / `unity pipeline install`
  - [ ] `unity doctor`로 실행 중인 에디터에 실제로 붙는지 확인 ← **갈림길**
  - [ ] 안 붙으면 EditMode 테스트 + CI 사본 경로로 우회
  - [ ] 위 검증 2개를 `CliCommand`로 노출
- [ ] **4. MCP 브릿지**
  - [ ] `mcpforunity://instances`로 **멀티 인스턴스 지원 여부 확정** → (a)/(b) 결정
  - [ ] (a)라면 "한 번에 Unity 하나" 규칙을 문서·훅에 명시
- [ ] **5. Orca 설정**
  - [ ] CLI를 PATH에 등록 (Settings → Experimental → CLI)
  - [ ] `orca repo add --path <프로젝트 경로>`
  - [ ] **Agent Permissions = Manual** (기본값이 권한 우회 인자를 미리 채운다. 에이전트가 씬·프리팹을 직접 고치므로 자동 승인은 위험)
  - [ ] `hookSettings.scripts.setup`에 **가드 포함** Unity 실행 스크립트 작성
  - [ ] `DO_NOT_TRACK=1`, `ORCA_TELEMETRY_DISABLED=1`
- [ ] **6. 첫 실험**
  - [ ] 원인 가설이 둘로 갈리는 버그 하나를 고른다
  - [ ] **에이전트 2개만** (늘리면 선택지보다 검토 비용이 먼저 늘어난다)
  - [ ] 같은 평가 계약을 준다 (아래 템플릿)

---

## 8. 프롬프트 계약 템플릿

같은 문장을 복사하는 게 아니라 **같은 평가 계약**(목표·범위·성공 조건·금지·결과 형식)을 준다.

```
목표: (해결할 문제 한 문장)
범위: (수정 허용 경로만 명시)
성공 조건: <verify-compile> 과 <verify-tables> 가 모두 통과해야 한다.
금지:
  - 이 워크트리에서 Unity 에디터를 열지 말 것 (Library 전체 재임포트 발생)
  - 에이전트 설정 폴더(.claude 등) 아래 md 기록을 쓰지 말 것 (원본과 공유됨)
  - 패키지 버전 변경, 테스트 삭제 금지
결과: 원인, 변경 파일, 실행한 검증, 남은 위험을 10줄 이내로 보고.
```

---

## 9. 채택 이후

- 테스트 결과와 diff를 우선한다. 에이전트의 문장 설명은 근거가 아니다.
- 둘 다 통과하면 변경 줄 수가 아니라 **원인 제거 여부**와 예외 처리 명확성으로 고른다.
- 둘 다 실패하면 억지로 섞지 말고, 실패 로그를 새 worktree의 입력으로 넘긴다.
- 채택한 브랜치만 stage → commit → push. 남은 worktree는 기록 확인 후 archive/삭제.
- 기록 md는 **채택 후 원본에서 한 번만** 남긴다.

---

## 참고

- [Orca 사용법 — 여러 CLI 에이전트를 워크트리로 병렬 실행하는 방법](https://dop3n.tistory.com/entry/Orca-%EC%82%AC%EC%9A%A9%EB%B2%95-%EC%97%AC%EB%9F%AC-CLI-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8%EB%A5%BC-%EC%9B%8C%ED%81%AC%ED%8A%B8%EB%A6%AC%EB%A1%9C-%EB%B3%91%EB%A0%AC-%EC%8B%A4%ED%96%89%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95)
- [Unity CLI](https://javaexpert.tistory.com/1794)
- `orca skills list` / `orca skills get <name>` — 설치본에 번들된 공식 가이드
