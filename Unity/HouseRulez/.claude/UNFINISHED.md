# 미완료 작업

## 2026-08-29-0 — Git 마무리 상태 (브랜치 정리 완료)

HouseRules `main` 병합 커밋 `d6ab769`까지 원격 푸시 완료. 병합 후에도 `verify-compile`과 `verify-tables`(10개) 통과를 확인했다.
Orca 정본 문서는 `5b17beb`로 별도 커밋해 푸시했다(사용자 미커밋 변경인 루트 `CLAUDE.md`는 제외).

`main`에 병합되고 푸시까지 끝난 작업 브랜치 4개를 로컬·원격 모두 삭제했다 — `work/2026-08-28-house-upgrade`(`67bd379`),
`work/2026-08-28-qa-toolbar-api`(`153f387`), `work/2026-08-28-settings-popup`(`8f09cb7`), `work/2026-08-28-unity-pipeline`(`f0d0913`).

**남아 있는 것**
- `work/2026-08-28-ingame-canvas-fit` — **미병합**, 커밋 1개(`eac6d6e` InGame Canvas 레이아웃을 1920x1080에 맞춤).
  사람 눈 확인 전이라 로컬·원격 모두 유지한다.
- HouseRules 작업 트리 미커밋 — `ProjectSettings.asset`의 `runInBackground: 0 → 1` 한 줄.
  `Assets/font/*.asset` 2개는 내용 차이 없이 CRLF 정규화 경고만 뜨는 것이다.

## 2026-08-28-4 — 기획 문서 HTML 정본 전환

완료. HouseRulez의 기존 `.claude/design/*.md` 기획 문서 6개를 UTF-8 단독 HTML로 교체했다. 문서마다 목차, heading anchor, 반응형 표/코드블록, 인쇄 스타일을 적용했고 기획 문서 간 링크와 역할 에이전트의 산출물 규칙도 `.html` 기준으로 변경했다.

## 2026-08-28-3 — 종족별 업그레이드 시스템

읽기 전용 최소 수직 슬라이스 완료. `HouseUpgradeTable`/헤더 전용 CSV, `HouseKey/nodeKey`별 영구 진행 저장 골격, 공용 `UIHouseUpgrade` 팝업, `UITable`/`StringTable`, 타이틀 버튼 연결을 구현했다. 화면에는 6개 종족 탭과 현지화된 빈 상태가 보이며, 열람 탭을 바꿔도 플레이 종족 저장값은 바뀌지 않는다.

2026-08-29에 `verify-compile`, `verify-tables`(10개), Unity Console error 0, Play Mode 실제 버튼/탭/닫기, 1280×720 화면 배치를 확인했다. 새 음원은 추가하지 않았고 현재 유효한 클릭 SFX 키가 없어 신규 버튼의 SFX 키는 비워 두었다.

실제 구매 가능한 콘텐츠는 아직 미완료다. 다음 구현 전에 M-2 트리 형태, M-3 재화/획득 경로, M-4 종족별 효과와 수치, M-5 재분배/최대 진행, M-6 혼혈 적용 규칙, 구매 저장 원자성과 효과 적용 순서를 확정해야 한다. 기존 GDD의 "초기 빌드 영구 강화 트리 제외" 문구도 최신 결정에 맞춰 개정 대상이다.

## 2026-08-28-2 — 설정/종족 선택 팝업 UITable 전환

완료. `UISetting`과 `UIHouseSelect`를 `UITable`/`UIManager` 경로로 등록하고, BGM·SFX 볼륨 옵션을 연결했다. GeometryDefender 음원 파일은 이식하지 않았다. Play Mode 표시·상호작용과 컴파일/테이블 검증을 완료했다.
