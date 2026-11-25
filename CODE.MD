# 코드 규칙

## 기본 환경
- 언어: C#
- 엔진: Unity
- 베이스 클래스: MonoBehaviour
- 대화 언어: 한국어

---

## 네이밍 규칙

### 타입 및 필드

| 대상 | 규칙 | 예시 |
|------|------|------|
| 클래스 | 파스칼 표기법 | `PlayerController` |
| 공개 인스턴스 필드 (public) | 파스칼 표기법 | `public int Health` |
| 비공개 인스턴스 필드 (private, protected) | `m_` + 파스칼 표기법 | `private int m_Health` |
| 속성 (Property) | 카멜 표기법 | `public int health { get; set; }` |
| private / protected 속성 | `m_` + 카멜 표기법 | `private int m_health` |
| public 속성 | 카멜 표기법 | `public int health` |
| 매개변수 | `_` + 카멜 표기법 | `void Init(int _maxHp)` |
| 지역 변수 | 카멜 표기법 | `int currentHp` |

### 메서드

| 대상 | 규칙 | 예시 |
|------|------|------|
| 일반 메서드 | 파스칼 표기법 | `public void TakeDamage()` |
| 콜백 메서드 | `On` + 파스칼 표기법 | `void OnDamageReceived()` |
| 코루틴 | `Co` + 파스칼 표기법 | `IEnumerator CoFadeIn()` |
| **bool을 돌려주는 판정 메서드** | `Is` + 파스칼 표기법 | `bool IsAllReelIdle()`, `bool IsExtraSpinBuyable()` |

### bool 반환 메서드

| 역할 | 이름 규칙 | 예시 |
|---|---|---|
| “~인가” 상태·조건 판정 | `Is`로 시작(`CanBuy~` 금지) | `IsExtraSpinBuyable()` |
| 실행하고 성패를 bool로 반환 | 동사 유지 | `SpendSpinCoin()` (`IsSpendSpinCoin()` 금지) |

이름만 보고 판정과 실행을 구분한다. 근거(2026-09-10): 기존 `IsAllReelIdle()`·`IsState()` 관례와 어긋난 `CanBuy~`를 사용자 지적으로 정정했다.

```csharp
public bool IsExtraSpinBuyable()
{
    return m_Gold >= m_ExtraSpinGoldCost;
}
```

### 특수 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| static / readonly / const | UPPER_SNAKE_CASE | `MAX_HEALTH`, `DEFAULT_SPEED` |
| private 필드 | `m_` 접두사 | `private int m_Score` |
| enum | `e` + 파스칼 표기법 | `enum ePlayerState { Idle, Run }` |
| public bool | `is` + 카멜 표기법 | `public bool isAlive` |
| private bool | `m_is` + 카멜 표기법 | `private bool m_isAlive` |
| 콜백 / 이벤트 / Action / delegate | `On` 만 사용 | `event Action OnDie` |
| 버튼 핸들러 | `OnClick` + 파스칼 표기법 | `void OnClickStartButton()` |
| 인터페이스 | `I` + 파스칼 표기법 (handler 등 수식어 금지) | `IInteractable`, `IDamageable` |
| Dictionary 필드/변수 | `Map` 대신 `Hash` 또는 `Dic` 접두사 | `m_HashEnemy`, `dicScore` |

---

## 코드 스타일

### if 문

| 항목 | 규칙 | 짧은 예시 |
|---|---|---|
| 단일 라인 본문 | `{}` 생략 | 아래 예시 참조 |
| bool 조건 | `== true` / `== false` 명시 | `if (isAlive == false)`, `!isAlive` 금지 |

```csharp
if (isAlive == true)
    return;
```

### 숫자 비교
- 정수·실수 비교에 `==`/`!=`를 쓰지 않고 `<=`, `>=`, `<`, `>`로 범위를 비교한다.
- 값이 정확히 해당 수를 지나간다는 보장이 없거나 클램프 변경·부동소수점 오차가 있으면 동등 비교가 위험하다.

```csharp
if (currentHp <= 0)
    return;
```

### 튜닝값/관계 데이터는 하드코딩 금지 — 테이블(CSV)로

밸런스 수치·카테고리별 임계값·관계형 매핑을 C# 상수·배열·`Dictionary` 리터럴에 넣지 않는다. 코드 수정 없이 CSV로 튜닝할 수 있어야 한다.

| 데이터 형태 | 위치·규칙 |
|---|---|
| 단일 스칼라 튜닝값(배율·임계값·지속시간) | `GameConfigTable` 키-값 행 |
| 레코드별 속성(필요 무기·최대 추첨 횟수) | 해당 테이블 컬럼. 별도 `Dictionary` 금지 |
| 기존 스키마에 안 맞는 카테고리×티어 격자 | `CardSynergyTable` 같은 전용 테이블 생성. 기존 테이블에 억지로 넣거나 코드 상수로 남기지 않음 |
| 예외: 로직 구조 | 반복 인덱스·순회 단계 뼈대는 코드 허용. 튜닝 수치와 구분 |

```csharp
public class CardRecord : Record
{
    public int RequiredWeaponId; // CardTable.csv 컬럼
}
```

`int[] tiers = {3,5,7}`처럼 “몇 단계로 순회할지”를 표현하는 뼈대는 로직 구조 예외다. 같은 값이라도 밸런스 튜닝 대상이면 CSV에 둔다.

