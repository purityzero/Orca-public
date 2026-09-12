# 미완료 작업

## 2026-09-04 — env-check 훅(SessionStart) 실물 검증

**브랜치**: `work/2026-09-04-env-check-hook` (main엔 아직 미병합 — 지금 워킹트리가 이 브랜치로 체크아웃돼 있음. 다른 브랜치로 옮기면 훅 파일 자체가 사라지니 검증 전엔 유지할 것)
**관련 파일**: `.claude/hooks/env-check.js`(신규), `.claude/settings.json`(SessionStart 세 번째 훅으로 등록), `CLAUDE.md`("세션 시작 시 환경 체크" 절)

**지금까지 확인한 것**: 훅을 직접 호출(stdin에 JSON 파이핑)해서 출력 포맷·타이밍(~1.8초)·JSON 유효성만 봤다.

### ✅ 2026-09-10 세션에서 실물 확인됨 (항목 1 · 항목 3 절반)

실제 Claude Code 세션이 열릴 때 사용자 화면에 아래 표가 **떴다**(사용자 확인):

```
[환경 체크]
  node          OK  v24.14.1
  git           OK  2.53.0.windows.1
  codex CLI     OK  codex-cli 0.150.1
  PowerShell    OK  OpenUnityProject.ps1
  훅            OK  3종
  서브에이전트  OK  10개
  Unity Hub     OK  projects-v1.json
  Orca 저장소   OK  최신
```

- **항목 1 닫힘** — SessionStart에서 훅이 실제로 실행되고 `systemMessage`가 렌더된다
- **항목 3 절반 닫힘** — `Orca 저장소 OK 최신`이 뜨려면 `git fetch`가 성공해야 하므로,
  **fetch 포함 전체가 `settings.json`의 timeout(20초) 안에 끝난다**는 것이 증명됐다.
  오프라인일 때 "원격 확인 실패"로 강등되는 분기는 여전히 미확인

> ⚠️ **훅의 `systemMessage`는 사용자 화면에만 뜨고 세션 컨텍스트로는 안 들어온다.**
> 그래서 이 검증은 **세션이 스스로 못 한다** — 사용자에게 물어야만 확인된다.
> (2026-09-10 실측: 세션은 프로젝트 목록 훅 출력만 받았고 `[환경 체크]` 표는 못 봤다)

### ✅ 2026-09-12 — 항목 2·4 닫힘 (실물 확인)

`work/2026-09-04-env-check-hook`을 `e4a4603`으로 1커밋 되돌려 `behind=1`을 만들고
`--continue` 없이 새 세션을 열었다. **훅이 정확히 발동했다.**

| 항목 | 결과 |
|---|---|
| **4. "origin보다 뒤" 분기** | ✅ 환경 체크 표에 `origin/work/2026-09-04-env-check-hook보다 1커밋 뒤`로 떴다 |
| **2. `additionalContext` → 세션이 `AskUserQuestion`으로 묻기** | ✅ 세션에 전달됐고 첫 응답에서 pull 여부를 물어 처리했다 |

`action` 문구의 "워킹트리에 미커밋 변경이 있으면 pull 전에 알릴 것"도 지켜졌다 —
`.claude/UNFINISHED.md`가 더티였고, origin 커밋이 그 파일을 건드리지 않아 `pull --ff-only`가
충돌 없이 통과함을 미리 확인한 뒤 물었다.

복구 완료: `git pull --ff-only` → `0c4a115`, behind 0. 런북 5파일도 돌아왔다.

**남은 것은 항목 3의 절반뿐이다.**

### ⬜ 남은 것 — 전부 "일부러 망가뜨린 상태로 새 세션을 열어야" 확인된다

훅은 SessionStart에만 돌므로 **진행 중인 세션에서는 아래를 검증할 방법이 없다.**

3. **(절반) 오프라인·원격 접근 실패 시 "원격 확인 실패"로 정상 강등되는지**

이건 `action`이 없는 분기라 `additionalContext`를 만들지 않고 화면 표에만 warn으로 뜬다(코드로 확인).
실제로 `work/2026-09-11-doc-slim`은 원격에 없어서 **그 브랜치에 있는 동안 이 분기를 탄다** —
2026-09-12 이전 세션에서 그렇게 떴을 것이나 사용자 확인을 받지 못했다.
진짜 오프라인(네트워크 차단)에서의 강등은 여전히 미확인이다.

**중요도 낮음**: 실패해도 화면 표시가 덜 정확해질 뿐이고 세션 행동은 안 바뀐다.
이것만 남았으므로 **main 병합을 더 막지 않는다.**

### ✅ 병합 가능 상태

항목 1·2·4가 닫혔고 3은 영향이 작다. 따라서 이 브랜치와 그 위에 쌓인
`work/2026-09-11-doc-slim`(`9eeff52`, 자동 주입 문서 다이어트)을 **main에 병합할 수 있다.**
Git 마무리는 Codex 메인 세션 담당이므로 인계한다.

## 2026-09-04 — memory-kit Windows 락 패치, 오늘은 여기서 중단

**대상 파일**: `C:\Users\ryoun\OneDrive\Desktop\memory\memory-kit\MEMORY-KIT.md` — **Orca 저장소 밖**, git 추적 안 됨(사용자 개인 다운로드본, 김빛나 작 memory-kit). 방금 한 변경은 커밋 대상이 아니라 그 파일 자체에 직접 반영돼 있음.

