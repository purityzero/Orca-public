# HouseUpgradeRecord / HouseUpgradeTable

경로: `Assets/Scripts/Table/HouseUpgradeRecord.cs`

종족별 영구 메타 업그레이드의 정적 CSV 스키마와 조회 테이블이다. 모든 종족은 공용 테이블 하나를 사용하고 `HouseKey`로 분리한다.

## 2026-08-29-0 — 읽기 전용 데이터 골격

- `HouseUpgradeRecord`에 노드 키, 종족 키, 단계, 효과/비용 자리, 선행 키, 정렬 순서, 아이콘 경로를 정의했다.
- `Key`는 안정적인 노드 키이며 행 유일성은 `(HouseKey, Key, Level)` 조합이다.
- `HouseUpgradeTable.GetListByHouseKey()`는 원본 목록을 노출하지 않고 `SortOrder → Key → Level` 순으로 정렬한 새 목록을 반환한다.
- `HouseUpgradeTable.csv`는 승인된 노드가 없어 헤더만 있다. 무료 테스트 노드나 임의 수치는 넣지 않았다.
- `TableManager.init()`에 로드·생성·등록했다.

검증: `verify-compile`과 `verify-tables` 통과. 테이블 검증 대상은 총 10개다.

## 2026-08-29-1 — 실제 노드 데이터와 조회 헬퍼

`Value`의 의미를 **"그 레벨에서의 총 증가량"**으로 고정했다. 레벨당 증가분이 아니므로 호출부가 `Lv1..N`을 합산하지 않는다 — 합산 경로를 두면 중복 호출 한 번에 값이 배수로 튄다(공용 지침의 "초기화 로직 중복 호출 → 값이 정확히 N배" 유형).

**추가한 것**
- `HouseUpgradeRecord.EFFECT_RUN_CONFIG_ADD` 상수(`"RunConfigAdd"`). 현재 `EffectType`은 이 한 종류뿐이다.
- `GetNodeKeyList(houseKey)` — 그 종족이 가진 노드 키를 `SortOrder` 순, 중복 없이 반환. 화면의 노드 줄 하나가 이 키 하나다.
- `GetRecord(houseKey, nodeKey, level)` — 레벨 정확 일치 행. 다음 레벨 조회와 현재 레벨 효과 조회에 모두 쓴다.
- `GetMaxLevel(houseKey, nodeKey)` — 그 종족에서 그 노드의 최대 레벨.

`GetRecord`의 레벨 비교는 `==`가 아니라 `record.Level >= _level && record.Level <= _level`로 적었다 — CODE.MD의 "숫자 비교에 `==`/`!=`를 쓰지 않는다" 규칙.

**데이터 (`HouseUpgradeTable.csv`, 48행)**
- 노드 4종: `home_hp`(→`HomeHpMax`) / `spin_coin`(→`SpinCoinPerYear`) / `swap`(→`SwapCountPerYear`) / `start_gold`(→`RunStartGold`)
- `TargetKey`는 `GameConfigTable`의 키 이름과 같게 두었다. 덕분에 `RunData`가 자기가 읽는 키를 그대로 넘겨 보너스를 받는다.
- **종족마다 4축 중 3축만 갖는다.** 빠지는 축이 종족 성격이다.

| 종족 | 본거지 | 코인 | 스왑 | 자금 | 없는 축 |
|---|---|---|---|---|---|
| slot | 2 | 3 | — | 3 | 스왑 |
| chess | 3 | — | 3 | 2 | 코인 |
| janggi | 3 | 2 | 3 | — | 자금 |
| hwatu | — | 2 | 3 | 3 | 본거지 |
| poker | — | 3 | 2 | 3 | 본거지 |
| mahjong | 2 | 3 | 3 | — | 자금 |

- 전 종족 **8레벨 / 8행 / 51옥새**로 균일하다. 배분만 다르고 총량은 같다.
- 레벨별 증가량: 본거지·코인·스왑 `+1/+2/+3`, 자금 `+5/+10/+15`. 비용 `3/6/12`.

**처음엔 4축을 전 종족 공통으로 뒀다가 되돌린 이유**: 노드 이름·설명이 6종족 전부 같아 탭을 바꿔도 `Lv 0/N`의 `N` 하나만 변해, 화면상 "아무것도 안 바뀐다"로 보였다(사용자 지적). 축을 빼서 목록 자체가 달라지게 했다.

검증: `verify-tables` exit 0(10개 테이블), Play Mode에서 48행 로드와 종족별 노드 구성 실측 확인.
