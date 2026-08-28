# UIHouseSelect

`UITable`의 `UIHouseSelect` 팝업. `HouseTable`을 읽어 종족 버튼·능력치·유닛 미리보기를 구성하며, 해금된 종족 선택은 `PlayerManager`에 저장한다.

## 2026-08-28

씬에 직접 박혀 있던 `HouseSelectPanel`을 `Assets/Resources/Prefabs/UI/UIHouseSelect.prefab`으로 분리하고 `UIManager.Get<UIHouseSelect>()`로 여는 팝업으로 전환했다. 타이틀 배경과 UnitRow 갱신은 `TitleScene.ApplyHouseTheme()`로 위임한다. 종족 수가 버튼 템플릿보다 많으면 버튼을 런타임 복제하고 중앙 정렬한다.

검증: Play Mode에서 UITable 경유 생성, 6개 종족 버튼 생성·배치, 팝업 표시 및 닫기, 콘솔 오류 0건.
