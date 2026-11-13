# Codex QA 절차 — 빠른 확인 (QA-작은 범위)

마지막 적용: 2026-11-13. 원래 Claude 서브에이전트 `agents/qa-quick-check.md`였다. **QA는 Codex가 한다**(구현=Claude / 검증=Codex, `AGENT.MD` §실행자 선택, 2026-11-13 사용자 확인). 그래서 Claude 세션에 깔리지 않도록 런북으로 옮겼다.

- **누가 쓰나**: Codex. Claude가 버그를 고친 뒤 "고쳐졌는지 확인"이 필요하면 Codex 인계 브리프에 이 파일 경로와 확인할 항목 목록을 넣는다(`runbook/codex-handoff.md`).
- **언제**: 이미 수정한 버그(하나 또는 여러 개 묶음)가 해소됐는지, 특정 시나리오가 정상 동작하는지. `client-bugfixer`·`quick-fix`가 여러 건을 고친 뒤에도 한 Play Mode 세션 안에서 전부 훑는다 — 항목 수만큼 Play Mode를 반복 진입하지 않는다. 여러 시스템에 걸친 전체 플레이나 밸런스 판단은 `runbook/codex-qa-full.md`.
- **도구**: MCP for Unity(Codex 설정의 `unityMCP`). 로컬 Unity 에디터가 필요하므로 워크트리·원격에서 실행하지 않는다.
- **재시도 상한**: 서브에이전트 시절엔 설정(`maxTurns: 45`)으로 강제됐지만 지금은 문서 규칙이다. 같은 실패가 2~3회 반복되면 멈추고 원인을 해석하고, 도구 호출이 약 45회에 이르면 그때까지의 항목별 결과와 막힌 지점을 "QA 미완료"로 반환한다.
- **시작 전 컴파일**: `runbook/codex-qa-full.md` 머리말의 「시작 전 컴파일」과 같다 — 반영 → 컴파일 완료 대기 → 최신 오류 0건 확인, 확인 못 하면 "QA 미확인"으로 반환.

시나리오 하나 또는 여러 개를 짧게 재현해서 항목별 통과/실패를 판정한다. 전체 플레이 절차(`runbook/codex-qa-full.md`)의 축약판 — 영상 녹화 없이 콘솔 로그와 `execute_code` 폴링으로 판별 가능한 검증이 기본값이다.

## 절차

1. MCP for Unity 도구가 이 Codex 세션에 연결돼 있는지 확인 — 안 잡히면 중단하고 보고(`Window → MCP for Unity` 연결 상태 확인 필요, 에디터를 켠 뒤 세션을 새로 열어야 할 가능성).
2. 확인할 항목 목록을 정리한다 — 여러 건이면(예: client-bugfixer가 방금 배치로 고친 이슈 목록) 전부 나열해두고, 이후 **Play Mode를 한 번만 진입**해서 순서대로 확인한다.
3. **Play Mode 진입 전 Unity 에디터 창에 OS 포커스를 맞춘다** — `Get-Process`에서 Unity 프로세스를 찾아 `AppActivate`로 전면 활성화(`runbook/codex-qa-full.md` 2절 "주의" 참고). 포커스 없으면 Play Mode 진입 후에도 프레임이 안 흐를 수 있다.
4. Play Mode 진입 → `Time.frameCount`가 실제로 증가하는지 확인(멈춰 있으면 `EditorApplication.Step()`으로 수동 진행).
5. 목록의 각 항목에 대해 순서대로: 해당 시나리오를 정확히 재현하고(씬 전환/버튼 클릭은 `ExecuteEvents.pointerClickHandler`로 실제 클릭 이벤트를 발생시킨다 — `OnClickXxx()` 직접 호출 금지, Edit Mode에서도 실행돼버려 검증이 안 됨), 판정 근거를 확보한다(관련 값을 `execute_code`로 폴링, 콘솔 로그 에러/예외를 `read_console`로 확인). 항목마다 통과/실패를 즉시 기록해두고 다음 항목으로 넘어간다 — 한 항목이 실패했다고 중단하지 않고 나머지도 마저 확인한다.
6. 눈으로만 판단 가능한 시각적 확인(애니메이션 타이밍, 겹침 등)이 섞여 있으면 그 항목 구간만 `Tools/QA/Start Recording`~`Stop Recording`으로 짧게 녹화한 뒤, `runbook/codex-qa-full.md` 3절대로 프레임을 뽑아 확인 — 나머지 항목까지 전부 녹화하지 않는다.
7. 전체 목록 확인이 끝나면 Play Mode 종료.
8. 항목별 통과/실패를 표나 목록으로 명확히 보고. **실패한 항목, 또는 확인 도중 발견한 별개의 새 이슈**는 `.claude/qa/client-issues.md`(또는 `.claude/qa/design-issues.md`)에 전체 플레이 절차와 동일한 형식(날짜별 항목)으로 기록한다 — QA는 리포트만 남기고 코드를 고치지 않는다(수정은 Claude 쪽 quick-fix/client-bugfixer 몫). 결과는 인계받은 Claude 세션에 돌려준다(`runbook/codex-handoff.md`).

## 하지 않는 것
- 여러 시스템에 걸친 장시간 플레이, 밸런스 판단(`runbook/codex-qa-full.md` 몫).
- 발견한 버그의 코드 수정(Claude 쪽 quick-fix/client-bugfixer 몫).
