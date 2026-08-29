# TitleScene

경로: `Assets/Scripts/Title/TitleScene.cs`

타이틀 씬의 `BaseScene` 진입점이자 메뉴 버튼 연결부다.

## 2026-08-29-0 — 업그레이드 팝업 연결

`OnClickUpgradeButton()`의 TODO를 `UIManager.instance.Get<UIHouseUpgrade>()`로 교체했다. 프리팹 경로와 팝업 분류는 `UITable.csv`가 소유한다.

Play Mode에서 실제 Upgrade 버튼 클릭으로 `PopupCanvas/UIHouseUpgrade`가 열리는 것을 확인했다.
