# PlayerManager / PlayerData

경로: `Assets/Scripts/Player/PlayerManager.cs`, `Assets/Scripts/Player/PlayerData.cs`

플레이어 저장 데이터의 단일 창구다.

## 2026-08-29-0 — 종족별 업그레이드 진행 읽기 골격

- `PlayerData`에 `HouseUpgradeProgressData`와 `HouseUpgradeNodeProgressData`의 직렬화 리스트를 추가했다.
- 진행은 `houseKey/nodeKey`별 레벨로 저장하며 구버전 저장에서 리스트가 null이면 0을 반환한다.
- `PlayerManager.GetHouseUpgradeLevel()` 읽기 API만 공개했다.
- 구매·재화가 확정되지 않아 쓰기 API와 `SetChanged()` 경로는 만들지 않았다.
- 런 내부 승급·각인·코어는 영구 저장 대상에 넣지 않았다.

Play Mode에서 업그레이드 열람 탭을 바꿔도 `selectedHouseKey`가 유지되는 것을 확인했다.
