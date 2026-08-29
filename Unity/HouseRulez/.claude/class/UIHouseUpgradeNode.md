# UIHouseUpgradeNode

관련 클래스: UIHouseUpgrade, UIButton, HouseUpgradeRecord, PlayerManager

경로: `Assets/Scripts/Title/UIHouseUpgradeNode.cs`

업그레이드 팝업의 노드 한 줄. 이름·설명·현재 레벨·비용과 강화 버튼을 든다.

## 2026-08-29-0 — 신규

### 직렬화 필드

| 필드 | 대상 |
|---|---|
| `m_NameText` | 노드 이름 |
| `m_DescText` | 효과 설명 |
| `m_LevelText` | `Lv {현재}/{최대}` |
| `m_CostText` | 다음 레벨 비용(옥새) |
| `m_UpgradeButton` | `UIButton` — 강화 |
| `m_MaxObject` | 최대 레벨 표시 오브젝트 |

### 비활성 사유를 뭉치지 않는다

PREFAB.MD의 "비활성 사유가 여러 개인 화면은 사유별 오브젝트를 분리한다"를 따른다.

- **최대 레벨** → 버튼과 비용을 `SetActive(false)`, `m_MaxObject`를 켠다.
- **옥새 부족** → 버튼은 보이되 `interactable = false`. 비용은 계속 보여야 얼마가 모자란지 안다.

두 사유를 "버튼 회색" 하나로 합치면 최대치인지 돈이 없는지 화면에서 구분되지 않는다.

### 클릭 경로

`SetData()`가 `onClick`에 `RemoveListener` 후 `AddListener`한다 — 증분 갱신으로 같은 인스턴스가 재사용되므로 등록만 하면 리스너가 계속 쌓인다.

`OnClickUpgradeButton()`은 노드 키만 콜백으로 올려보내고 구매 판단은 하지 않는다. 실제 구매는 `PlayerManager.TryPurchaseHouseUpgrade()`가 처리한다.

### 검증

`verify-compile` exit 0. Play Mode에서 구매·잔액 부족 거절·최대 레벨 표시 실측 확인.
