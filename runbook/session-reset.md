# 세션 리셋과 작업 내역 남기기

리셋하거나 다른 탭에 `/clear`·`/new`를 보낼 때 읽는다(근거: 2026-11-05 실측). 독립된 새 목표는 Claude `/clear`·Codex `/new`로 시작하고 같은 목표의 수정·검증·커밋·요청된 push는 이어간다. 일회성 승인은 새 대화로 승계하지 않으며 상시 권한은 유지한다.

## 리셋 전후 체크
- **인계가 닫혔는지** — 상대의 반환 도착, 산출물 회수, 사용자 요약까지 끝나야 닫힌다. `accepted: true`는 메시지가 도착했다는 뜻일 뿐이다. 보류하면 대상·상태·다음 행동·허용 범위를 `.claude/UNFINISHED.md`에 남긴다.
- **리셋 후** — 작업 경로·브랜치·미커밋 변경부터 확인한다. 앞 작업이 남긴 변경을 자기 것으로 커밋하지 않는다. 프로젝트가 요청에 적혀 있으면 다시 묻지 말고 확정 기록만 남긴다.
- **반환문** — handle만 보고도 무슨 결과인지 알 수 있게 작업명·대상·결과를 담는다. 같은 handle이라고 같은 맥락이 이어지는 게 아니다.
- 지침·설정을 바꿨거나 에이전트 목록이 깨졌으면 리셋 대신 완전히 재시작한다.

## 작업 내역 남기기
- **시작할 때:** Orca 탭 이름을 작업명으로 바꾼다 — `orca terminal rename --terminal <handle> --title "<작업명>"`.
- **리셋 직전:** 조율한 쪽(보통 Claude)이 `.local/session-log.md`(로컬 전용, `.gitignore` 대상)에 작업당 한 덩어리를 덧붙인다.
  ```
  ## YYYY-MM-DD 작업명
  - Claude: <세션ID>  /  Codex: <세션ID>
  - 결과: <요약> (<커밋 해시>)
  - 남은 일: <없으면 없음>
  - 다시 열기: claude --resume <ID>  /  codex resume <ID> -C <작업 경로>
  ```
  비밀·첫 프롬프트 원문·절대 홈 경로는 넣지 않는다.
- 이 로그는 대화를 찾아가는 안내판일 뿐이고, 정본은 커밋·`UNFINISHED.md`·런북이다. 원본 대화는 이 PC의 Orca 계정 폴더에만 있어 로그를 커밋해도 다른 PC에서 다시 열 수 없다.
- 세션 ID 찾기: Claude는 Orca 프로필의 `projects/<작업경로>/` 아래 `{ID}.jsonl`, Codex는 `$CODEX_HOME/session_index.jsonl`(ID·제목)과 `sessions/YYYY/MM/DD/rollout-*.jsonl`.
- 세션 검색은 내장 선택기(`claude --resume`, `codex resume`)를 먼저 쓰고, 못 찾는 문제가 생기면 별도 목록 도구를 검토한다(2026-11-05 결정).

## 실측 (2026-11-05)
| 항목 | Claude `/clear` | Codex `/new` (0.166.0) |
|---|---|---|
| 훅·지침 | SessionEnd·SessionStart 실행, 에이전트 목록 다시 읽음 | `AGENTS.md` 재주입, SessionEnd 미등록(미확인) |
| 이전 승인 | — | push 승인 안 넘어옴 |

## 주의
- **Git Bash로 `/clear`·`/new`·`/exit`를 보내면 경로로 바뀐다** — `C:/Program Files/Git/clear`로 전송된다. `MSYS_NO_PATHCONV=1 orca terminal send ...`로 보내거나 PowerShell로 보낸다.
- 기존 Codex 탭의 `/new`는 메뉴를 띄운다(0.166.0 실측). 현재 worktree 선택 표시 → 빈 Enter → 입력창·cwd 확인 후 브리프를 보낸다. 메뉴 중 입력이 소비되거나 다른 worktree가 선택될 수 있다.
- 기존 탭의 인계 가드·실제 수신 확인·복구는 [codex-handoff.md](codex-handoff.md) 「사용자가 지정한 기존 Codex 탭에 직접 인계」를 따른다. `accepted: true`만으로 실제 수신·완료를 판단하지 않는다.
- 인계 감시 훅(`.claude/hooks/codex-handoff-guard.js`)은 Bash의 `orca terminal send --text` 값만 검사한다(PowerShell은 제외). 반환 요구·`반환불필요`는 `--text` 안에 적고, 명령 주석·`grep` 문구로 대신하지 않는다.
  단독 `/new`·`/clear`·`/exit`, `--help`, 빈 Enter(`--text ""`)는 통과한다.
- 공유 `.claude/agents/`의 삭제·리셋 후 복구는 [subagents.md](subagents.md), 작업자 회수·닫기는 [AGENT.MD](../AGENT.MD)와 [codex-handoff.md](codex-handoff.md)를 따른다.
