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
