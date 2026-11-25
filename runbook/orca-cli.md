## 부록 A. Orca CLI 명령어 레퍼런스

Orca에는 CLI가 번들돼 있으나 **PATH에 자동 등록되지 않는다** — 위치는 `%LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe`. **Settings → Experimental → CLI**에서 등록하면 `orca`로 바로 쓸 수 있다(이 PC엔 이미 등록됨).

### 프로젝트는 "실행 시 선택"이 아니라 "등록 후 전환"이다

`orca open`은 프로젝트 경로 인자를 받지 않는다. **repo를 여러 개 등록해두고 사이드바에서 전환**하는 모델이다.

repo 등록·전환, worktree 선택자·생성, 터미널·메시징 명령은 설치본 `orca skills get orca-cli`를 읽고 따른다. `repo`는 로컬 경로 단위(일반 폴더도 등록 가능), `project`는 원격 저장소를 연결하는 단위다.

### 주요 명령군

범용 명령·실패 복구·파괴적 폴더 정리는 `orca skills get orca-cli`, 작업자 배정·메시지·오류 복구는 `orca skills get orchestration`이 정본이다. 막히면 설치본 지침과 `--help`를 확인한다.
작업자 회수·닫기는 [AGENT.MD](../AGENT.MD)와 [codex-handoff.md](codex-handoff.md)를 따른다.

### setup 훅 — worktree 생성 시 실행됨, "앱 시작"이 아님

`orca repo show --repo name:<이름> --json`의 `hookSettings.scripts.setup`에 명령을 넣어 worktree 생성 시 실행할 수 있다. 실제 실행 정책은 repo의 `hookSettings`와 worktree 생성 시 `--setup`을 확인한다.

스케줄 자동화는 앱 시작·프로젝트 선택 이벤트가 아니므로 이 저장소는 `OrcaStart.cmd`를 쓴다. setup 훅에 Unity 자동 실행을 걸지 않는다. 원본 에디터 실행은 `OpenUnityProject.ps1 -ProjectPath "<원본:{P}>"`로 한다.

### Unity CLI — `verify-compile`/`verify-tables` 구현 메커니즘

Unity CLI(`unity install/doctor/pipeline`)는 이미 실행 중인 에디터를 셸에서 제어할 수 있어(Pipeline), Unity 에디터 락과 경쟁하지 않고 검증이 가능하다. **`CliCommand` 속성**(C# 정적 메서드에 부착)으로 프로젝트 전용 검증 명령을 노출하면, `ParallelWorkContract.MD` §5/§10의 `<verify-compile>`/`<verify-tables>`를 실제 종료 코드로 판정하는 CLI 명령으로 만들 수 있다.

**2026-08-28 실측:** CLI `1.0.0-beta.6` + Pipeline `0.5.0-exp.1`에서 설치 직후 에디터 재시작이 필요했고, 프로젝트 검증 명령의 성공 0·의도적 실패 6을 확인했다. 현행 설치·대상 지정·연결 판정은 [Unity CLI QA](codex-qa-unity-cli.md)를 따른다. `doctor`는 환경 진단이며 연결 판정은 `status`·`pipeline list`로 한다.
`verify-compile`은 재컴파일 요청이 아니라 import/compile idle 후 **최신 컴파일 결과를 판정**한다.

```powershell
unity command verify-compile --project-path "<원본:{P}>" --format json
unity command verify-tables --project-path "<원본:{P}>" --format json
```

주의: `eval`은 임의 C# 실행이라 신뢰할 수 없는 입력에 노출 금지, experimental이라 의존하는 자동화는 얇게 유지.

### 채팅 작업 공간의 미커밋 변경은 공간과 함께 사라진다 (2026-11-06)

Orca 채팅은 채팅마다 작업 폴더(`%USERPROFILE%\orca\workspaces\<repo>\<이름>`, 별도 worktree·브랜치)를 만들 수 있다.
그 채팅을 정리하면 **폴더와 브랜치가 함께 지워지고, 커밋하지 않은 변경은 복구 수단 없이 사라진다.**

- 채팅 작업 폴더에서 고친 것은 **그 채팅을 닫기 전에 커밋(Codex 인계)까지 끝낸다.** 못 끝내면 사용자에게 "닫으면 사라진다"를 알린다.
- 지금 작업이 어느 폴더에서 도는지 첫 응답 전에 확인한다(`git rev-parse --show-toplevel`). 본 저장소(`C:\AI\Orca`)와 다르면 위 위험을 염두에 둔다.
- 사라졌다면 대화 기록(`~/.claude/projects/<폴더>/<세션>.jsonl`)의 Edit 입력으로 재적용할 수 있다. 같은 tool_use가 두 번 기록되므로 **id로 중복을 걸러야** 한다.

(근거: 2026-11-06 `pinniped` 채팅 정리로 미커밋 훅 2개와 브랜치가 유실됨)

### Orca 채팅에서 훅이 보이는 방식 (2026-11-06 실측)

- 채팅은 **첫 메시지를 보낼 때** 세션을 시작한다. SessionStart 훅도 그때 돈다 — 채팅 창을 연 시점엔 아무 훅도 안 돌았다.
- 정상 종료한 훅의 화면 출력(`systemMessage`)은 채팅에 **표시되지 않는다**(Orca가 `hook_response`를 `suppressed-benign`으로 분류). 실패한 훅만 "hook failed"로 뜬다.
- `additionalContext`는 세션에 정상 전달된다. 그래서 채팅에서 사용자에게 보여줄 내용은 **세션의 첫 응답**이 대신 보여줘야 한다.
