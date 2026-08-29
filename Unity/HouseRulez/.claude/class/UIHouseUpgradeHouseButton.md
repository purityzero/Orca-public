# UIHouseUpgradeHouseButton

경로: `Assets/Scripts/Title/UIHouseUpgradeHouseButton.cs`

`UIHouseUpgrade`의 종족 탭 하나를 담당한다. 클릭은 직렬화된 `UIButton`을 사용한다.

## 2026-08-29-0 — 동적 종족 탭

- `SetData()`가 종족 레코드, 현지화 이름, 잠금 문구, 해금 상태, 클릭 콜백을 받는다.
- 종족 액센트 색과 잠금 표시를 갱신한다.
- `SetSelected()`가 선택/일반 배경색을 전환한다.
- 탭 클릭은 부모의 로컬 열람 상태만 바꾸며 `PlayerManager.SetSelectedHouse()`를 호출하지 않는다.
- 현재 `SoundTable`에는 유효한 버튼 클릭 SFX가 없으므로 프리팹의 SFX 키를 비워 런타임 오류를 방지했다. 새 음원은 추가하지 않았다.
