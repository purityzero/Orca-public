# UIHouseUpgrade (prefab)

관련 스크립트: UIHouseUpgrade, UIHouseUpgradeHouseButton, UIHouseUpgradeNode, UIButton

경로: `Assets/Resources/Prefabs/UI/UIHouseUpgrade.prefab`

종족별 영구 메타 업그레이드 팝업이다. `UIManager`가 `PopupCanvas` 아래에 생성한다.

## 구조 (2026-08-29-1 기준)

```text
UIHouseUpgrade                        (RectTransform, UIHouseUpgrade)
├─ DimmedBackground                   (Image)
└─ Panel (1440×880, 중앙)             (Image, Outline)
   ├─ TitleText                       (TextMeshProUGUI)        y=350
   ├─ CloseButton                     (Image, UIButton)        (645, 350)
   │  └─ Label                        (TextMeshProUGUI)
   ├─ HouseButtonRoot                 (HorizontalLayoutGroup)  y=230, 1260×104
   │  └─ HouseButtonTemplate          (비활성 템플릿, Image, LayoutElement, UIButton, UIHouseUpgradeHouseButton)
   │     ├─ Accent                    (Image)
   │     ├─ Name                      (TextMeshProUGUI)
   │     └─ Locked                    (TextMeshProUGUI)
   ├─ SelectedHouseNameText           (TextMeshProUGUI)        y=70, 800×90
   ├─ RoyalText                       (TextMeshProUGUI)        (500, 70), 400×60, Right
   ├─ Accent                          (Image)                  y=14, 320×10
   ├─ EmptyStatePanel                 (Image)                  y=-190, 1160×300
   │  └─ EmptyText                    (TextMeshProUGUI)
   └─ NodeRoot                        (VerticalLayoutGroup)    y=-190, 1160×300
      └─ NodeTemplate                 (비활성 템플릿, Image, LayoutElement, HorizontalLayoutGroup, UIHouseUpgradeNode)
         ├─ NameText                  (TextMeshProUGUI, 폭 260, Left)
         ├─ DescText                  (TextMeshProUGUI, 폭 420, Left)
         ├─ LevelText                 (TextMeshProUGUI, 폭 140, Center)
         ├─ CostText                  (TextMeshProUGUI, 폭 120, Center)
         ├─ MaxText                   (TextMeshProUGUI, 폭 160, Center)
         └─ UpgradeButton             (Image, UIButton, LayoutElement 폭 160)
            └─ Label                  (TextMeshProUGUI, 앵커 스트레치)
```

`NodeRoot`와 `EmptyStatePanel`은 **같은 영역을 공유한다.** 노드가 있으면 `EmptyStatePanel`이 꺼지고, 없으면 켜진다. 둘이 동시에 보이는 상태는 없다.

`MaxText`와 `UpgradeButton`도 배타다 — 최대 레벨이면 버튼·비용이 꺼지고 `MaxText`가 켜진다. 그래서 한 줄의 가로 합은 항상 1100 안쪽이라 1160 폭에 들어간다.

## 2026-08-29-1 — 노드 목록·옥새 표시 추가

### 이전 기록 정정
2026-08-29-0 기록은 계층을 `Panel/EmptyText`로 적었으나 **실제로는 `Panel/EmptyStatePanel/EmptyText`**다. `CloseButton/Label`과 `HouseButtonTemplate`의 자식 3개도 빠져 있었다. 위 트리가 실제 상태다.

이 차이가 실제 문제를 만들었다 — `m_EmptyText`(텍스트)만 끄면 배경 패널이 그대로 남는다. 그래서 `UIHouseUpgrade`에 `m_EmptyStatePanel` 필드를 추가해 패널을 토글한다.

### 추가한 오브젝트

| 오브젝트 | 만든 방법 | 비고 |
|---|---|---|
| `RoyalText` | `SelectedHouseNameText` 복제 | 위치·정렬만 변경 |
| `NodeRoot` | `HouseButtonRoot` 복제 | `HorizontalLayoutGroup` 제거 후 `VerticalLayoutGroup` 추가 |
| `NodeTemplate` | 복제로 딸려온 `HouseButtonTemplate` 개조 | `UIButton`·`UIHouseUpgradeHouseButton` 제거, `UIHouseUpgradeNode`·`HorizontalLayoutGroup` 추가 |
| `NameText`/`DescText` | 기존 `Name`/`Locked` 이름 변경 | |
| `LevelText`/`CostText`/`MaxText` | `NameText` 복제 | |
| `UpgradeButton` | `CloseButton` 복제 | `Label` 앵커를 스트레치로 |

**신규 이미지·음원 에셋을 추가하지 않았다.** 전부 기존 오브젝트 복제라 컴포넌트 구성과 머티리얼·폰트가 보장된다.

### 직렬화 참조 (저장 후 YAML 대조 완료)

`UIHouseUpgrade`: `m_TitleText`, `m_SelectedHouseNameText`, `m_EmptyText`, `m_EmptyStatePanel`, `m_AccentImage`, `m_HouseButtonRoot`, `m_HouseButtonTemplate`, `m_RoyalText`, `m_NodeRoot`, `m_NodeTemplate` — 10개 전부 연결됨.

`UIHouseUpgradeNode`: `m_NameText`, `m_DescText`, `m_LevelText`, `m_CostText`, `m_UpgradeButton`, `m_MaxObject` — 6개 전부 연결됨.

`NodeTemplate`은 `activeSelf = false`로 저장했다. 활성 상태로 저장하면 팝업을 열 때 빈 줄이 하나 더 보인다.

### 작업 경로 메모 (다음에 시간 아끼려면)

MCP는 연결돼 있었지만 **`manage_gameobject`가 비활성 오브젝트를 아예 못 잡는다** — `by_path`도 `by_id`도 "not found"다. `manage_components`는 정수 instance ID로 잘 잡힌다. 비활성 템플릿 안을 만지는 작업은 `execute_code`로 `PrefabStageUtility.GetCurrentPrefabStage()`를 잡아 직접 다루는 쪽이 왕복이 훨씬 적다.

`execute_code`는 **메서드 본문으로 컴파일되어 `using` 선언을 못 쓴다.** `UnityEngine.UI.LayoutElement`처럼 전부 정규화해서 적어야 한다.

프리팹 스테이지 안의 경로에는 `Canvas (Environment)/` 접두사가 붙는다.

### 검증

- `verify-compile` exit 0, `verify-tables` exit 0(10개 테이블).
- 저장된 `.prefab` YAML에서 신규 오브젝트 9개와 `UIHouseUpgradeNode` 컴포넌트 존재를 grep으로 대조.
- Play Mode: 6개 탭 전환 시 종족별 노드 구성 상이, 구매·잔액 부족 거절·최대 레벨 표시·저장 유지 실측.
- **사람 눈 확인은 아직 안 받았다** — 배치·가독성·잘림은 미검증이다.
