# 세션 리셋과 작업 내역 남기기

`CLAUDE.md` 「작업 경계와 세션 리셋」의 세부 절차·실측·주의. 리셋하거나 다른 탭에 `/clear`·`/new`를 보낼 때 읽는다.
(근거: 2026-11-05 사용자 제안, Codex 검토, 시험 탭 실측)

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
- 별도 목록 도구는 만들지 않았다. 내장 선택기(`claude --resume`, `codex resume`)로 1~2주 써 보고 못 찾는 일이 생기면 그때 만든다(2026-11-05 결정).

## 실측 (2026-11-05)
| 항목 | Claude `/clear` | Codex `/new` (0.166.0) |
|---|---|---|
| 세션 ID | 바뀜 | 새 rollout 생성 |
| 터미널 handle | 유지 | 유지 |
| 이전 대화 | 없음 | 없음 |
| 훅 | SessionEnd·SessionStart 모두 실행 | SessionEnd 미등록(미확인) |
| 에이전트 목록 | **다시 읽음**(clear 직전 추가한 정의가 보였다) | — |
| 지침 | 세션 시작 훅 안내 다시 들어옴 | `AGENTS.md`가 지침으로 다시 주입됨 |
| 이전 승인 | — | push 승인 안 넘어옴 |

## 주의
- **Git Bash로 `/clear`·`/new`·`/exit`를 보내면 경로로 바뀐다** — `C:/Program Files/Git/clear`로 전송된다. `MSYS_NO_PATHCONV=1 orca terminal send ...`로 보내거나 PowerShell로 보낸다.
- **인계 감시 훅(`.claude/hooks/codex-handoff-guard.js`)은 `orca terminal send`의 `--text` 값만 본다.** 반환 요구나 `반환불필요`는 `--text` 안에 써야 인정된다(명령 주석·`grep` 문구는 무시).
  단독 슬래시 명령(`/new`, `/clear`, `/exit`)과 `--help`, 빈 Enter(`--text ""`)는 통과한다. Bash 도구만 대상이고 PowerShell 도구는 검사하지 않는다.
  (2026-11-05 수정 전에는 명령 전체에서 문구를 찾아, 같은 명령의 `grep '"accepted"'`만으로 통과하고 `--help`는 막혔다)
- **Codex `/new`는 바로 새 대화가 아니라 메뉴를 띄운다**(0.166.0 실측): "Where should the new conversation run? › 1. Use current Git worktree / 2. Create new Git worktree". 메뉴가 떠 있는 동안 보낸 입력은 메뉴 조작으로 소비될 수 있다.
  → `/new` 전송 → 화면에서 메뉴와 **선택 표시가 1번(`›`)인지** 확인 → `--text "" --enter`로 선택 → 입력창(`› Ask Codex`)과 cwd 확인 → 그다음에 보낸다. 수신 확인은 `codex-handoff.md` 3단계 기준(user 레코드 일치).
  (2026-11-05: `/new` 직후 보낸 브리프의 user 레코드가 어느 rollout에도 없고, 이후 cwd가 분리 worktree인 대화가 생겼다. 메뉴 때문인지, 누가 2번을 골랐는지는 기록으로 특정하지 못했다)
- **`.claude/agents/`는 모든 세션이 같이 쓴다.** 한 세션이 종료되면 다른 세션이 쓰던 사본까지 지워진다(시험 탭 `/exit` 직후 0개). 리셋은 지운 뒤 바로 다시 깐다. 안 보이면 `node .claude/hooks/session-agents.js sync`. 근본 수정은 `UNFINISHED.md` 항목.
