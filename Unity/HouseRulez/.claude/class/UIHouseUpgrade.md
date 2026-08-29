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
