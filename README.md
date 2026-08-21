# Orca 워크스페이스

**이게 뭔가:** `C:\Orca`는 Unity 게임 프로젝트(GeometryDefender, HouseRulez)를 Claude Code + Orca 앱으로 관리하기 위한 **메타 작업공간**이다. 게임 코드 자체는 여기 없다(`C:\Unity\...`에 따로 있음) — 여긴 코딩 규칙, 서브에이전트 정의, 프로젝트 문서(class/prefab/design/qa), 실행 스크립트, 운용 원칙 문서를 모아둔 곳이다.

**작성일:** 2026-08-22
**GitHub:** https://github.com/purityzero/Orca (private) — 여러 PC에서 이 폴더를 clone해서 같은 상태로 이어 쓸 수 있다.

---

## 1. 빠른 시작

### 새 PC에서 처음 셋업할 때
```bash
git clone https://github.com/purityzero/Orca.git C:\Orca
```
그 다음 `UnityLauncher.MD` §3(설치 절차)을 따라 `.ps1` 인코딩만 확인하면 끝.

### 평소 실행 순서
1. 바탕화면 바로가기(또는 `OrcaStart.cmd` 직접 실행) 클릭
2. Unity 프로젝트 번호 선택 → 해당 버전 에디터 자동 실행 → MCP for Unity 자동 연결(전역 설정 켜둠)
3. Orca 앱이 뒤이어 자동으로 뜸 (Unity 로딩과 병렬)

상세 메커니즘은 `UnityLauncher.MD` 참고.

### 새 세션에서 이어서 작업할 때
1. `UNFINISHED.md` — 이 워크스페이스 자체의 미완료 항목부터 확인
2. 작업 대상이 특정 프로젝트(GeometryDefender/HouseRulez)면 `Unity\{프로젝트명}\.claude\UNFINISHED.md`도 확인
3. `Orca준비작업.MD` §0-1 "진행 상태"에서 전체 맥락 파악

---

## 2. 폴더 구조

```
C:\Orca\
├── README.md                    ← 이 문서 (전체 사용법)
├── CLAUDE.md                    ← 행동 지침 (같이 읽을 파일: CODE/PREFAB/AGENT)
├── CODE.MD                      ← C#/Unity 코딩 규칙 (네이밍, 스타일 등)
├── PREFAB.MD                    ← 프리팹/UI 컴포넌트 규칙
├── AGENT.MD                     ← 서브에이전트 8개 라우팅 기준(누구를 언제 부를지)
├── UNFINISHED.md                ← Orca 워크스페이스 자체의 미완료 작업
│
├── Orca준비작업.MD               ← Orca/Unity CLI 조사 결과, 진행 상태 추적
├── ParallelWorkContract.MD      ← 병렬 레인 작업 분할 계약 (Main→워커 핸드오프 규격)
│
├── UnityLauncher.MD             ← 런처 동작 원리·검증 기록
├── UnityLauncher.ps1            ← 런처 스크립트 본체
├── UnityLauncher.cmd            ← 런처 실행 진입점
├── OrcaStart.cmd                ← "Unity 실행 → Orca 실행" 묶음 시퀀스
│
├── agents\                      ← 서브에이전트 정의 8개, **마스터**
│   ├── code-architect.md        (설계, opus/high)
│   ├── code-writer.md           (구현, sonnet/low)
│   ├── client-bugfixer.md       (버그 수정-큰 범위, sonnet/medium)
│   ├── quick-fix.md             (버그 수정-작은 범위, haiku/low)
│   ├── qa-tester.md             (QA-큰 범위, opus/high, maxTurns 80)
│   ├── qa-quick-check.md        (QA-작은 범위, sonnet/medium, maxTurns 45)
│   ├── design-planner.md        (기획, opus/high)
│   └── design-issue-resolver.md (밸런스 반영, sonnet/medium)
│
├── rules\
│   └── glory.md                 ← Glory 공용 라이브러리 사용 지침, **마스터 보관용**
│                                    (frontmatter의 paths가 Assets/Scripts 전용이라 여기선 발동 안 함)
│
└── Unity\                       ← 프로젝트별 문서 사본 (정본은 여기)
    ├── README.md                ← 이 폴더 전용 상세 설명(마스터-사본 규칙, 동기화 함정)
    ├── GeometryDefender\.claude\
    │   ├── agents\ (8)           ← 마스터 + 이 프로젝트 전용 노하우 병합본
    │   ├── class\ (100+)         ← 클래스별 기록
    │   ├── prefab\ (20+)         ← 프리팹별 기록
    │   ├── design\ (5)           ← 기획 스펙
    │   ├── qa\ (2)               ← client-issues.md / design-issues.md
    │   ├── rules\glory.md
    │   ├── UNFINISHED.md         ← 이 프로젝트(GeometryDefender)의 미완료 작업
    │   └── settings.local.json
    └── HouseRulez\.claude\
        ├── agents\ (8)
        ├── class\ (5)
        ├── rules\glory.md
        ├── UNFINISHED.md         ← 이 프로젝트(HouseRulez)의 미완료 작업
        └── settings.local.json

C:\Unity\GeometryDefender\.claude\        ← 실제 Unity 에디터가 읽는 원본 (게임 코드도 여기)
C:\Unity\HouseRules\HouseRulez\.claude\   ← 실제 Unity 에디터가 읽는 원본 (게임 코드도 여기)
```

