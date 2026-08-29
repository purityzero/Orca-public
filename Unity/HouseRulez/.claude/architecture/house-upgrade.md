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

## 다음 승인 게이트

실제 콘텐츠와 구매 기능을 만들기 전에 다음을 결정해야 한다.

1. M-2: 선형/트리/상호 배타 분기 및 좌표 데이터
2. M-3: 영구 재화 이름, 공용/종족별 여부, 획득 경로
3. M-4: 종족별 노드 효과와 수치
4. M-5: 초기화·재분배·최대 진행
5. M-6: 혼혈 유닛 적용 규칙
6. 비용 차감과 진행 저장의 원자성
7. 메타 효과, 등급 배수, 각인의 적용 순서

## 검증

2026-08-29에 다음을 통과했다.

- `unity command verify-compile`: exit 0
- `unity command verify-tables`: exit 0, 10개 테이블
- Unity Console error 0
- Play Mode에서 6개 탭 생성, 탭 전환 후 저장 종족 불변, 빈 상태, 닫기 확인
- 1280×720 Game View에서 중앙 배치 및 잘림 없음
