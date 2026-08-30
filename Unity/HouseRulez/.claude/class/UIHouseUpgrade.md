# UIHouseUpgrade

경로: `Assets/Scripts/Title/UIHouseUpgrade.cs`

타이틀의 종족별 영구 메타 업그레이드를 열람하는 공용 `UIPopup`이다.

## 2026-08-29-0 — 읽기 전용 팝업

- `HouseTable` 순서로 종족 탭을 동적 생성한다.
- `PlayerManager.GetSelectedHouseRecord()`의 종족을 기본 탭으로 사용한다.
- 탭 변경은 화면의 `m_SelectedHouse`만 바꾸며 플레이 종족 저장값을 변경하지 않는다.
- 제목, 종족명, 빈 상태는 `StringTable`로 현지화하고 `HouseRecord.AccentColor`를 표시한다.
- 승인된 노드가 없는 현재 단계에서는 `HouseUpgradeEmpty`만 표시한다.
- 1920×1080 중앙 기준으로 열리며 1280×720 Game View에서 잘림 없이 확인했다.
- 구매, 재화, 효과, `RunData` 적용은 없다.

진입점은 `TitleScene.OnClickUpgradeButton()`이며 `UITable`의 `UIHouseUpgrade,Popup,Prefabs/UI/UIHouseUpgrade` 행으로 생성된다.

## 2026-08-29-1 — 노드 목록과 구매

읽기 전용 골격에 실제 노드 줄과 구매를 얹었다.

**추가한 직렬화 필드**
- `m_RoyalText` — 보유 옥새 표시.
- `m_NodeRoot` / `m_NodeTemplate` — 노드 줄 목록과 비활성 템플릿.
- `m_EmptyStatePanel` — 빈 상태 **패널**. 기존 `m_EmptyText`는 패널 안의 텍스트라 텍스트만 끄면 빈 배경 상자가 남는다. 패널을 토글하고 `m_EmptyStatePanel`이 비어 있을 때만 텍스트로 폴백한다.

**동작**
- `BuildNodes()`는 `HouseUpgradeTable.GetNodeKeyList()` 기준으로 줄을 만든다. 전부 파괴·재생성하지 않고 부족분만 `Instantiate`, 초과분은 비활성, 겹치는 인덱스는 `SetData` 재호출하는 증분 갱신이다. `SetSiblingIndex(i)`로 순서를 매번 명시한다.
- 이름·설명은 레벨과 무관하므로 **1레벨 행**에서 읽는다. 0레벨에는 현재 레벨 행이 없어 그대로 읽으면 빈 문구가 된다.
- `ApplyLocalizedText()`는 빈 상태 문구만 세팅하고 **켜고 끄지 않는다**. 여기서 켜두면 노드가 있어도 같이 뜬다.
- 구매 성공 시 `RefreshRoyal()`과 `BuildNodes()`를 **함께** 부른다. 데이터만 갱신하고 화면 갱신을 빠뜨리는 패턴을 피한다.

**검증 (2026-08-29, Play Mode 실측)**
- 6개 탭 전환 시 종족별로 노드 줄 구성이 실제로 달라짐(각 3줄, 목록 상이).
- 옥새 0 → 전 노드 버튼 비활성. 옥새 10 → 활성.
- 스핀 코인 3연타: `3+6` 차감 후 잔액 1, 3번째(비용 12)는 거절되어 Lv2 유지.
- 최대 레벨 도달 시 버튼·비용 숨김, `MaxText` 표시.
- Play 정지 → 재생 후 옥새·레벨 유지.

진입점과 생성 경로는 위 2026-08-29-0 항목과 같다. 노드 줄 컴포넌트는 [[UIHouseUpgradeNode]] 참고.

## 2026-08-29-6 — 7번째 종족 탭이 팝업 밖으로 나가던 문제

윷놀이 추가 뒤에도 탭 템플릿의 `preferredWidth = 195`와 간격 18을 그대로 사용했다. 1260 폭에는 6개가 정확히 들어가지만, 7개는 총 1473이 필요해 마지막 윷놀이 버튼이 팝업 배경을 뚫었다.

`FitHouseButtonsToRoot()`를 추가해 `HouseButtonRoot`의 실제 폭에서 패딩과 전체 간격을 뺀 뒤 현재 종족 수로 나눈 폭을 모든 활성 탭의 `LayoutElement.preferredWidth`에 적용한다. 7종족에서는 약 164.57이며, 이후 종족 수가 다시 바뀌어도 같은 방식으로 맞는다.

Play Mode 1280×720에서 7개 탭 전부가 팝업 안에 균등 배치되는 것을 화면 캡처로 확인했다.
