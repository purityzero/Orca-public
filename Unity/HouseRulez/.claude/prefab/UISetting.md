# UISetting (prefab)

경로: `Assets/Resources/Prefabs/UI/UISetting.prefab`

설정 제목, 언어/FPS 순환 버튼, BGM/SFX 슬라이더, 닫기 버튼으로 구성된다. UIManager가 씬의 `Canvas` 아래 `PopupCanvas`를 생성해 인스턴스화한다. 루트 RectTransform은 기준 해상도 1920×1080, 중앙 피벗 `(0.5, 0.5)`을 사용한다.

2026-08-29: 현재 프로젝트에는 유효한 `ButtonClick` SoundRecord와 오디오 에셋이 없어 언어/FPS/닫기 `UIButton`의 클릭 SFX 키를 비웠다. 새 음원을 추가하지 않았으며 버튼 기능과 Console error 0건을 Play Mode에서 확인했다.
