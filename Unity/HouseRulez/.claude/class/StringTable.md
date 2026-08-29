# StringRecord / StringTable

관련 클래스: ObservableVariable, PlayerManager, UISetting, UIHouseUpgrade

경로: `Assets/Scripts/Table/StringRecord.cs`

로컬라이제이션 문자열 테이블. 컬럼은 `Id, Key, Kr, En, Cn, Jp`이며 `StringTable.CurrentLanguage`가 어느 컬럼을 읽을지 정한다.

## 2026-08-29-0 — 언어를 관찰 가능한 값으로 전환

### 문제

`CurrentLanguage`가 알림 없는 **정적 필드**였다. 언어를 바꾼 화면이 자기 `ApplyLocalizedText()`를 직접 호출하는 방식이라(`UISetting.OnClickLanguageButton`), **그때 열려 있던 다른 화면은 갱신되지 않았다.** 설정 팝업 위에 업그레이드 팝업이 떠 있으면 업그레이드 쪽 문구가 예전 언어로 남았다.

### 수정

프로젝트에 이미 있는 `ObservableVariable<T>`(`Assets/Scripts/Glory/Partterns/Observer/ValueObserver.cs`)를 재사용했다.

```csharp
public static readonly ObservableVariable<eLanguage> LANGUAGE = new ObservableVariable<eLanguage>(GetDefaultLanguage());

public static eLanguage CurrentLanguage
{
    get { return LANGUAGE.Value; }
    set { LANGUAGE.Value = value; }
}
```

`CurrentLanguage`를 프로퍼티로 남겨 **기존 호출부 5곳을 하나도 고치지 않았다.**

`ObservableVariable.RegisterObserver()`는 등록 즉시 현재 값으로 콜백을 한 번 호출한다. 그래서 구독이 곧 최초 적용을 겸한다.

### 구독하는 쪽의 의무

- `Show()`에서 등록하고 `Close()`와 `OnDestroy()` 양쪽에서 해제한다. 구독을 남긴 채 파괴되면 관찰 목록이 죽은 객체를 계속 붙든다.
- 현재 [[UIHouseUpgrade]]가 이 방식으로 구독한다.

### 아직 옮기지 않은 화면

`UISetting`과 `TitleScene`은 여전히 수동 `ApplyLocalizedText()` 호출 방식이다. 지금도 동작하므로 건드리지 않았다 — 요청 범위 밖이다. 다만 같은 문제(그 화면이 아닌 곳에서 언어가 바뀌면 갱신 안 됨)를 갖고 있으므로, 정리한다면 이 구독 방식으로 통일하는 것이 맞다.

### 검증

Play Mode에서 업그레이드 팝업을 **연 채로** 한국어/영어/일본어/중국어를 순환시켜 노드 이름·설명·버튼 라벨·비용·보유 재화가 전부 즉시 바뀌는 것을 확인했다. 팝업을 다시 열지 않았다.
