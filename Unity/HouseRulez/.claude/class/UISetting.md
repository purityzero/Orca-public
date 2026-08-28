# UISetting

`UITable`의 `UISetting` 팝업. 기존 `OptionData`를 통해 언어 순환, FPS 제한 순환, BGM/SFX 슬라이더를 즉시 적용·저장한다. `UIManager.Get<UISetting>()`으로 연다.

## 2026-08-28

GeometryDefender의 설정 흐름을 참고해 HouseRulez용 팝업을 추가했다. 음원 파일은 이식하지 않았고, 현재 사운드 카테고리 볼륨 API만 연결한다. 자체 Canvas에 의존하지 않고 UIManager가 씬 Canvas 아래 `PopupCanvas`를 보장한다.

검증: Unity Play Mode에서 팝업 표시, 언어/FPS 순환, BGM/SFX 값 및 `SoundManager` 반영, 닫기, 콘솔 오류 0건.
