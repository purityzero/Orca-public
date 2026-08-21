# 미완료 작업 (Orca 워크스페이스 자체)

> GeometryDefender/HouseRulez 게임 프로젝트 자체의 미완료 작업은 각각
> `Unity\GeometryDefender\.claude\UNFINISHED.md` / `Unity\HouseRulez\.claude\UNFINISHED.md` 참고.
> 여기는 **Orca 메타 워크스페이스**(`C:\Orca` 자체의 셋업/문서/도구) 미완료 항목만 기록한다.

## 2026-08-21 — Orca 파일 정리 감사 후 남은 확인 필요 항목

### 다음 세션 최우선
1. **`mcpforunity://instances`로 멀티 인스턴스 지원 여부 확정** — Unity 에디터를 켠 상태에서 이 세션에 MCP for Unity 도구를 붙여 리소스를 한 번 읽으면 닫을 수 있는 항목. `Orca준비작업.MD` §5의 (a)/(b) 갈림길이 이걸로 결정됨(간접 증거는 (a) 쪽에 무게 — 레지스트리에 `LocalHttpServer.LastPidFilePath`가 프로젝트별 pid로 기록되는데 포트는 8080 고정, 브로커 흔적 없음).
2. **오늘 GeometryDefender 원본에서 만든 git 변경사항(work 브랜치, `.gitignore`, `.claude` 문서 수정분)을 아직 커밋하지 않음** — 사용자가 명시적으로 커밋을 요청하면 진행. 그 전까지 워킹 트리에 변경사항이 쌓여있는 상태.
3. **Orca 바탕화면 바로가기가 실제로 `OrcaStart.cmd`를 가리키는지 미확인.**

### 확인 후 결정 필요
- **`C:\Orca` 자체에 git이 없음.** 이제 여기가 GeometryDefender/HouseRulez 문서의 정본이 됐는데 버전관리가 없어서, 실수로 덮어쓰면 복구 수단이 원본 스냅샷뿐이다. 사용자가 여러 PC에서 Orca를 쓸 계획이라고 확인함(2026-08-21) — 정션이 아니라 git 기반 동기화가 맞는 방향이므로, `C:\Orca`를 git 저장소로 만들지 이 시점에 결정할 것.
- GeometryDefender를 `orca repo add`로 등록할지 — git 위생 문제(PAT 노출/detached HEAD/부실한 gitignore)는 2026-08-21에 이미 해결했으므로 이제 등록 가능한 상태.

### 아직 미적용 (적용 우선순위 1위, `Orca준비작업.MD` §7-2)
`verify-compile` / `verify-tables` 같은 기계가 판정하는 성공 조건이 두 프로젝트 어디에도 없다. Unity CLI/Pipeline도 미설치. 이게 있어야 `ParallelWorkContract.MD`의 §3(계약 포맷)·§8(평가 계약)이 실제로 굴러간다 — 지금은 전부 문서 상태로 멈춰있음.

### 참고 — 오늘(2026-08-21) 완료한 것 요약
- UnityLauncher 전체 체인 실행 검증(Unity 실행 → 프로세스 확인)
- MCP for Unity `AutoStartOnLoad` 전역 활성화 (레지스트리 실측 확인) — 스크립트 자동화 시도는 Hot Reload 때문에 실패, 수동 토글로 해결
- 깨진 한글 파일명 2개 복구
- `C:\Orca\Unity\` 구조 신설 — GeometryDefender/HouseRulez `.claude` 사본 관리 체계 확립, `Unity\README.md` 신설
- 에이전트 마스터-사본 구조 확립 + 이름 기반 소프트 락 프로토콜(`{ProjectName}_{ClassName}_class`) 도입, 레인 2개로 실제 검증
- Orca 전체 파일 정리 감사(Opus, 서브에이전트) 진행 후 P0~P3 전부 반영:
  - GD agents 동기화(프로젝트 노하우 보존 병합), AGENT.MD를 Orca 루트로 승격
  - `UNFINISHED.md` 최신본 정리, 죽은 `settings.local.json` 삭제
  - GeometryDefender git 위생 3건 수정(PAT 제거, gitignore, detached HEAD → `work` 브랜치)
  - `Orca준비작업.MD`/`ParallelWorkContract.MD`의 스테일 서술·끊긴 참조 정리
  - `plugin-watch-usage.md`를 GD 전용 문서로 재배치, `.claude.zip` 백업 삭제
