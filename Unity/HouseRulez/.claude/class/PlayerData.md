# PlayerData / HouseUpgradeProgressData

관련 클래스: SaveData, PlayerManager, HouseUpgradeRecord, OptionData

경로: `Assets/Scripts/Player/PlayerData.cs`

플레이어 진행도 저장본. 런 내부 상태(재화·승급·각인·코어)는 담지 않는다 — 그건 [[RunData]]가 들고 저장하지 않는다.

## 저장 구조

`JsonUtility` 호환을 위해 딕셔너리 대신 리스트를 쓴다.

```text
PlayerData
├─ selectedHouseKey
├─ listUnlockedHouseKey
├─ lastPlayedAt
├─ royal                        (영구 재화, 2026-08-29 추가)
└─ List<HouseUpgradeProgressData>
   ├─ houseKey
   └─ List<HouseUpgradeNodeProgressData>
      ├─ nodeKey
      └─ level
```

## 2026-08-29-0 — 쓰기 경로와 영구 재화

읽기 전용 골격에는 조회만 있고 레벨을 올릴 방법이 아예 없었다(생성자도 setter도 없음). 구매를 붙이며 쓰기 경로를 열었다.

### 추가한 것
- `HouseUpgradeNodeProgressData`: `(nodeKey, level)` 생성자와 `SetLevel()`.
- `HouseUpgradeProgressData`: `(houseKey)` 생성자와 `SetLevel(nodeKey, level)`.
- `PlayerData`: `royal` 필드/프로퍼티, `AddRoyal()`, `TryPurchaseHouseUpgrade()`.

**기본 생성자를 남겨둔다.** 인자 있는 생성자만 두면 `JsonUtility`가 역직렬화 때 그 타입을 만들지 못한다.

### 구매 원자성
`TryPurchaseHouseUpgrade(houseKey, nodeKey, level, cost)`가 잔액 확인 → 차감 → 레벨 기록 → `SetChanged()`를 한 호출에서 끝낸다. 밖에서 "차감"과 "레벨업"을 따로 부르면 사이에 실패가 끼었을 때 재화만 사라지거나 레벨만 오른 상태가 저장된다.

잔액이 모자라면 아무것도 바꾸지 않고 `false`를 돌려준다 — Play Mode에서 옥새 1일 때 비용 12 노드 구매가 거절되고 레벨·잔액 모두 그대로인 것을 확인했다.

### 구 노드가 저장에 남는 경우
테이블에서 노드를 빼도 저장본의 그 레벨은 지워지지 않는다. 다만 효과 합산이 테이블 기준이라 유령 보너스로 새지는 않는다([[PlayerManager]]). 출시 전 저장 마이그레이션이 필요해지면 그때 정리한다.

### 검증
`verify-compile` exit 0. Play Mode에서 구매 → Play 정지 → 재생 후 옥새·레벨 유지 확인.
