# UIHouseUpgrade (prefab)

경로: `Assets/Resources/Prefabs/UI/UIHouseUpgrade.prefab`

종족별 영구 메타 업그레이드의 읽기 전용 공용 팝업이다. `UIManager`가 `PopupCanvas` 아래에 생성한다.

## 구조

```text
UIHouseUpgrade
├─ DimmedBackground
└─ Panel (1440×880, 중앙)
   ├─ TitleText
   ├─ CloseButton (UIButton)
   ├─ HouseButtonRoot (HorizontalLayoutGroup)
   │  └─ HouseButtonTemplate (비활성 템플릿, UIButton)
   ├─ SelectedHouseNameText
   ├─ Accent
   └─ EmptyText
```

루트는 1920×1080 full 화면 기준이며 종족 탭은 런타임에 6개로 늘어난다. 구매 버튼, 비용, 재화, 노드 선/좌표는 없다. 신규 오디오/이미지 에셋을 사용하지 않는다.

2026-08-29 Play Mode에서 직렬화 참조, 닫기, 탭 전환, 1280×720 중앙 배치와 잘림 없음을 확인했다.
