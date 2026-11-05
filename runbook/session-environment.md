# 세션 시작 환경 체크

마지막 적용: 2026-11-05

`CLAUDE.md`에서 상황별 절차·근거를 원문 그대로 옮겼다. 해당 주제를 작업하기 전에 읽는다.

## 세션 시작 환경 체크

`.claude/hooks/env-check.js`가 매 세션 필수 도구·배선(node / git / codex CLI / 훅 3종 / 서브에이전트 마스터 /
PowerShell·OpenUnityProject.ps1 / Unity Hub 목록 / Orca 저장소의 원격 최신 여부)을 훑어 표로 출력한다.
사용자 조치가 필요한 항목(미설치 도구, 원격보다 뒤처짐)은 `additionalContext`로 넘어온다 —
**첫 응답에서 `AskUserQuestion`으로 물어 처리한다. 임의로 설치하거나 pull 하지 않는다.**
훅은 프롬프트를 못 띄우므로 "빠졌으면 묻는다"가 훅의 감지 + 세션의 질문 2단계로 실현된다.
저장소 상태는 매 세션 `git fetch origin <branch>`로 확인하며, 오프라인이면 "원격 확인 실패"로 낮춰 표시하고 계속한다.
(근거: node 부재로 훅 전체가 조용히 안 돈 적이 있고, codex 미설치·저장소 뒤처짐도 한참 뒤에 발견됐다. 2026-09-04)

