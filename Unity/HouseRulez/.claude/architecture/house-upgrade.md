# 종족별 영구 메타 업그레이드 기술 설계

작성일: 2026-08-28
구현 검증일: 2026-08-29
기획 정본: `../design/upgrade-system.html`

## 구현 경계

현재 단계는 종족별 영구 메타 업그레이드의 **읽기 전용 최소 수직 슬라이스**다.

- 타이틀 `UpgradeButton`은 `UIManager.Get<UIHouseUpgrade>()`로 공용 팝업을 연다.
- 팝업은 `HouseTable` 순서대로 6개 종족 탭을 만들고 `PlayerManager.GetSelectedHouseRecord()`를 기본 탭으로 사용한다.
- 탭 전환은 열람 대상만 바꾸며 `PlayerManager.SetSelectedHouse()`를 호출하지 않는다.
- `HouseUpgradeTable`과 `PlayerData`에 `HouseKey` 기반 데이터/진행 저장 골격을 둔다.
- 승인된 노드가 없어 CSV는 헤더만 두고 화면은 현지화된 빈 상태를 표시한다.
- 구매, 재화, 노드 효과, `RunData` modifier 스냅샷은 만들지 않는다.

## 데이터 계약

`HouseUpgradeRecord`의 필드는 다음과 같다.

```text
Id, Key, HouseKey, NameKey, DescKey, Level, EffectType, TargetKey,
Value, CostType, CostValue, PrerequisiteKey, SortOrder, IconPath
```

- `Key`는 레벨이 변해도 유지되는 안정적인 노드 키다.
- 행 유일성은 `(HouseKey, Key, Level)` 조합으로 보장한다.
- `PrerequisiteKey`는 같은 종족의 노드 `Key`를 가리킨다.
- `GetListByHouseKey()`는 새 리스트를 반환하고 `SortOrder → Key → Level` 순으로 정렬한다.
- `EffectType`과 `CostType`은 승인된 enum이 없어 현재 string 스키마만 둔다.

저장 구조는 Unity `JsonUtility` 호환을 위해 리스트를 사용한다.

```text
PlayerData
└─ List<HouseUpgradeProgressData>
   ├─ houseKey
   └─ List<HouseUpgradeNodeProgressData>
      ├─ nodeKey
      └─ level
```

구버전 저장에서 새 리스트가 null이어도 조회는 0레벨을 반환한다. 구매가 없으므로 외부 변경 API와 `SetChanged()` 경로는 아직 열지 않는다.

## UI 계약

- `UIHouseUpgrade : UIPopup`
- `UIHouseUpgradeHouseButton`은 실제 클릭 컴포넌트로 `UIButton`을 사용한다.
- 컴포넌트명, 프리팹명, `UITable.UIName`은 모두 `UIHouseUpgrade`다.
- 루트 기준 해상도는 1920×1080, 중앙 패널은 1440×880이다.
- 종족별 프리팹을 복제하지 않고 비활성 탭 템플릿을 런타임에 늘린다.
- 새 이미지나 음원을 추가하지 않는다. 현재 `SoundTable`에 유효한 버튼 효과음 키가 없으므로 신규 버튼의 SFX 키는 비워 오류를 방지한다.
- 구매 버튼, 비용, 재화, 노드 좌표/연결선은 없다.

## 승인 게이트 — 2026-08-29 해소

M-2~M-6과 원자성이 사용자 승인으로 확정됐다. 남은 항목은 적용 순서 하나뿐이다.

| 항목 | 결정 |
|---|---|
| M-2 형태 | **선형 단계 목록**. 트리·분기 없음, `PrerequisiteKey`는 비워 둔다. 좌표 데이터도 만들지 않는다 |
| M-3 재화 | **단일 공용 재화 "옥새"**(`eCurrencyType.Royal`). 런 종료 시 `도달 연차 × 1`, 12연차 완주 `+6`. 패배해도 지급 |
| M-4 효과 | **런 시작값 4축만**. 종족마다 그중 3축만 갖는다 |
| M-5 재분배 | **재분배·초기화 없음**(구매는 확정). 종족별 최대 레벨 차이 허용. 새 종족은 전원 0레벨 |
| M-6 혼혈 | **현재 플레이 종족의 진행**을 쓴다 |
| 원자성 | 비용 차감과 레벨 상승을 `PlayerData.TryPurchaseHouseUpgrade()` 한 호출에서 처리 |

**M-6이 사실상 자동으로 정해진 이유**: 이번 범위의 효과가 유닛이 아니라 런에 붙는다(본거지 HP·코인·스왑·골드). 유닛별 `HouseKey`를 따질 대상 자체가 없어 "유닛 원래 종족의 진행"은 지금 구현이 불가능하다. 유닛 단위 효과가 생기면 M-6을 다시 연다.

