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

## 2026-08-29-1 — 문구를 코드에서 채운다

`m_MaxObject`(GameObject)를 **`m_MaxText`(TextMeshProUGUI)**로 바꾸고 **`m_UpgradeButtonText`**를 추가했다. `SetData()`가 `_purchaseLabel`과 `_maxLabel`을 받아 매번 넣는다.

**프리팹에 남은 텍스트를 믿지 않는다.** 이 오브젝트들은 다른 오브젝트를 복제해 만들었기 때문에, 코드가 손대지 않으면 복제 원본의 문구가 그대로 화면에 남는다 — 실제로 강화 버튼에 `X`, 최대 레벨 자리에 `종족`이 떴다. 현지화 대상이기도 하므로 문구는 전부 `StringTable`에서 온다.

토글만 하고 문구를 안 넣는 필드는 이제 없다.

검증: Play Mode에서 `onClick.Invoke()`로 실제 클릭해 버튼 `강화` / 최대 시 `MAX LEVEL` 표시 확인.

## 2026-08-29-2 — 비용을 포맷된 문자열로 받는다

`SetData()`의 `int _cost`를 **`string _costLabel`**로 바꿨다. 노드는 숫자를 받아 스스로 문자열로 만들지 않고, 이미 현지화·포맷된 문구를 받아 그대로 넣는다.

맨숫자 `3`만 표시하니 옆의 `Lv 0/3`과 섞여 비용인지 알아볼 수 없다는 지적이 있었다. 포맷을 노드가 들고 있으면 언어별 어순(`옥새 {0}` vs `{0} Seals`)을 처리할 수 없으므로 `StringTable`을 아는 [[UIHouseUpgrade]]가 만들어 넘긴다.
