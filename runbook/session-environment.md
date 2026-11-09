# 세션 시작 환경 체크

마지막 적용: 2026-11-09

`CLAUDE.md`에서 상황별 절차·근거를 원문 그대로 옮겼다. 해당 주제를 작업하기 전에 읽는다.

## 세션 시작 환경 체크

`.claude/hooks/env-check.js`가 매 세션 필수 도구·배선(node / git / codex CLI / 훅 3종 / 서브에이전트 마스터 /
PowerShell·OpenUnityProject.ps1 / Unity Hub 목록 / Orca 저장소의 원격 최신 여부)을 훑어 표로 출력한다.
Hub 목록은 `tools/unity-hub.js`로 일반 APPDATA와 스토어판 MSIX 가상화 폴더의 JSON/SQLite를 공통 조회한다. `hub.db · 프로젝트 0개`는 정상적인 빈 목록이며, `/시작`에서는 "프로젝트가 없습니다."로 표시한다. 데이터·에디터 경로와 Node 요건은 `UnityLauncher.MD` §2를 참고한다. 별도의 「Unity 에디터」 행에서 Hub 실행 파일을 탐지하는 방식은 이번 목록 지원 변경에 포함되지 않았다.
사용자 조치가 필요한 항목(미설치 도구, 원격보다 뒤처짐)은 `additionalContext`로 넘어온다 —
**첫 응답에서 `AskUserQuestion`으로 물어 처리한다. 임의로 설치하거나 pull 하지 않는다.**
훅은 프롬프트를 못 띄우므로 "빠졌으면 묻는다"가 훅의 감지 + 세션의 질문 2단계로 실현된다.
저장소 상태는 매 세션 `git fetch origin <branch>`로 확인하며, 오프라인이면 "원격 확인 실패"로 낮춰 표시하고 계속한다.
(근거: node 부재로 훅 전체가 조용히 안 돈 적이 있고, codex 미설치·저장소 뒤처짐도 한참 뒤에 발견됐다. 2026-09-04)

## Orca 터미널 Claude CLI → 채팅 안내

`.claude/hooks/orca-chat-default.js`는 기존 훅과 별도로 SessionStart에 등록한다(timeout 15초).
Windows의 Orca 터미널에서 대화형 Claude를 새로 시작하면 같은 체크아웃의 채팅 탭을 한 번 열고,
`systemMessage`와 `additionalContext`로 실행 결과를 전달한다. 첫 응답은 그 결과와 설정 안내를 한국어로 짧게 전한다.
터미널은 닫지 않으며, 사용자가 CLI를 선택하면 계속 쓸 수 있다.

- `source=startup`, `CLAUDE_CODE_ENTRYPOINT=cli`, Orca 환경 신호가 모두 있어야 한다.
- 채팅(`ORCA_STRUCTURED_SESSION=1`, `ORCA_CHAT_SCRATCH_DIR`, `sdk-ts`), 비대화형(`sdk-cli`, `-p`/`--print`, 입출력 포맷 옵션, `--init-only`, 백그라운드 실행), `resume`·`clear`·`compact`·`fork`는 조용히 건너뛴다.
- `ORCA_SKIP_CHAT_REDIRECT=1`이면 출력·프로세스 조회·표시 파일·탭 생성 없이 종료한다.
- `orca-chat-processes.ps1`로 부모 체인을 한 번 조회한다(상한 3초). 훅 소유 Claude보다 위에 Claude/Codex가 있으면 제외한다. 조회 실패·시간 초과·알 수 없는 진입점·Windows 이외 환경도 조용히 제외한다.
- Claude Agent 도구의 서브에이전트는 별도 `SubagentStart` 이벤트 대상이다. 이 훅은 그 이벤트에 등록하지 않는다. [공식 훅 문서](https://code.claude.com/docs/en/hooks#subagentstart)

설정은 `%ORCA_USER_DATA_PATH%/profiles/local-default/profile-state.db`의 settings 행을
Node `node:sqlite`의 `readOnly: true`로 읽는다. `agentDefaultSurface`가 `chat`이 아니면
**Orca의 Claude Chat | CLI 선택을 Chat으로 바꾸라**고 안내한다. 정확한 메뉴 경로는 아직 확정하지 않았다.
`nativeChatProviders.claude`가 꺼져 있거나 확인되지 않으면 함께 안내한다. DB·설정 값을 쓰지는 않는다.
DB를 읽지 못해도 채팅 열기는 시도하고 실패 이유를 전한다.

실행 파일은 `ORCA_CLI_COMMAND`를 우선하고, 없으면 PATH의 `orca`를 쓴다(실측한 Orca 터미널에는 해당 변수가 없었다).
`agent launch --agent claude --surface chat --json`을 셸 없이 실행하며 상한은 8초다.
성공은 `outcome.kind=structured`로 확인하고, 터미널 fallback·오류·시간 초과를 성공으로 알리지 않는다.

### 중복 방지와 재시도

표시는 `<ORCA>/.local/orca-chat-default-<호스트명 SHA-256 앞 16자리>.json`이다.
범위는 **이 PC의 이 체크아웃당 1회**다. 다른 PC로 복사한 표시나 다른 체크아웃의 채팅 때문에 해당 작업 공간의 첫 안내가 사라지지 않도록 구분했다.
launch 전에 `wx`로 선점하므로 동시 시작도 한 번만 실행한다. 실패·시간 초과·fallback도 자동 재시도하지 않는다.
표시 저장에 실패하면 중복 방지를 보장할 수 없어 자동 열기만 건너뛰고 안내한다.
표시는 채팅 탭의 현재 생존 여부를 추적하지 않는다. 이후 CLI 시작은 안내만 하고, 닫힌 채팅은 UI에서 다시 연다.
재시험할 때만 해당 표시 파일을 삭제한다. 테스트 종료 후에는 테스트 표시를 지워 사용자의 첫 실행 기회를 남긴다.

### Orca 데몬 경유 실행의 한계

`orca agent launch --surface terminal`의 자식은 호출한 Codex/Claude가 아니라 Orca 데몬 아래에서 시작한다.
실측 체인은 `훅 node → Bash → Claude → PowerShell → Orca 데몬 → Orca → Explorer`였다.
이 경우 부모 체인만으로 사람과 에이전트를 구분하지 못한다. 사람의 UI 실행과 비교해 확정한 구분 환경 변수도 아직 없다.
따라서 이 경로에는 자동 제외를 보장하지 않으며, 한 번 표시가 마지막 중복 방지 수단이다.
호출자 셸에만 skip 변수를 설정한 뒤 `orca agent launch`를 부르면 자식에 전달된다고 가정하지 않는다.
에이전트가 의도적으로 Claude CLI를 실행할 때는 **실제로 Claude를 실행하는 셸**에 변수를 설정한다.
명령 예시는 [Codex 인계 런북](codex-handoff.md#에이전트가-claude-cli를-실행할-때)을 따른다.

자동 검증: `node --test .claude/hooks/orca-chat-default.test.js`.
실제 UI에서 사람이 연 CLI의 판정은 `.claude/UNFINISHED.md`의 확인 항목을 따른다.

