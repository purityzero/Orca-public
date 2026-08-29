# UIText

관련 클래스: StringTable, ObservableVariable, TableManager

경로: `Assets/Scripts/UI/UIText.cs`

`StringTable` 키를 들고 스스로 갱신하는 **정적 라벨** 컴포넌트. GeometryDefender의 같은 이름 컴포넌트를 이식했다.

## 2026-08-29-0 — GeometryDefender에서 이식

### 원본과의 차이

| 항목 | GeometryDefender | HouseRulez |
|---|---|---|
| 구독 대상 | `PlayerManager.instance.languageObservable` | `StringTable.LANGUAGE` |
| 최초 갱신 | `OnEnable`만 | `OnEnable` + `RefreshAll()` |
| 널 가드 | 없음 | 테이블/텍스트/키 |

**구독 대상을 바꾼 이유**: HouseRulez는 언어 관찰 값을 `StringTable`이 들고 있다 — 문자열을 읽는 곳과 언어를 보관하는 곳이 같아야 두 벌로 갈라지지 않는다([[StringTable]]).

**`RefreshAll()`을 더한 이유**: `BaseScene.OnSetup()`이 `Start()`에서 도는데 씬 오브젝트의 `OnEnable`은 그보다 **먼저** 돈다. 그 시점엔 `TableManager.init()` 전이라 테이블이 없다. 게다가 저장된 언어가 기본값과 같으면 관찰 값이 바뀌지 않아 알림도 오지 않는다 — 그래서 최초 1회는 씬이 직접 돌려야 한다. `TitleScene`/`InGameScene`의 `OnSetup()`이 테이블·저장 로드 직후 호출한다.

런타임에 생성되는 팝업은 이미 테이블이 준비된 뒤 `OnEnable`이 돌아 `RefreshAll()`이 필요 없다.

### 적용 대상이 아닌 것

이 컴포넌트는 **키가 고정된 정적 라벨 전용**이다. 아래는 기존처럼 코드가 채운다.

- 포맷 인자가 있는 표시 — `HudYear`(연차 01/12), `HudBet`, `ActionSwap`, `ActionBattleSpeed`, `HouseUpgradeLevelFormat`, `HouseUpgradeCostFormat`
- 키가 런타임에 정해지는 표시 — `HouseRecord.NameKey`, `HouseUpgradeRecord.NameKey/DescKey`, 축 이름
- 템플릿을 복제해 여러 개로 늘어나는 목록 항목 — 종족 탭 이름, `HouseLocked`, 노드 줄

이들도 언어 변경에는 반응해야 하므로, 해당 화면이 `StringTable.LANGUAGE`를 직접 구독해 다시 그린다([[UIHouseUpgrade]]).

### 적용한 곳 — 17개

| 위치 | 개수 | 키 |
|---|---|---|
| `TitleScene.unity` | 4 | `TitlePlay` `TitleHouseSelect` `TitleUpgrade` `TitleSetting` |
| `InGameScene.unity` | 5 | `ReelSpin` `HudHome` `HudGold` `HudSpinCoin` `ActionBattleStart` |
| `UISetting.prefab` | 5 | `SettingsTitle` `SettingsLanguage` `SettingsBgm` `SettingsSfx` `SettingsFps` |
| `UIHouseSelect.prefab` | 1 | `HouseSelectTitle` |
| `UIHouseUpgrade.prefab` | 2 | `HouseUpgradeTitle` `HouseUpgradeEmpty` |

대상 오브젝트는 이름으로 찾지 않고 **기존 직렬화 필드가 실제로 가리키던 TMP**에서 역으로 찾아 붙였다. 이름 추측으로 엉뚱한 오브젝트에 붙는 사고를 피하기 위해서다.

붙인 뒤 각 화면의 수동 `GetString()` 호출과, 그로 인해 쓰이지 않게 된 직렬화 필드 13개를 제거했다. `UISetting.ApplyLocalizedText()`는 라벨이 빠지고 값 표시만 남아 `RefreshOptionValueText()`로 이름을 바꿨다.

### 비활성 상태의 동작

꺼져 있는 동안은 `OnDisable`로 구독을 끊으므로 갱신되지 않는다. **켜지는 순간 `OnEnable`이 현재 언어로 다시 채운다** — 4개 언어로 껐다 켜며 실측 확인했다. 화면에 보이지 않는 동안 문구가 옛 언어로 남아 있는 것은 정상이다.

### 검증

`verify-compile` exit 0, `verify-tables` exit 0. Play Mode에서 타이틀 4개·팝업 2개·인게임 5개를 한국어/영어/일본어/중국어로 순환시켜 즉시 갱신 확인.
