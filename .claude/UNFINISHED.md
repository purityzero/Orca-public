# 미완료 작업

## 2026-09-04 — env-check 훅(SessionStart) 실물 검증

**브랜치**: `work/2026-09-04-env-check-hook` (main엔 아직 미병합 — 지금 워킹트리가 이 브랜치로 체크아웃돼 있음. 다른 브랜치로 옮기면 훅 파일 자체가 사라지니 검증 전엔 유지할 것)
**관련 파일**: `.claude/hooks/env-check.js`(신규), `.claude/settings.json`(SessionStart 세 번째 훅으로 등록), `CLAUDE.md`("세션 시작 시 환경 체크" 절)

**지금까지 확인한 것**: 훅을 직접 호출(stdin에 JSON 파이핑)해서 출력 포맷·타이밍(~1.8초)·JSON 유효성만 봤다. **실제 Claude Code 세션이 SessionStart에서 이 훅을 정상 실행하는지는 미확인.**

**다음 세션에서 검증할 것**:
1. 세션이 열릴 때 화면에 `[환경 체크]` 표가 실제로 뜨는지 (systemMessage 렌더링)
2. 빠진 항목이 있을 때 첫 응답에서 `AskUserQuestion`으로 묻는 동작까지 이어지는지 (additionalContext → 세션 행동 연결)
3. `git fetch` 포함 전체 소요 시간이 settings.json의 timeout(20초) 안에 끝나는지, 네트워크가 느리거나 오프라인일 때 "원격 확인 실패"로 정상 강등되는지
4. (가능하면) 일부러 커밋 하나를 뒤에 남겨두거나 origin과 어긋나게 만들어 "Orca 저장소 … 뒤" 분기가 실제로 pull 여부를 묻는지까지 1회 확인

**검증 후**: 문제 없으면 `main`으로 병합(Codex 메인 세션 담당) 후 이 항목 제거. 문제 있으면 고친 뒤 같은 브랜치에 재커밋.

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