**한 것(완료·검증됨)**: `fcntl`(POSIX 전용) 기반 락 3곳을 Windows(`msvcrt`)까지 되게 패치 — `ledger_lock`·`memory_lock`(둘 다 `hooks/memkit_paths.py` 안, 공용 헬퍼 `_flock_exclusive`/`_flock_release` 신설) · `hooks/hook-wrap-log.py`(원래 모듈 최상단 무조건 `import fcntl`라 Windows에서 즉시 크래시하던 것 — 지연 임포트로 교체). 전부 `[W1·로컬 Windows 패치·비공식]` 주석으로 표시해 원작과 구분해둠.
- **검증**: `unpack.py`로 실제로 풀어서 Windows python 3.14로 `py_compile` + `--selftest` 실행. 그리고 **부모/자식 두 프로세스를 실제로 띄워** `memory_lock` 상호배제를 실측(부모가 잡은 동안 자식은 `CHILD_TIMEOUT`, 부모가 풀자 자식이 `CHILD_GOT_LOCK`) — 잠금 없이 진행되던 기존 상태와 다르다는 것 확인.
- 자체 검토 중 잡은 버그 1개: `_flock_exclusive`의 blocking 모드에 임의 30초 타임아웃을 넣었다가, 원본 POSIX `flock(LOCK_EX)`는 무제한 대기라는 걸 깨닫고 제거(플랫폼 간 동작 불일치를 스스로 만들 뻔함).

**검증하다 발견했지만 손 안 댄 것(범위 밖 — 오늘은 여기까지)**: 락과 무관한 별개의 Windows 버그 3종을 `--selftest`로 확인만 하고 안 고쳤다.
1. `hooks/memory-rank-index.py` `--selftest` 크래시 — `print("✗ ...")`가 Windows 콘솔 기본 코드페이지(cp949)로 인코딩 안 됨
2. `tools/memory-archive.py`, `tools/memory-migrate.py` `--selftest` 크래시 — `open(path).read()`에 `encoding="utf-8"` 미지정 → cp949로 읽다 한글 바이트에서 디코드 실패
3. `hooks/posttooluse-memuse-log.py` `--selftest` FAIL(크래시는 아님) — 파일 경로에서 `/memory/` 같은 POSIX 구분자를 문자열로 찾는 로직이 Windows `\` 경로를 못 잡음

(`memory-recall-hook.py`·`stop-capture-prompt.py`는 `--selftest` 정상 통과)

**다음에 이어가려면**: 사용자가 "인코딩/경로 버그까지 마저 고칠지" 결정 필요 — 위 1~3을 고치기 전엔 이 kit의 `memory-rank-index`·`memory-archive`·`memory-migrate`·`posttooluse-memuse-log`는 Windows에서 못 쓴다고 봐야 함. **참고**: 이 버그들을 다 고쳐도 Orca 저장소 자체에 이 kit을 도입하는 건 별개 판단(2026-09-04 검토 결과 "memory 개수 문턱 미달로 보류" — CODEX.md에 Codex용 memory 참조 한 줄만 반영해둔 상태, 그 결정은 안 바뀜).

## 2026-09-11 — 자동 주입 문서 다이어트 (브랜치 `work/2026-09-11-doc-slim`)

세션이 첫 응답 전에 지침 문서만 55,256자를 싣고 있었다(사용자 지적). **36,069자로 35% 줄였다.**

| 무엇 | 어떻게 |
|---|---|
| 글로벌 `~/.claude/CODE.md` | Orca `CODE.MD`와 내용이 같은 사본이라 **삭제**. 글로벌 `CLAUDE.md`는 정본 경로를 가리키는 포인터로 교체 |
| `PREFAB.MD` | `runbook/prefab-ui.md`로 이동. `CLAUDE.md`엔 표준 컴포넌트 표 4행만 남김 |
| `CLAUDE.md` 상황 한정 3절 | `runbook/recurring-bugs.md`로 이동(데이터 레이어 5종·로컬라이제이션·바이너리 자산). 상시 규칙 2줄만 남김 |
| `CLAUDE.md` 5절 | 문장 압축(미완료 보고·환경 체크·착수 체크리스트·재사용 원칙·권한 경계) |

### ⬜ 검증 못 한 것 — 다음 세션을 열어야 확인된다

1. **실제 주입량이 줄었는가** — 새 세션의 시스템 프롬프트에 글로벌 `CODE.md`와 `PREFAB.MD`가
   더 이상 안 들어오는지. 이번 세션은 이미 옛 문서를 실은 채 시작해서 확인할 수 없다.
2. **압축으로 규칙이 깎이지 않았는가** — 런북으로 옮긴 3절은 원문 줄 단위 대조로 누락 0을 확인했지만,
   문장을 다시 쓴 5절은 기계 대조가 불가능하다. 사람이 읽어 확인해야 한다.
3. **글로벌 포인터가 Orca 밖 세션에서 실제로 읽히는가** — 다른 워크스페이스에서 C# 작업을 할 때
   `D:\Orca\CODE.MD`를 실제로 열어 보는지. 안 읽으면 Orca 밖에서 코드 규칙이 사라진 셈이 된다.

### 📌 이 작업 중 드러난 별건 — 어제 문서 작업이 통째로 main 미병합

`work/2026-09-04-env-check-hook`(`0c4a115`)에만 있고 main에는 없다: runbook 5파일,
`CLAUDE.md` 승격 사다리 절, `CODE.MD` bool 반환 메서드 규칙, `AGENT.MD` Codex 방침, env-check 훅.
막혀 있는 이유는 위 2026-09-04 항목의 훅 검증 2·4가 안 끝나서다.
`work/2026-09-11-doc-slim`은 그 브랜치 위에 쌓았으므로 **함께 병합되거나 함께 막힌다.**
