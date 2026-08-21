# UIAssetBoxGroup

연관: [[UIAssetBox]]

Glory 공용 라이브러리(`Assets/Scripts/Glory/UI/AssetBox/UIAssetBoxGroup.cs`)의 `UIAssetBox` 배열 묶음 컨트롤러.

## 2026-08-21-0 — 컴파일 에러 수정: 삭제된 UIAssetBox.SetData() 무인자 오버로드 호출 제거

### 개요
Unity MCP 자동 연결 작업 중 프로젝트 전체가 이 파일 때문에 컴파일 실패 상태였던 것을 발견(`Assembly-CSharp.dll` 자체가 안 만들어져 `Assets/Editor/` 밑 에디터 스크립트까지 전부 컴파일에서 빠지고 있었음). `UIAssetBox.SetData()`(무인자 버전)는 [[UIAssetBox]] 2026-08-18-1에서 PlayerManager 하드 의존 제거를 위해 이미 삭제됐는데, `UIAssetBoxGroup.SetData()`가 그 옛 시그니처를 그대로 호출하고 있어 `error CS1501: No overload for method 'SetData' takes 0 arguments` 발생.

### 증상
```
Assets\Scripts\Glory\UI\AssetBox\UIAssetBoxGroup.cs(22,29): error CS1501: No overload for method 'SetData' takes 0 arguments
```

### 원인
[[UIAssetBox]]가 2026-08-18에 `SetData()`(무인자)/`SetData(eCurrencyType)` 오버로드를 제거했으나, 이 그룹 클래스는 갱신되지 않고 남아있었음.

### 수정 (`SetData()` 메서드 전체 제거)
**이전**:
```csharp
public void SetData()
{
    for (int i = 0; i < m_AssetBoxes.Length; ++i)
    {
        m_AssetBoxes[i].SetData();
    }  
}
```

**이후**: 메서드 자체를 삭제. `HouseRulez`엔 이 컴포넌트를 실제로 붙인 프리팹/호출부가 아직 없어([[UIAssetBox]] 2026-08-18-1 참고) 죽은 코드였음 — 그룹 단위로 여러 재화 값을 한 번에 넣어야 하는 실제 호출부가 생기면, 그때 `UIAssetBox.SetData(eCurrencyType, ObservableVariable<int>)` 시그니처에 맞춰 배열 파라미터를 받는 오버로드를 새로 설계할 것.
`Refresh()`는 변경 없음(그대로 정상 컴파일됨).

### 검증 상태 — 컴파일만 확인, Play Mode 미검증
이 수정 자체는 이 파일의 컴파일 에러만 없애는 목적이라 재컴파일 결과(Assembly-CSharp.dll 정상 생성 여부)까지만 확인 예정. `UIAssetBoxGroup`을 실제로 쓰는 씬/프리팹이 없어 런타임 동작 확인 대상 자체가 없음.
