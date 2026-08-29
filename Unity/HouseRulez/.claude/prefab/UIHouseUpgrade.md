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

## 2026-08-29-2 — 복제로 딸려온 오염 3건 수정

`UpgradeButton`을 `CloseButton` 복제로 만든 대가를 사용자 플레이에서 받았다. **복제는 컴포넌트 구성을 보장해주지만, 원본의 이벤트와 텍스트까지 함께 가져온다.**

| 증상 | 원인 | 수정 |
|---|---|---|
| 강화 버튼을 누르면 팝업이 닫힘 | `UpgradeButton`의 `m_OnClick`에 `UIHouseUpgrade.OnClickCloseButton` **영구 호출**이 복제돼 있었다 | 영구 호출 배열을 비웠다. 클릭은 `UIHouseUpgradeNode`가 런타임 `AddListener`로만 받는다 |
| 버튼에 `X`가 표시됨 | `UpgradeButton/Label`의 `m_text`가 `"X"`인데 코드가 버튼 텍스트를 세팅하지 않았다 | `m_UpgradeButtonText` 필드를 추가해 `StringTable`의 `HouseUpgradePurchase`로 매번 덮어쓴다 |
| 최대 레벨에 `종족`이 표시됨 | `MaxText`가 `NameText` 복제라 `m_text`가 `"종족"`. 코드는 켜고 끄기만 했다 | `m_MaxObject`(GameObject)를 `m_MaxText`(TMP)로 바꾸고 `HouseUpgradeMaxLevel`로 매번 덮어쓴다 |

`HouseUpgradeMaxLevel` 문구를 `최대`/`MAX`에서 **`MAX LEVEL`**로 바꿨다.

### 왜 앞선 검증이 이걸 못 잡았나 — 두 가지 구멍

1. **표시 문자열을 안 읽었다.** `activeSelf`와 `interactable`만 확인해 "최대 레벨이면 MaxText가 켜진다"까지만 봤다. **켜진 오브젝트에 무엇이 쓰여 있는지**는 확인 대상이 아니었다.
2. **콜백 메서드를 직접 불렀다.** `node.OnClickUpgradeButton()`을 호출했는데, 이건 UnityEvent를 거치지 않으므로 **영구 호출이 실행되지 않는다.** 실제 클릭과 다른 경로를 검증한 것이다.

**앞으로 UI 검증은 이렇게 한다.**
- 상태 플래그가 아니라 **화면에 실제로 들어간 문자열**을 읽는다.
- 버튼은 콜백 메서드가 아니라 **`button.onClick.Invoke()`**로 누른다. 영구 호출까지 함께 도는 유일한 경로다.
- 오브젝트를 복제해 만들었으면 **원본에 딸린 UnityEvent와 텍스트를 반드시 확인**한다. PREFAB.MD가 영구 호출은 읽기 리소스로 확인이 안 되니 저장 후 YAML을 grep하라고 적어둔 이유가 이것이다.

### 재검증 (Play Mode, 실제 `onClick.Invoke`)
- 프리팹 전체 Button 전수 조사: `CloseButton` 1건(`OnClickCloseButton`), `UpgradeButton` 0건, `HouseButtonTemplate` 0건 — 저장된 YAML에서도 동일 확인.
- 체스에서 본거지 3연속 실제 클릭: 창열림 유지, 옥새 98→95→89→77(비용 3/6/12 정확), Lv3 도달 후 버튼·비용 숨김 + `MAX LEVEL` 표시.
- 버튼 라벨 `강화` 표시 확인.

## 2026-08-29-3 — 비용이 안 읽히던 문제

사용자 지적: "밑에 옥새가 얼마나 들어가는지는 1도 안나오네". 확인해 보니 `CostText`는 켜져 있고 화면 안에 있었지만 **내용이 맨숫자 `3` 하나**였다. 바로 옆이 `Lv 0/3`이라 같은 숫자가 반복되는 꼴이었고, 무엇을 치르는지도 드러나지 않았다.

