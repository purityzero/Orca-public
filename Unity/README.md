# `<ORCA>\Unity\` — 워크스페이스 구조

> 경로 토큰(`<ORCA>`, `<원본:{프로젝트명}>`)의 뜻과 `LocalPaths.json`은 루트 `README.md`의 "경로 표기 규칙" 참고. **`<원본:...>`이 나오는 작업을 하기 전엔 `<ORCA>\LocalPaths.json`을 먼저 읽어 실제 경로를 확인한다.**

**작성일:** 2026-08-21
**배경:** Orca가 GeometryDefender/HouseRulez 두 Unity 프로젝트의 문서(`.claude`)를 통합 관리하기로 하면서 신설. 이 문서가 없어서 오늘 하루 동안 마스터-사본 관계가 두 번(agents 동기화 누락, UNFINISHED.md 구버전 복사) 어긋났다 — 그 사고를 막기 위한 기록.

---

## 1. 폴더 구조

```
<ORCA>\
├── CLAUDE.md / CODEX.md / CODE.MD / PREFAB.MD / AGENT.MD
│                                                   ← 에이전트 역할 + 코딩 규칙 + 라우팅, 정본
├── agents\*.md                                   ← Claude 에이전트 9개 + 진단용 test-echo, 정본
├── ParallelWorkContract.MD                       ← Orca 자체 운용 문서
├── LocalPaths.json                               ← 이 PC의 프로젝트 원본 경로 (git 제외)
├── UnityLauncher.MD/.ps1/.cmd, OrcaStart.cmd     ← 프로젝트 실행 체인
└── Unity\
    ├── README.md                                 ← 이 문서
    ├── GeometryDefender\.claude\                  ← 정본 (프로젝트 고유 문서)
    └── HouseRulez\.claude\                        ← 정본 (프로젝트 고유 문서)

<원본:GeometryDefender>\.claude\                  ← 실제 Unity 에디터가 런타임에 읽는 곳 (원본)
<원본:HouseRulez>\.claude\                        ← 실제 Unity 에디터가 런타임에 읽는 곳 (원본)
```

## 2. 정본(source of truth) 규칙

| 종류 | 정본 위치 | 원본 프로젝트 쪽 상태 |
|---|---|---|
| 에이전트·코딩 규칙 (CLAUDE.md/CODEX.md/CODE.MD/PREFAB.MD/AGENT.MD) | `<ORCA>` 루트, 1부만 | 각 프로젝트 `.claude`엔 없음 (중복 생성 금지) |
| 서브에이전트 정의 (`agents/*.md`) | `<ORCA>\agents\` | 각 프로젝트 `.claude\agents\`에 **복사본** 필요(아래 3절) |
| 프로젝트 고유 문서 (class/prefab/design/qa/rules, UNFINISHED.md) | `<ORCA>\Unity\{프로젝트명}\.claude\` | 원본은 **스냅샷 고정** — Orca 쪽만 갱신 |

## 3. ⚠️ 동기화 방향 — 반드시 기억할 것

**Claude Code가 실행 시점에 실제로 읽는 건 `<원본:{프로젝트명}>\.claude\`다.** `<ORCA>\Unity\{프로젝트명}\.claude\`는 Orca에서 보기 편하라고 둔 사본이지, Unity 에디터나 그 프로젝트에서 직접 연 Claude Code 세션은 이 사본을 전혀 모른다.

- **문서(class/prefab/design/qa/rules/UNFINISHED.md) 갱신** → Orca 쪽(`<ORCA>\Unity\{P}\.claude\`)만 고친다. 원본은 그 시점 스냅샷으로 고정, 더 갱신 안 함.
- **에이전트 정의(`agents/*.md`) 갱신 — 예외, 원본도 반드시 같이 고쳐야 함**: subagent_type은 프로젝트 로컬 `.claude/agents/`에서 찾으므로, **그 프로젝트에서 Agent를 실제로 실행하려면 원본(`<원본:{P}>\.claude\agents\`)에도 있어야 동작한다.** Orca 사본만 고치고 원본에 안 옮기면, 그 프로젝트 세션에서 subagent_type 자체가 안 보인다.
  - **원본 경로는 반드시 `<ORCA>\LocalPaths.json`에서 읽는다.** 값이 `null`이면 그 프로젝트는 이 PC에 없으니 원본 반영을 건너뛰고, 사본만 고쳤다는 사실을 사용자에게 알린다(다른 PC에서 마저 반영해야 함).
  - 절차는 `ParallelWorkContract.MD` §8 참고 — 마스터(`<ORCA>\agents\`) 기준으로 프로젝트에 없는 파일은 그대로 복사, 이미 있는 파일은 **body(프로젝트 노하우)는 보존하고 frontmatter 안전설정만 병합**한다(무조건 덮어쓰기 금지).

## 4. 왜 "원본 스냅샷 고정"에 예외가 생겼나

문서(class/prefab 등)는 Claude Code가 "다음에 이 md를 읽고 시작" 정도의 참고 자료라 사본만 최신이어도 문제없다. 반면 에이전트 정의는 **그 파일이 실제로 그 경로에 존재해야 기능이 동작하는 설정**이라 원본에도 있어야 한다 — 이 차이 때문에 규칙이 갈린다.

## 4-1. `<ORCA>\rules\glory.md`는 왜 여기 있나

이 파일의 frontmatter는 `paths: "Assets/Scripts/**/*.cs"`라 **Orca 루트에선 절대 발동하지 않는다**(`Assets` 폴더 자체가 없음). agents와 같은 성격 — **각 프로젝트 `.claude/rules/glory.md`에 뿌릴 마스터 보관용**이다. 스테일이 아니니 삭제하지 말 것.

## 5. 알려진 함정 (2026-08-21 실제로 겪은 것)

- **에이전트 폴더를 "복사했다"고 가정하지 말고 파일 개수까지 대조할 것** — 최초 `Copy-Item -Recurse`가 이 하위 폴더만 빠뜨려 두 프로젝트의 원본 `agents/`가 한동안 비어있었다.
- **어느 쪽이 최신인지 diff로 반드시 확인 후 병합할 것** — `UNFINISHED.md`를 옛 버전으로 덮어쓸 뻔했다(루트에 있던 게 실은 더 최신이었음).
