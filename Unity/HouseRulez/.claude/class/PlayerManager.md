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

## 2026-08-29-1 — 영구 재화와 업그레이드 구매 창구

**추가한 API**
- `royal` — 보유 옥새.
- `AddRoyal(amount)` — 지급. 런 종료 보상이 여기로 들어올 예정이다.
- `GetNextUpgradeRecord(houseKey, nodeKey)` — 다음 레벨 행. `null`이면 최대 레벨이거나 그 종족에 없는 노드다.
- `TryPurchaseHouseUpgrade(houseKey, nodeKey)` — 구매. 다음 레벨 행을 찾아 `PlayerData`에 넘긴다.
- `GetRunConfigBonus(houseKey, targetKey)` — 런 시작값에 더할 메타 보너스.

**구매 원자성**: 비용 차감과 레벨 상승을 `PlayerData.TryPurchaseHouseUpgrade()` **한 호출 안에서** 끝낸다. 매니저가 "차감"과 "레벨업"을 따로 부르면 사이에 실패가 끼었을 때 재화만 사라지거나 레벨만 오른 상태가 저장된다.

**`GetRunConfigBonus`가 테이블을 기준으로 도는 이유**: 저장에 남은 노드가 아니라 `HouseUpgradeTable.GetNodeKeyList()`가 돌려준 노드만 합산한다. 그래서 스키마에서 노드를 빼도 이미 저장된 그 노드의 레벨이 유령 보너스로 새지 않는다 — 실제로 슬롯의 `swap`을 테이블에서 제거한 뒤 저장에 `swap=2`가 남은 상태로 `swapCountMax`가 기본 2로 나오는 것을 Play Mode에서 확인했다.

또한 현재 레벨 행 하나만 더한다. `Value`가 누적값이라 `Lv1..N`을 합치면 값이 배수로 튄다([[HouseUpgradeRecord]]).

검증: `verify-compile` exit 0. Play Mode에서 구매·잔액 부족 거절·저장 유지 실측.