> `Unity\` 폴더 자체의 정본 규칙·동기화 함정·마스터 관계는 **`Unity\README.md`에 훨씬 상세히** 정리돼 있다 — 프로젝트 문서를 실제로 갱신하기 전엔 그 문서부터 읽을 것.

---

## 3. 문서 지도 — 뭘 언제 읽나

| 문서 | 언제 읽나 |
|---|---|
| `CLAUDE.md`/`CODE.MD`/`PREFAB.MD`/`AGENT.MD` | 어떤 세션이든 항상(자동 로드) — 코딩/행동 규칙 |
| `UNFINISHED.md` (루트) | 세션 시작 시 항상 — Orca 자체의 미완료 작업 |
| `Unity\{P}\.claude\UNFINISHED.md` | 특정 프로젝트 작업 시작 시 |
| `Orca준비작업.MD` | Orca/Unity CLI 자체를 다시 조사하거나 셋업을 바꿀 때 |
| `ParallelWorkContract.MD` | 레인 2개 이상으로 병렬 작업을 짤 때 (특히 §8 이름 기반 소프트 락) |
| `UnityLauncher.MD` | 런처가 이상하게 동작하거나 새 PC에 셋업할 때 |
| `Unity\README.md` | 프로젝트 문서(class/prefab/agents 등)를 갱신하기 전에 항상 |
| `Unity\{P}\.claude\class\{Class}.md` | 그 클래스를 수정하기 전에 항상 (없으면 수정 후 생성) |

---

## 4. 핵심 원칙 요약 (각 문서에 상세 근거 있음)

1. **정본 위치가 종류별로 다르다** — 코딩 규칙은 루트 1부, 에이전트 정의는 `agents\`가 마스터(단 실제 실행엔 프로젝트 로컬 사본이 필요), 프로젝트 문서는 `Unity\{P}\.claude\`가 정본이고 `C:\Unity\{P}\.claude\`(원본)는 그 시점 스냅샷. (`Unity\README.md` 참고)
2. **에이전트를 실행하기 전엔 이름에 프로젝트명을 붙인다** — `{ProjectName}_{ClassName}_class` 형식. GeometryDefender/HouseRulez가 같은 "Glory" 라이브러리를 써서 클래스명이 겹치기 때문. 스폰 전 `ListAgents`로 같은 이름이 이미 실행 중이면 대기한다. (`ParallelWorkContract.MD` §8)
3. **Unity 에디터·MCP 브릿지는 공유 자원, 한 번에 하나만** — Play Mode 검증이나 프리팹 편집은 병렬 불가. 코드/문서 편집만 병렬 가능. (`Orca준비작업.MD` §2)
4. **MCP for Unity는 전역 자동연결 켜둠** — `MCPForUnity.AutoStartOnLoad`가 레지스트리(모든 프로젝트 공유)에 `true`로 설정돼 있어, 이 런처로 여는 어떤 프로젝트든 자동으로 서버가 뜬다. (`UnityLauncher.MD` §6)
5. **기록용 md 파일은 그 프로젝트가 없는 한 만들지 않는다** — 특정 프로젝트 얘기(클래스명, 파일명)를 이 루트의 공용 문서에 직접 섞지 않는다. `CLAUDE.md`의 "피드백 반영 프로세스" 참고.

---

## 5. 알려진 이슈 / 다음에 볼 것

`UNFINISHED.md` 참고 — MCP 멀티 인스턴스 (a)/(b) 미확정, GeometryDefender git 커밋 상태, Orca 바로가기 대상 확인 등.
