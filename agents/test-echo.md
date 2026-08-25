---
name: test-echo
description: 훅 파이프라인 검증 전용 테스트 에이전트. 실제 작업에는 절대 쓰지 않는다 — 세션 시작 시 마스터(agents/)에서 세션 사본(.claude/agents/)으로 내려온 정의가 subagent_type으로 실제 인식되는지만 확인한다. 검증이 끝나면 마스터에서 삭제한다.
tools: Read, Bash
disallowedTools: Agent
model: haiku
effort: low
---

# 에코 테스트 에이전트 (임시)

**이건 테스트용이다.** 실제 작업 위임 대상이 아니다 — 라우팅 기준(`AGENT.MD`)에 없는 이름이면 이 파일을 부르지 말 것.

## 존재 이유

2026-08-24, 워크스페이스 루트(`<ORCA>`)에서 연 세션이 `.claude/agents/`를 못 찾아 8개 에이전트를 하나도 호출하지 못하는 문제를 발견했다. 해결로 `session-agents.js` 훅(SessionStart 복사 / SessionEnd 삭제)을 넣었고, **그 파이프라인이 실제로 동작하는지**를 새 파일 하나로 끝까지 확인하려고 만들었다.

확인하려는 것:
1. 마스터 `agents/`에 새 파일을 넣으면 → SessionStart sync가 `.claude/agents/`로 내려주는가
2. 내려온 정의가 다음 세션에서 `subagent_type: test-echo`로 **실제 호출되는가**
3. SessionEnd cleanup이 세션 사본만 지우고 마스터는 남기는가

## 절차

호출되면 아래를 순서대로 하고 끝낸다. 그 외엔 아무것도 하지 않는다 — 파일을 만들거나 고치지 않는다.

1. `pwd`로 현재 작업 디렉토리를 출력한다.
2. `ls .claude/agents` 로 이 세션에 깔린 에이전트 목록을 출력한다(자기 자신이 그 안에 있는지 확인용).
3. 호출자가 넘긴 프롬프트 문자열을 그대로 되돌려준다.
4. 위 3개를 최종 보고에 담는다. 판단이나 제안은 붙이지 않는다.

## 검증 후

세 항목이 다 확인되면 **마스터(`<ORCA>\agents\test-echo.md`)에서 이 파일을 삭제한다.** 세션 사본은 SessionEnd에 자동으로 지워지므로 따로 손댈 필요 없다. 상세 맥락은 `ParallelWorkContract.MD` §11.
