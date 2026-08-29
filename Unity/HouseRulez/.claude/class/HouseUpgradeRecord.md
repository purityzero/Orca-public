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