| 항목 | 이전 | 이후 |
|---|---|---|
| 비용 문구 | `3` | `옥새 3` (`HouseUpgradeCostFormat` 신규 키) |
| 비용 색 | 흰색(다른 텍스트와 동일) | 금색 `#F0C24A` |
| 비용 정렬 | Center | Right (버튼 바로 왼쪽에 붙음) |
| 보유 옥새 색 | 흰색 | 금색 `#F0C24A` (비용과 짝) |

### 폭 재배분

`옥새 12`를 담으려면 비용 칸이 넓어야 해 전체를 다시 나눴다.

| 칸 | 이전 | 이후 |
|---|---|---|
| NameText | 260 | 220 |
| DescText | 420 | 340 |
| LevelText | 140 | 140 |
| CostText | 120 | **200** |
| MaxText | 160 | **200** |
| UpgradeButton | 160 | 160 |

일반 줄 합계 `1124`, 최대 레벨 줄 합계 `956` — 둘 다 1160 폭 안이다(패딩 32, 간격 8 포함).

### 측정에서 배운 것 — 레이아웃은 같은 프레임에 안 잡힌다

진단 중 첫 측정에서 자식 폭이 전부 `175`, X 위치가 전부 겹쳐 나와 "가로 레이아웃이 안 먹는다"고 오판할 뻔했다. **팝업을 연 그 프레임에 잰 값이라 레이아웃 리빌드 전이었다.** `Canvas.ForceUpdateCanvases()` + `LayoutRebuilder.ForceRebuildLayoutImmediate()` 후 다시 재니 의도한 폭(259/418/139/120/159)이 그대로 나왔다.

PREFAB.MD의 "패널이 방금 활성화된 직후에는 레이아웃이 아직 반영되지 않는다"가 측정에도 똑같이 적용된다. **UI 레이아웃을 코드로 검증할 땐 반드시 강제 리빌드 후에 잰다.**

### 검증 (Play Mode, 실제 `onClick.Invoke` + 강제 리빌드)

마작 스핀 코인을 Lv3까지 실제 클릭:

```
Lv 0/3  옥새 3   [강화]      royal 77
Lv 1/3  옥새 6   [강화]      royal 74
Lv 2/3  옥새 12  [강화]      royal 68
Lv 3/3  (숨김)   MAX LEVEL   royal 56
```

전 구간 `잘림=아니오`, 차감액이 비용과 일치, 창열림 유지.

## 2026-08-29-4 — 설명 텍스트가 상자 밖으로 삐져나감

사용자 지적(체스 스왑 횟수). 6종족 전 노드를 전수 측정하니 **10건 전부 같은 원인**이었다.

`DescText`는 `HouseButtonTemplate`의 `Locked`("미해금") 복제다. 짧은 라벨이라 원본은 **`textWrappingMode = NoWrap` + `overflowMode = Overflow`**였고, 그 설정이 그대로 따라왔다. 그래서 340 상자에 418이 필요한 문구가 **접히지도 잘리지도 않고 그대로 밖으로 흘렀다.**

### 수정 두 겹

**(1) 문구 단축** — `StringTable`

| 키 | 이전 | 이후 |
|---|---|---|
| `HouseUpgradeHomeHpDesc` | 런 시작 본거지 HP가 늘어난다 | 런 시작 본거지 HP 증가 |
| `HouseUpgradeSpinCoinDesc` | 연차마다 주어지는 스핀 코인이 늘어난다 | 연차당 스핀 코인 증가 |
| `HouseUpgradeSwapDesc` | 연차마다 주어지는 스왑 횟수가 늘어난다 | 연차당 스왑 횟수 증가 |
| `HouseUpgradeStartGoldDesc` | 런 시작 골드가 늘어난다 | 런 시작 골드 증가 |

En/Cn/Jp도 같은 길이로 줄였다.

**(2) 넘침 자체를 불가능하게** — `NodeTemplate`의 텍스트 5개

| 오브젝트 | wrap | overflow |
|---|---|---|
| `DescText` | Normal | Ellipsis |
| `NameText` / `LevelText` / `CostText` / `MaxText` | NoWrap | Ellipsis |

문구만 줄이면 다음에 긴 문자열이나 다른 언어가 들어올 때 같은 증상이 재발한다. **`Overflow`는 어떤 텍스트에도 두지 않는다** — 넘치면 접히거나 말줄임되어야지 밖으로 흐르면 안 된다.

