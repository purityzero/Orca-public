# 미완료 작업

## 2026-08-29-3 — 윷놀이 UI QA 수정

- 회전 시 윷 심볼이 튀어나가거나 사라져 보이던 원인은 각 PNG가 `SpriteMode.Multiple` 자동 슬라이스로 서로 다른 타이트 사각형을 사용한 것이었다. 윷놀이 normal/blur/x8 18개를 `SpriteMode.Single`로 통일해 32×32 전체 캔버스와 중앙 피벗을 유지했다.
- 업그레이드의 7번째 윷놀이 탭은 6종족 전용 고정 폭 때문에 팝업 밖으로 213px 넘쳤다. 현재 루트 폭을 종족 수로 균등 분배하도록 `UIHouseUpgrade`를 수정했다.
- 1280×720 Play Mode에서 윷놀이 선택 상태의 정지·회전 중·정지 후 슬롯 화면과 업그레이드 팝업을 캡처해 확인했다. 회전 중 9개 심볼 모두 릴 마스크 안, 7개 탭 모두 팝업 안에 있었다.
- `verify-compile`, `verify-tables` 재검증 완료. QA용 임시 진입 코드는 제거했다.

### 2026-08-30 이어받아 마무리한 것

**빠져 있던 것: 윷놀이의 업그레이드 노드가 0행이었다.** 다른 6종족은 각 8행인데 윷만 비어 있어, 업그레이드 팝업에서 윷 탭만 빈 상태로 떴다. `HouseTable`·`StringTable`·아트·탭 폭은 다 맞춰져 있었는데 `HouseUpgradeTable`만 안 채워진 상태였다.

- 윷 배분 **본거지 — / 코인 3 / 스왑 3 / 자금 2** (8행 추가, 총 56행). 윷·모가 나오면 한 번 더 던지고 말을 업거나 지름길로 옮기는 종족이라 코인·스왑을 최대까지 열었다. 대신 본거지 보강이 없다.
- 7종족 전부 **노드 3종 / 8행 / 8레벨 / 51옥새**로 균일함을 기계 확인했다.
- 기획 정본(`design/upgrade-system.html`), 설계(`architecture/house-upgrade.md`), `class/HouseUpgradeRecord.md`의 배분표에 윷 행을 반영했다.

**검증**: `verify-tables` exit 0(10개 테이블), `verify-compile` exit 0.

⚠️ **이번 세션은 UnityMCP 미연결이라 Play Mode 실측을 못 했다.** 윷 탭에 노드 3줄이 실제로 뜨는지, 구매가 되는지는 **미검증**이다. 에디터를 먼저 띄운 새 세션에서 확인해야 한다. (`unity command verify-*`는 MCP와 별개 경로라 미연결 상태에서도 동작한다 — 이번에 확인)

**배분은 기획 판단이라 바뀔 수 있다.** CSV 8행만 고치면 되므로 다른 배분을 원하면 말해달라.

## 2026-08-29-2 — 로컬라이제이션을 UIText 컴포넌트로 전환 (같은 브랜치)

GeometryDefender의 `UIText`를 이식해 정적 라벨 17개를 컴포넌트 방식으로 바꿨다. 화면마다 흩어져 있던 수동 `GetString()` 호출과 직렬화 필드 13개를 제거했다.

- `StringTable.LANGUAGE`(관찰 값)를 구독해 언어 변경 시 스스로 갱신한다.
- 씬 오브젝트는 `OnEnable`이 테이블 로드보다 먼저 돌아 `UIText.RefreshAll()`로 최초 1회를 채운다.
- 포맷 인자가 있거나 키가 런타임에 정해지는 표시는 대상이 아니다 — 해당 화면이 직접 구독해 다시 그린다.

**함께 고친 공용 버그**: `ObservableVariable.NotifyObservers`가 원본 리스트를 순회해, 알림 도중 UI가 켜지고 꺼지면 `Collection was modified`로 **알림이 중간에 끊겼다.** 사본 순회로 수정했다.

**검증**: `verify-compile`/`verify-tables` exit 0. 타이틀 4 + 인게임 5 + 팝업 8을 4개 언어로 순환시켜 즉시 갱신 확인. 비활성 라벨이 켜질 때 현재 언어로 채워지는 것도 실측.

**남은 것**: 사람 눈 확인. `UISetting`/`TitleScene`의 **값 표시**(언어명·FPS 값)는 여전히 수동 갱신이다 — 정적 라벨만 옮겼다.

## 2026-08-29-1 — 종족별 업그레이드 콘텐츠 (브랜치 `work/2026-08-29-upgrade-content`, 커밋 없음)

M-2~M-6을 사용자 승인으로 확정하고 노드 데이터·영구 재화·구매·런 반영까지 구현했다. **기계 검증과 Play Mode 실측은 통과했고, 사람 눈 확인만 남았다.**

**확정된 결정** (기획 정본 `.claude/design/upgrade-system.html`, 설계 `.claude/architecture/house-upgrade.md`)
- M-2 선형 단계 목록 / M-3 단일 공용 재화 "옥새" / M-4 런 시작값 4축 중 종족별 3축 / M-5 재분배 없음 / M-6 현재 플레이 종족

**구현**
- `eCurrencyType.Royal`, `PlayerData.royal`·`TryPurchaseHouseUpgrade()`(원자적), `PlayerManager` 구매·보너스 API
- `HouseUpgradeTable.csv` 48행(종족당 3노드 / 8레벨 / 8행 / 51옥새 균일), `GameConfigTable` 옥새 키 2개, `StringTable` 12행
- `RunData.Init()`에서 메타 스냅샷 1회 반영, `UIHouseUpgradeNode` 신규 + 팝업 프리팹에 노드 목록·옥새 표시 추가

**검증 통과**: `verify-compile` exit 0, `verify-tables` exit 0(10개), Play Mode에서 탭별 노드 구성 상이·구매·잔액 부족 거절·최대 레벨 표시·저장 유지·`RunData` 반영·유령 보너스 없음 실측.

**남은 것**
- **사람 눈 확인** — 노드 줄 배치·가독성·잘림을 아직 본 적이 없다. 통과해야 `main` 합류.
- `RunData.GetRoyalReward()`에 **호출부가 없다** — 런 종료 단계 자체가 없어서다. 종료 처리가 생기면 `PlayerManager.AddRoyal()`로 연결(코드에 `TODO`).
- 스핀 코인 3→6이 4축 중 가장 강한데 전투·판정이 없어 실측 불가. 판정기가 붙은 뒤 재조정 대상.
- 종족 고유 기구(`HoldMax`·판돈·`PoolCount`)는 밸런스 시뮬레이션 수단이 없어 이번 범위에서 제외했다. 유닛 시스템 이후 M-4 2차.
- 테이블에서 뺀 노드가 저장본에 남는다(개발 중 저장본 한정, 유령 보너스는 안 생김). 출시 전 마이그레이션 필요 여부 판단.

**작업 메모**: `manage_gameobject`가 비활성 오브젝트를 못 잡는다(`by_path`·`by_id` 둘 다). 비활성 템플릿 내부 작업은 `execute_code`로 프리팹 스테이지를 직접 잡는 쪽이 왕복이 훨씬 적다 — 상세는 `.claude/prefab/UIHouseUpgrade.md`.

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
