# Codex 시작 지침

이 저장소에서 작업하는 Codex는 실제 작업이나 답변을 시작하기 전에 다음 문서를 UTF-8로 읽는다.

1. `README.md`
2. `CODEX.md`
3. `CLAUDE.md`
4. `CODE.MD`
5. `AGENT.MD`

문서 내용이 충돌하면 시스템·개발자·사용자 지시를 우선하고, 저장소 문서끼리는 더 구체적인 범위의 문서를 우선한다.

## 작업 대상이 정해졌을 때 추가로 읽을 문서

- Claude에서 넘겨받은 작업이면 `runbook/codex-handoff.md`를 읽는다.
- Orca 운용, 병렬 작업, 에이전트 조율: `ParallelWorkContract.MD`
- Unity 프로젝트의 동작을 바꾸는 수정: `WorkBranchFlow.MD`
- Unity 프로젝트 또는 프로젝트 문서 작업: `Unity/README.md`, `LocalPaths.json`, 해당 프로젝트의 `Unity/{프로젝트명}/.claude/UNFINISHED.md`
- 클래스 수정: 해당 프로젝트의 `.claude/class/{클래스명}.md`와 적용되는 `.claude/rules/*.md`
- 프리팹 수정: 해당 프로젝트의 `.claude/prefab/{프리팹명}.md`, `runbook/prefab-ui.md`, 적용되는 `.claude/rules/*.md`
- 특정 역할 에이전트 정의가 필요한 작업: `agents/{역할}.md`

`Unity/**/.claude/class`, `prefab`, `design`, `qa` 아래의 모든 기록을 세션 시작마다 일괄 로드하지 않는다. 작업 대상과 관련된 문서는 파일 탐색 직후, 코드나 에셋을 읽거나 수정하기 전에 반드시 읽는다. 프로젝트 원본 경로는 추측하지 않고 항상 `LocalPaths.json`에서 확인한다.

새 작업을 시작하거나 대화를 리셋(`/new`)할 때는 `CLAUDE.md` 「작업 경계와 세션 리셋」을 따른다.

문서를 읽었다고 가정하지 않는다. 현재 세션에서 실제로 읽은 뒤 적용하며, 파일이 없거나 읽을 수 없으면 그 사실을 사용자에게 알린다.