**아직 안 정한 것**: 메타 효과 / 등급 배수 / 각인의 적용 순서. 등급·각인이 없어 순서를 정할 대상이 없다.

## 구현 경계 — 2026-08-29 갱신

읽기 전용 골격에 실제 노드·재화·구매·런 반영을 얹었다.

- 노드 4종 `home_hp` / `spin_coin` / `swap` / `start_gold` → 각각 `GameConfigTable`의 `HomeHpMax` / `SpinCoinPerYear` / `SwapCountPerYear` / `RunStartGold`에 가산.
- `EffectType`은 `RunConfigAdd` 한 종류. `TargetKey`를 `GameConfigTable` 키 이름과 같게 두어 매핑 테이블을 없앴다.
- `Value`는 **그 레벨의 총 증가량**(누적값). 호출부가 `Lv1..N`을 합산하지 않는다.
- 종족마다 4축 중 **3축만** 보유. 전 종족 8레벨 / 8행 / 51옥새로 균일하고 배분만 다르다.
- `RunData.Init()`에서 **한 번만** 스냅샷 반영. 런 도중 산 것은 진행 중인 런에 소급되지 않는다.
- `RunData.GetRoyalReward()`는 만들었으나 **호출부가 없다** — 런 종료 단계 자체가 없다.

### 종족별 노드 배분

| 종족 | 본거지 | 코인 | 스왑 | 자금 | 없는 축 |
|---|---|---|---|---|---|
| slot | 2 | 3 | — | 3 | 스왑 |
| chess | 3 | — | 3 | 2 | 코인 |
| janggi | 3 | 2 | 3 | — | 자금 |
| hwatu | — | 2 | 3 | 3 | 본거지 |
| poker | — | 3 | 2 | 3 | 본거지 |
| mahjong | 2 | 3 | 3 | — | 자금 |

**처음엔 4축을 전 종족 공통으로 만들었다가 되돌렸다.** 노드 이름·설명이 6종족 전부 같아 탭을 바꿔도 `Lv 0/N`의 `N`만 변해 화면상 아무것도 안 바뀌는 것처럼 보였다(사용자 지적). 축을 빼서 목록 자체가 달라지게 했다.

### 의도적으로 제외한 것

`HoldMax`(슬롯 홀드 칸)·판돈 배율(화투)·`PoolCount`는 **강화 대상에서 뺐다.** 종족 고유 기구를 영구 강화하면 GDD 밸런스가 직접 바뀌는데 시뮬레이션 수단이 없다 — 기획 정본 기준 슬롯 홀드 2→3만 해도 연차 14.23에서 22.91 쪽으로 밀린다. 유닛·전투가 생겨 실측이 가능해진 뒤 M-4 2차로 검토한다.

### 남은 위험

- **스핀 코인 3→6은 스핀 횟수 2배로 4축 중 가장 강하다.** 전투·판정이 없어 실측이 불가능하니 초기값으로 두고, 판정기가 붙은 뒤 재조정 대상이다.
- 노드가 4축뿐이라 종족 정체성이 "무엇을 못 올리나"로만 갈린다. 유닛 시스템 이후 종족 고유 노드를 얹는 것을 전제한다.

## 검증

2026-08-29에 다음을 통과했다.

- `unity command verify-compile`: exit 0
- `unity command verify-tables`: exit 0, 10개 테이블
- Unity Console error 0
- Play Mode에서 6개 탭 생성, 탭 전환 후 저장 종족 불변, 빈 상태, 닫기 확인
- 1280×720 Game View에서 중앙 배치 및 잘림 없음

### 2026-08-29-1 — 노드·구매·런 반영 실측

- `unity command verify-compile`: exit 0
- `unity command verify-tables`: exit 0, 10개 테이블
- `HouseUpgradeTable` 48행 로드, 종족별 3노드 / 8행 / 51옥새 균일 확인
- 6개 탭을 실제 버튼 클릭으로 순회 — 종족마다 노드 목록이 다르게 표시됨
- 옥새 0 → 전 노드 버튼 비활성, 옥새 10 → 활성
- 스핀 코인 3연타: `3+6` 차감 후 잔액 1, 3번째(비용 12)는 거절되고 Lv2 유지
- 최대 레벨 도달 시 버튼·비용 숨김, `MaxText` 표시
- Play 정지 → 재생 후 옥새·레벨 유지
- `RunData`: 슬롯 `home_hp` Lv1 / `spin_coin` Lv2 상태에서 `homeHpMax=9`, `spinCoinMax=5`, `gold=0`
- 테이블에서 뺀 노드가 저장에 남아도(`slot swap=2`) 보너스로 새지 않음 — `swapCountMax=2` 확인

**미검증**: 사람 눈으로 본 배치·가독성·잘림. 노드 줄이 1160×300 영역에 3줄로 들어가는 계산은 맞지만 실제로 본 적은 없다.