### 튜플 대신 struct/class
- 익명 튜플 `(int, string)`과 named tuple `(int Id, string Name)` 모두 금지한다. 반환·저장할 여러 값은 의미 있는 `struct`/`class`로 정의한다.
- 목적은 가독성이다. `ValueTuple`은 struct라 자체 힙 할당 문제가 아니며, 값의 순서를 되짚는 대신 타입의 필드 이름으로 의미를 고정한다.
- 예외: Unity ECS(`Unity.Entities`)의 `SystemAPI.Query<...>().WithEntityAccess()`와 `foreach (var (a, b, entity) in ...)`는 프레임워크 소스제네레이터 계약이므로 허용한다. `RefRW<T>`/`RefRO<T>`의 ref-like 제약 때문에 class 필드로 옮기거나 `EntityQuery` 수동 순회로 전체 구조를 바꾸지 않는다.

```csharp
private struct RarityWeight
{
    public eCardRarity Rarity;
    public float Weight;
}
```

### 삼항 연산자
조건은 괄호로 감싸고, 숫자 비교는 「숫자 비교」 규칙을 따른다.

```csharp
int result = (currentHp > minimumHp) ? currentHp : minimumHp;
```

### 타입 변환 (as 캐스팅)

| 단계 | 규칙 |
|---|---|
| 검사 | `as` 전에 반드시 `is`로 검사 |
| 성공 | 변환 결과를 별도 변수에 저장해 사용 |
| 실패 | 반드시 `else`에서 `Debug.Log`로 실패 메시지 출력 |

```csharp
if (test is TestBase == true)
{
    var testBase = test as TestBase;
    testBase.Run();
}
else
{
    Debug.Log($"[Test] test is TestBase convert failed! (실제: {(test == null ? "null" : test.GetType().FullName)}, 기대: TestBase)");
}
```

### 변수명 축약 금지

| 대상 | 규칙·예외 |
|---|---|
| 단일 문자 | 금지. 반복문 `i`·`j`만 예외 |
| 반복문 | `r`·`c`·`x`·`y`도 금지. `row`·`column`처럼 전체 단어 사용 |
| 줄임말 | `Ctx`·`Mgr`·`Obj`·`Btn`·`Img`·`Tmp` 등 금지 |
| 의미 | 반드시 의미를 알 수 있는 전체 단어 사용 |

`playerController`·`gameContext`·`uiManager`처럼 쓴다. 네이밍 형식은 「네이밍 규칙」 표를 따른다.

### GetComponent 재사용
동일 메서드에서 같은 타입의 `GetComponent<T>()`를 2회 이상 호출하지 않는다. 한 번 가져와 지역 변수에 저장하고 재사용한다.

```csharp
RectTransform rectTransform = m_TimeText.GetComponent<RectTransform>();
rectTransform.localScale = Vector3.one;
rectTransform.DOScale(1.4f, 0.1f);
```

### 컴포넌트 참조는 GetComponent 대신 직렬화 필드로
- Unity 내장 컴포넌트(`RectTransform`·`Image`·`TextMeshProUGUI`·`Button`·`Rigidbody` 등)는 가급적 `Awake()`/`Start()`에서 조회하지 않고 `[SerializeField]` 멤버로 프리팹/인스펙터에 미리 연결한다.
- 예외: 런타임 생성 자식·코드로만 추가되는 컴포넌트처럼 미리 연결할 대상이 없으면 `GetComponent<T>()`를 쓴다.

```csharp
[SerializeField] private TextMeshProUGUI m_MessageText;
```

### for / foreach
본문이 한 줄이어도 반드시 `{}`를 쓴다. 「if 문」의 단일 본문 규칙과 구별한다.

```csharp
foreach (Block block in blocks)
{
    block.Run();
}
```

### continue / break
`if` 본문에 `continue`·`break`를 쓸 때 반드시 줄을 바꾼다.

```csharp
if (block == null)
    continue;
if (isDone == true)
    break;
```

### 이벤트 구독은 `-=` 후 `+=`
목록 증분 갱신·풀링·재바인딩·재부트 등 같은 인스턴스를 다시 쓰는 코드에서는 해제 후 구독한다. `+=`만 하면 호출이 누적된다. 미등록 델리게이트 해제는 아무 일도 하지 않으므로 먼저 해제한다.

```csharp
m_UpgradeButton.onClick.RemoveListener(OnClickUpgradeButton);
m_UpgradeButton.onClick.AddListener(OnClickUpgradeButton);
```

### 로그
- `[UIHouseUpgrade]`·`[Save]` 같은 카테고리 접두를 붙인다.
- **무엇이·어떤 값이라·무엇을 기대했는지**를 담는다. “실패했다”만 쓰지 않는다.

```csharp
Logger.Error($"[GameConfigTable] GetValue Failed! key not found - {_key} (기대: CSV에 해당 행 존재)");
```

### 주석
- 3줄 이상 XML 주석(`///`)은 매개변수가 있거나 복잡한 변수·속성·필드에만 사용한다.
- 간단한 로직은 주석을 생략한다.

---

## 코드 예시

전체 `PlayerController` 예시는 위 절들의 반복이므로, 함께 적용하는 짧은 예시만 둔다.

```csharp
public void TakeDamage(int _amount)
{
    if (m_isInvincible == true)
        return;

    m_CurrentHp -= _amount;
    isAlive = (m_CurrentHp > 0) ? true : false;
}
```
