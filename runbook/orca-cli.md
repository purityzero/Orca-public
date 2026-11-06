## 부록 A. Orca CLI 명령어 레퍼런스

Orca에는 CLI가 번들돼 있으나 **PATH에 자동 등록되지 않는다** — 위치는 `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe`. **Settings → Experimental → CLI**에서 등록하면 `orca`로 바로 쓸 수 있다(이 PC엔 이미 등록됨).

### 프로젝트는 "실행 시 선택"이 아니라 "등록 후 전환"이다

`orca open`은 프로젝트 경로 인자를 받지 않는다. **repo를 여러 개 등록해두고 사이드바에서 전환**하는 모델이다.

```bash
orca repo add --path "<프로젝트 경로>"   # 등록 (GUI: 사이드바 Add Repo)
orca repo list                           # 등록 목록
orca repo set-base-ref ...               # worktree가 뻗어나갈 기준 브랜치
```

작업 단위인 worktree를 만들 때 `--repo`로 프로젝트를 고른다:

```bash
orca worktree create --repo name:NextProject --name task-a --agent claude --prompt "..."
```

셀렉터 형식: `name:`, `id:`, `path:` / worktree 쪽은 `branch:`, `path:`, `active` 등.

### `repo`와 `project`는 다른 개념

- **repo** — 로컬 파일시스템 경로 단위. 로컬만 쓸 거면 이것으로 충분. git이 아니어도 `kind: "folder"`로 등록 가능(단 worktree 불가) — `<ORCA>` 자체가 그 예시였으나 지금은 git 저장소가 됐다.
- **project** — durable, 원격 저장소 연결 단위 (`project setup-clone`, `project setup-existing-folder`)

### 주요 명령군

| 명령군 | 용도 |
|---|---|
| `repo` | 프로젝트 등록·조회·기준 ref |
| `worktree` | 생성·조회·삭제, `ps`로 전체 요약 |
| `terminal` | 워크트리 안 터미널 생성/입력/대기/종료 |
| `orchestration` | 에이전트 간 메시징, task dispatch, 워커 감독 |
| `automations` | 스케줄 자동화 (주의: 전부 스케줄 기반, "앱 시작"·"프로젝트 선택" 같은 이벤트 트리거는 없음 — 그래서 `OrcaStart.cmd` 래퍼를 씀) |
| `skills list / get` | **번들된 공식 가이드** (`orca-cli`, `orchestration` 등) ← 막히면 여기부터 |

### setup 훅 — worktree 생성 시 실행됨, "앱 시작"이 아님

`orca repo show --repo name:<이름> --json`의 `hookSettings.scripts.setup`에 명령을 넣어 worktree 생성 시 실행할 수 있다. 실제 실행 정책은 repo의 `hookSettings`와 worktree 생성 시 `--setup`을 확인한다.

setup 훅에 Unity 자동 실행을 걸지 않는다. 원본 에디터 실행은 `OpenUnityProject.ps1 -ProjectPath "<원본:{P}>"`로 한다.

### Unity CLI — `verify-compile`/`verify-tables` 구현 메커니즘

Unity CLI(`unity install/doctor/pipeline`)는 이미 실행 중인 에디터를 셸에서 제어할 수 있어(Pipeline), Unity 에디터 락과 경쟁하지 않고 검증이 가능하다. **`CliCommand` 속성**(C# 정적 메서드에 부착)으로 프로젝트 전용 검증 명령을 노출하면, `ParallelWorkContract.MD` §5/§10의 `<verify-compile>`/`<verify-tables>`를 실제 종료 코드로 판정하는 CLI 명령으로 만들 수 있다.

**2026-08-28 HouseRulez 실측:** Windows `winget install Unity.CLI`로 CLI `1.0.0-beta.6`을 설치했고, 프로젝트에는 `com.unity.pipeline` `0.5.0-exp.1`을 추가했다. 패키지 추가 직후 실행 중이던 에디터에는 서버가 뜨지 않아 에디터를 한 번 재시작해야 했다. 재시작 뒤 `unity status --format json`이 `state: ready`, `unity command editor_status --project-path <원본:HouseRulez> --format json`이 성공했고 Pipeline 서버는 `127.0.0.1:7800`에서 응답했다. `unity doctor`는 CLI/PATH/에디터 설치 환경 진단용이며, 실행 중인 Pipeline 연결 판정은 `unity status` 또는 `unity pipeline list`로 해야 한다.

HouseRulez의 프로젝트 전용 명령도 구현 완료했다. 둘 다 성공 시 종료 코드 0, 의도적 오류를 넣은 실패 검증에서 종료 코드 6을 반환했다. `verify-compile`은 컴파일을 새로 요청하는 명령이 아니라 **Unity가 변경을 import/compile해 idle이 된 뒤 최신 컴파일 결과를 판정**하는 명령이다.

```powershell
unity command verify-compile --project-path "<원본:{P}>" --format json
unity command verify-tables --project-path "<원본:{P}>" --format json
```

주의: `eval`은 임의 C# 실행이라 신뢰할 수 없는 입력에 노출 금지, experimental이라 의존하는 자동화는 얇게 유지.
