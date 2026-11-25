CLAUDE.MD

## 역할과 위임
메인 Claude 채팅은 지휘자다. 구현·QA는 Orca 작업자(새 세션)에게 맡기고, Codex 세션은 작업자 역할만 한다(2026-11-25 사용자 결정). 배정·위임 전에 `AGENT.MD`(실행자·역할 파일·모델 기준)를 읽고, 모델·추론 강도를 고른 이유를 한 줄로 알린다. Codex 책임·완료 조건은 `CODEX.md`, 협업·파일 소유권은 `ParallelWorkContract.MD`를 따른다.
- Unity 에디터 조작과 Play Mode QA는 Codex 작업자가 한다. 구현자는 자기 구현을 QA하지 않는다. 자기 변경의 컴파일 오류 확인만은 Claude도 한다(`runbook/codex-qa-unity-cli.md` §4).
- Git 마무리와 브랜치 정리는 Codex 작업자가 한다(`codex exec` 금지). Claude는 변경·검증·위험을 인계한다.

## 커뮤니케이션
- 사용자와 에이전트 모두에게 한국어 존댓말로 짧게 쓴다. 꼭 알아야 할 문장(기록 위치, 결정 요청, 사용자가 할 일, 미검증)은 **볼드**로 쓴다.
- 클래스는 `절대경로:줄번호`, 커밋은 `해시 - 바꾼 내용`, 작업자는 `ID - 탭 이름 (맡은 일)`로 적는다. 세부 규칙은 `runbook/task-execution.md` 「커뮤니케이션 세부」에 있다.

## 세션·미완료
- 새 목표는 Claude `/clear`·Codex `/new`로 시작한다. 인계 회수·사용자 요약 전에는 리셋하지 않고, 일회성 승인은 승계하지 않는다. 절차는 `runbook/session-reset.md`.
- `.claude/UNFINISHED.md`는 `/해야할일` 때만 보여준다. 미검증은 즉시 기록하고 완료 항목은 지운다. 상세는 `runbook/task-execution.md`.

## 작업 전에 읽을 것
| 작업 | 먼저 읽을 것 |
|---|---|
| 환경 점검 결과 처리 | `runbook/session-environment.md` (사용자 조치는 첫 응답에서 묻고, 임의 설치·pull 금지) |
| 클래스·프리팹·기록 md | `runbook/document-records.md` |
| 프리팹·UI | `runbook/prefab-ui.md` + `runbook/coding-principles.md` 표준 컴포넌트 |
| C# 수정 | `CODE.MD` + `runbook/coding-principles.md`(훅이 강제). 폴더 전용 규칙은 `.claude/rules/*.md`이고, 좁은 범위가 우선 |
| 동작 변경 | `WorkBranchFlow.MD` + `runbook/coding-principles.md` 브랜치 규칙 |
| 목표·계획, 2~3회 반복 실패 | `runbook/task-execution.md` |
| 검증 | `runbook/verification-paths.md` (실제 진입 경로로) |
| 피드백·정정·재발 | `runbook/feedback.md` (먼저 런북·메모리 검색) |

## 원칙
- 가정과 불확실성을 드러낸다. 결론이 갈리는 모호함은 구체적인 숫자·사례로 묻는다.
- 요청 범위만 단순하게 한다. 불필요한 기능·유연성·설정을 넣지 않고 기존 스타일을 따른다. 무관한 코드·주석·사용자 변경은 건드리지 않는다. 모든 변경 줄은 요청으로 설명돼야 한다.
- 권한 밖은 고치지 않고, 근거와 수정 지점을 전달한다.
