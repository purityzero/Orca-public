CLAUDE.MD

## Codex와의 작업 경계
작업을 Codex·서브에이전트에 배정하거나 위임하기 전에 `AGENT.MD`를 읽는다(매 세션 자동 주입하지 않는다 — 2026-11-12 문맥 감량). Codex 역할·프로필·완료 조건은 `CODEX.md`·`AGENT.MD`. 분석·자동화·테스트·리팩터링·정합성은 Codex가 구현·검증까지 우선 소유하고 실측으로 배정한다. 협업·비교 소유권·평가는 `ParallelWorkContract.MD`를 따르며 동시 수정 금지. Unity MCP·Play Mode는 Codex 담당, 검증 결과는 파일 변경과 분리한다. Claude는 만들고 코드 검수(읽기·규칙·정합성)까지 한다 — MCP for Unity를 쓰는 컴파일·Play Mode QA는 Codex가 하며, 구현자가 자기 구현을 QA하지 않는다(2026-11-13 사용자 확인). Git 마무리·병합 완료 브랜치 삭제는 Codex 메인만 하고, `codex exec`가 아니라 Orca Codex 탭으로 인계한다. Claude는 변경·검증·위험을 인계한다.

## 커뮤니케이션
대화·표·중간 보고·사용자에게 보이는 생각·도구 사이 설명은 한국어로 짧고 명확하게 쓴다. 사용자가 꼭 알아야 할 문장(변경 기록 위치, 결정 요청, 사용자가 할 일, 미검증 항목)은 **볼드**로 쓴다(2026-11-13 사용자 요청). 클래스를 언급할 때는 열어볼 수 있게 `절대경로:줄번호`를 함께 적는다(대응 `.claude/class/{클래스명}.md`가 있으면 그 경로도). 커밋은 해시만 나열하지 않고 한 줄에 하나씩 `해시 - 무엇을 바꿨는지`로 적는다(근거: 2026-11-06 사용자 요청). 에이전트·작업자·터미널을 언급할 때는 내부 ID만 쓰지 않고 `ID - 탭 이름 (맡은 일)`로 적는다(예: `ctx_e9b9a10164c2 - Report task status | Orca (Codex · push)`). 탭 이름은 에이전트가 계속 덮어쓰므로 언급할 때마다 `orca terminal list`로 조회하고, 작업자를 띄울 때는 `--display-name "Codex · <작업명>"`을 붙인다(2026-11-06 실측·사용자 요청).

## 작업 경계와 세션 리셋 (Claude·Codex 공통)
새 목표는 Claude `/clear`·Codex `/new`, 같은 목표는 이어간다. 인계 반환·회수·사용자 요약 전 리셋 금지. 일회성 승인은 승계하지 않고 상시 권한은 유지한다. 시작 시 탭 이름, 리셋 직전 `.local/session-log.md`의 ID·결과·재개 명령을 기록한다. 절차는 `runbook/session-reset.md`.

## 미완료 작업
첫 응답 전 `.claude/UNFINISHED.md`를 읽고 알린다. 완료 항목은 지운다. 미검증 즉시 날짜·작업·검증·파일·브랜치·불가 이유를 기록·갱신하고 매 커밋 때 확인한다. Unity 목록 중복 출력·임의 선택 금지. 선택 후 에디터 실행·세션 확정을 함께 한다. 상세는 `runbook/task-execution.md`.

## 환경 체크
환경 점검 결과 처리 전에 읽는다. 사용자 조치 항목은 첫 응답에서 질문하고 임의 설치·pull은 하지 않는다. 런북: `runbook/session-environment.md`.
## 기록 md
클래스·프리팹·기록 md 작업 전 `runbook/document-records.md`를 읽는다. 대응 md를 먼저 읽고 수정 후 기록·기획·설계를 실제 상태로 갱신한다.

## UI·프리팹 규칙
프리팹·UI 수정 전에 `runbook/prefab-ui.md`와 `runbook/coding-principles.md`의 표준 컴포넌트 규칙을 읽는다.

## 코드 규칙
- C# 수정 전 `CODE.MD`와 `runbook/coding-principles.md`를 모두 Read로 읽는다. `.cs` Edit·Write·MultiEdit는 세션별 읽기 확인 훅으로 강제한다.
- 특정 폴더/시스템 전용 규칙은 .claude/rules/*.md에 paths로 지정되어 있으며, 충돌 시 더 좁은 스코프의 규칙이 우선한다.

## 동작 변경과 브랜치
동작 변경 전 `WorkBranchFlow.MD`와 `runbook/coding-principles.md`의 브랜치 규칙을 읽는다.

## 피드백
실수는 런북·메모리를 먼저 검색한다. 피드백·정정·재발·공용 규칙 저장 전 `runbook/feedback.md`를 읽는다.

## 생각이 먼저다
가정·불확실성·트레이드오프를 드러낸다. 여러 해석과 더 단순한 방법을 제시하고, 불명확한 요구는 멈춰 묻는다.

## 단순함과 최소 침습
요청 범위만 단순하게 구현한다. 불필요한 기능·유연성·설정 금지. 기존 스타일을 따르고 무관한 코드·주석·포맷·사용자 변경은 건드리지 않는다. 모든 변경 줄은 요청으로 설명되어야 한다.

## 목표·계획
목표·계획 전 `runbook/task-execution.md`를 읽고 성공 기준을 정해 통과할 때까지 반복한다.
## 실제 경로 검증
검증 전 `runbook/verification-paths.md`를 읽고 실제 프로덕션 진입 경로·결과물을 검증한다.
## 반복 실패
2~3회 같은 실패면 멈춰 해석한다. 진단 전 `runbook/task-execution.md`를 읽는다.
권한 밖은 고치지 말고 근거·수정 지점을 전달한다.

## 요구 확인
정답이 갈리면 추상적 질문을 반복하지 말고 구체적인 숫자·사례로 먼저 확인한다.