### 복제 오염 3종 정리

`UpgradeButton`/`MaxText`/`DescText` 모두 복제로 만들었고, 셋 다 원본의 무언가를 물고 왔다.

| 무엇이 딸려왔나 | 어디서 |
|---|---|
| UnityEvent 영구 호출 | `CloseButton` → `UpgradeButton` (2026-08-29-2) |
| 텍스트 내용 | `CloseButton`/`NameText` → `UpgradeButton`/`MaxText` (2026-08-29-2) |
| TMP 줄바꿈·넘침 설정 | `Locked` → `DescText` (여기) |

**복제로 오브젝트를 만들면 이벤트·텍스트·컴포넌트 설정 세 가지를 모두 확인한다.** 이름과 위치만 바꿔놓고 넘어가면 원본의 성격이 계속 남는다.

### 재검증 — 전수 자동 판정

6종족 × 각 3노드의 모든 텍스트에 대해 다음을 기계 판정했고 **문제 0건**이다.

- `preferredWidth > rect.width` (가로 넘침)
- `preferredHeight > rect.height` (세로 넘침)
- 자식의 world corner가 행 밖으로 벗어남
- 자식의 world corner가 패널 밖으로 벗어남

**QA 교훈**: 이전 검증은 "내가 의심한 항목"만 봤다. 전 종족 × 전 노드 × 전 텍스트를 **기계 판정으로 훑었어야** 했다 — 한 종족만 눈으로 보면 다른 종족의 같은 결함이 그대로 남는다.

## 2026-08-29-5 — 우측 칸 정렬과 영어 이름 잘림

### MAX LEVEL과 비용이 줄마다 어긋나던 이유

최대 레벨 줄은 `CostText`를 `SetActive(false)`로 껐다. 레이아웃 그룹은 **비활성 자식을 아예 세지 않으므로** 그 폭(200)과 간격(8)만큼 오른쪽 칸이 통째로 당겨졌다. 게다가 `MaxText`는 폭 200·Center, `UpgradeButton`은 폭 160이라 기준선도 달랐다.

**수정**
- `CostText`는 최대 레벨에서도 **끄지 않고 문자열만 비운다.** 칸이 유지되어 열이 고정된다.
- `MaxText` 폭을 버튼과 같은 **160**으로 맞추고 자식 순서를 `UpgradeButton` **뒤**로 옮겼다. 둘은 배타이므로 항상 같은 슬롯을 차지한다.

결과: 일반 줄과 최대 줄의 합계가 둘 다 `1124`, 우측 칸 위치가 `@1028(w160)`으로 동일하다.

| 칸 | 시작 X | 폭 |
|---|---|---|
| NameText | 126 | 220 |
| DescText | 414 | 340 |
| LevelText | 662 | 140 |
| CostText | 840 | 200 |
| UpgradeButton / MaxText | **1028** | **160** |

### 영어 이름 잘림

`Stronghold Reinforcement`가 360으로 220 칸을 넘어 4종족에서 말줄임됐다(`Ellipsis` 덕에 흐르지는 않았다). `Stronghold HP`로 줄였다.

**한국어만 보고 끝내면 안 된다** — 같은 칸에 4개 언어가 들어간다.

### 전수 판정 — 4언어 × 6종족, 문제 0건

판정 항목: 가로/세로 넘침, 행 이탈, 패널 이탈, **줄 간 우측 칸 위치 일치**.

```
[Korean]  옥새 42
  본거지 보강    런 시작 본거지 HP 증가   Lv 2/2              MAX LEVEL
  스핀 코인      연차당 스핀 코인 증가     Lv 3/3              MAX LEVEL
  스왑 횟수      연차당 스왑 횟수 증가     Lv 0/3   옥새 3      [강화]

[English] Royal Seal 42
  Stronghold HP  Starting stronghold HP   Lv 2/2              MAX LEVEL
  Spin Coins     Spin coins per year      Lv 3/3              MAX LEVEL
  Swap Count     Swaps per year           Lv 0/3   3 Seals    [Upgrade]
```
