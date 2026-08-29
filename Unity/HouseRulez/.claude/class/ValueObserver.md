# ObservableVariable (ValueObserver)

관련 클래스: StringTable, UIText, UIAssetBox

경로: `Assets/Scripts/Glory/Partterns/Observer/ValueObserver.cs`

Glory 공용 관찰 값. `RegisterObserver()`는 등록 즉시 현재 값으로 콜백을 한 번 호출하고, `Value` 대입 시 값이 실제로 바뀔 때만 알린다.

## 2026-08-29-0 — 알림 도중 구독 변경으로 알림이 끊기던 문제

### 증상

언어 변경 중 `InvalidOperationException: Collection was modified; enumeration operation may not execute.`

```
ObservableVariable`1.NotifyObservers  ValueObserver.cs:48
ObservableVariable`1.set_Value        ValueObserver.cs:24
StringTable.set_CurrentLanguage
PlayerManager.SetLanguage
```

### 원인

`NotifyObservers`가 `observers` 원본을 `foreach`로 순회했다. 콜백 안에서 `Register`/`Unregister`가 일어나면 순회 중 컬렉션이 바뀐다.

실제 경로: 언어 변경 → `UIHouseUpgrade.OnLanguageChanged` → `BuildNodes()` → 빈 상태 패널 `SetActive()` → 그 안 [[UIText]]의 `OnEnable`/`OnDisable` → 구독 목록 변경 → 예외.

**예외가 나면 그 뒤 관찰자들은 알림을 아예 못 받는다.** 화면 일부만 옛 언어로 남는 형태로 드러난다.

### 수정

```csharp
Action<T, T>[] snapshot = observers.ToArray();
foreach (var observer in snapshot)
{
    observer.Invoke(old, newValue);
}
```

사본을 순회한다. 알림 도중 해제된 관찰자도 이번 알림은 받지만, UI가 켜지고 꺼지는 것은 알림 처리의 정상적인 결과이므로 이 동작이 맞다.

### 공용 클래스라 사용처를 먼저 확인했다

`ObservableVariable`은 `UIAssetBox`(재화 표시)와 언어 두 곳에서 쓴다. 사본 순회는 두 사용처 모두에서 기존 동작을 바꾸지 않고 예외만 없앤다.

### 검증

`verify-compile` exit 0. 패널을 켠 채 언어를 3회 왕복시켜 예외가 나지 않고 모든 관찰자가 계속 알림을 받는 것을 확인했다.
