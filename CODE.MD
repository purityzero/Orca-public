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
| Dictionary 필드/변수 | `Map` 대신 `Hash` 또는 `Dic`을 접두사로 사용 | `m_HashEnemy`, `dicScore` |

---

## 코드 스타일

### if 문
- 단일 라인 본문은 `{}` 생략
- bool 비교는 반드시 명시적으로 작성

```csharp
// ✅ 올바른 사용
if (isAlive == true)
    return;

if (isAlive == false)
    return;

// ❌ 잘못된 사용
if (!isAlive)
    return;
```

### 숫자 비교
- 정수/실수 값을 비교할 때 `==`/`!=`를 쓰지 않는다. `<=`, `>=`, `<`, `>` 같은 범위 비교로 작성한다 — 계산이 정확히 그 값을 지나치지 않는다는 보장이 없거나(클램프가 나중에 풀리는 등), 부동소수점 오차가 있을 수 있는 값은 정확한 일치 비교가 위험하다.

```csharp
// ✅ 올바른 사용
if (currentHp <= 0)
    return;

// ❌ 잘못된 사용
if (currentHp == 0)
    return;
```

### 튜닝값/관계 데이터는 하드코딩 금지 — 테이블(CSV)로
- 밸런스 수치, 카테고리별 임계값, "이 카드는 이 무기가 있어야 뜬다" 같은 관계형 매핑을 C# 코드 안의 상수/배열/`Dictionary` 리터럴로 박아두지 않는다. 코드를 안 건드리고 CSV만 조정해서 튜닝할 수 있어야 한다.
- 단일 스칼라 튜닝값(배율, 임계값, 지속시간 등)은 `GameConfigTable`에 키-값 행으로 추가한다.
- 레코드 1개당 속성으로 자연스럽게 붙는 값(예: "이 카드는 어느 무기가 있어야 뜨는지", "몇 번까지 뽑을 수 있는지")은 새 `Dictionary`를 만들지 말고 해당 테이블(`CardTable` 등)에 컬럼을 추가해 레코드 자체가 들고 있게 한다.
- 카테고리×티어처럼 격자형 데이터가 기존 테이블 스키마에 안 맞으면 전용 테이블을 새로 만든다(예: `CardSynergyTable`) — 억지로 기존 테이블에 우겨넣거나 코드 상수로 남기지 않는다.
- 예외: 반복문 인덱스, 이터레이션 구조(`int[] tiers = {3,5,7}`처럼 "몇 단계로 순회할지"의 뼈대) 등 값 자체가 아니라 로직의 형태를 나타내는 것은 코드에 남겨도 된다 — 튜닝 대상(밸런스 수치)과 로직 구조(반복 방식)를 구분해서 판단할 것.

```csharp
// ✅ 올바른 사용 — 카드 하나당 속성은 테이블 컬럼으로
public class CardRecord : Record
{
    public int RequiredWeaponId; // CardTable.csv 컬럼
}

// ❌ 잘못된 사용 — 코드 안의 Dictionary로 관계를 표현
private static readonly Dictionary<int, int> WEAPON_REQUIRED_CARD_IDS = new Dictionary<int, int>
{
    { 303, 2 },
};
```

### 튜플 대신 struct/class
- 여러 값을 묶어서 반환/저장할 때 `(int, string)` 같은 익명 튜플을 만들지 않는다. 필드 이름이 있는 named tuple(`(int Id, string Name)`)도 마찬가지로 금지 — 대신 의미가 드러나는 `struct` 또는 `class`를 정의한다.
- 이유: 튜플은 성능 문제(GC 등)가 아니라(ValueTuple은 struct라 그 자체론 힙 할당 없음) **가독성 문제** — 필드가 익명이라 호출부가 늘어날수록 "몇 번째 값이 뭐였는지"를 계속 되짚어야 한다. named struct는 그 의미가 타입에 고정되어 재확인이 필요 없다.
- 예외: Unity ECS(`Unity.Entities`)의 `SystemAPI.Query<...>().WithEntityAccess()` 같은 `foreach (var (a, b, entity) in ...)` 패턴은 프레임워크가 소스제네레이터로 직접 만들어내는 계약이라 대상에서 제외한다 — `RefRW<T>`/`RefRO<T>`가 ref-like struct라 class 필드로 옮길 수도 없고, 억지로 피하려면 `EntityQuery` 수동 순회로 전체 구조를 바꿔야 해 배보다 배꼽이 커진다.

```csharp
// ✅ 올바른 사용
private struct RarityWeight
{
    public eCardRarity Rarity;
    public float Weight;
}

private static readonly RarityWeight[] RARITY_WEIGHTS = new[]
{
    new RarityWeight { Rarity = eCardRarity.Common, Weight = 60f },
};

// ❌ 잘못된 사용
private static readonly (eCardRarity Rarity, float Weight)[] RARITY_WEIGHTS = new[]
{
    (eCardRarity.Common, 60f),
};
```

### 삼항 연산자
```csharp
// 괄호로 조건을 감싸는 형태 사용
int result = (a == b) ? a : b;
```

### 타입 변환 (as 캐스팅)
- `as` 사용 전 반드시 `is` 로 먼저 검사
- `is` 성공 시 변환 결과를 별도 변수에 저장해서 사용
- 실패 시 `else` 에서 반드시 `Debug.Log` 로 실패 메시지 출력

```csharp
// ✅ 올바른 사용
if (test is TestBase == true)
{
    var testBase = test as TestBase;
    testBase.Run();
}
else
{
    Debug.Log($"test is TestBase convert failed!");
}

// ❌ 잘못된 사용
var testBase = test as TestBase;
testBase.Run();
```

### 변수명 축약 금지
- 단일 문자 변수명 금지: `a`, `b`, `c` 등 (반복문 `i`, `j` 만 예외)
- 반복문에서도 `i`, `j` 외 단일 문자 금지 — `r`, `c`, `x`, `y` 등 의미 있는 전체 단어 사용
- 줄임말 금지: `Ctx`, `Mgr`, `Obj`, `Btn`, `Img`, `Tmp` 등
- 반드시 의미를 알 수 있는 전체 단어 사용

```csharp
// ✅ 올바른 사용
var playerController = GetComponent<PlayerController>();
var gameContext = new GameContext();
var uiManager = FindObjectOfType<UIManager>();

for (int row = 0; row < Rows; row++)
    for (int col = 0; col < Cols; col++) { }

// ❌ 잘못된 사용
var pc = GetComponent<PlayerController>();
var ctx = new GameContext();
var mgr = FindObjectOfType<UIManager>();

for (int r = 0; r < Rows; r++)
    for (int c = 0; c < Cols; c++) { }
```

### GetComponent 재사용
- 동일 메서드 안에서 같은 타입의 `GetComponent<T>()`를 2회 이상 호출하지 않는다
- 반드시 한 번만 가져와 지역 변수에 저장해서 재사용한다

```csharp
// ✅ 올바른 사용
RectTransform rectTransform = m_TimeText.GetComponent<RectTransform>();
rectTransform.localScale = Vector3.one;
rectTransform.DOScale(1.4f, 0.1f);

// ❌ 잘못된 사용
m_TimeText.GetComponent<RectTransform>().localScale = Vector3.one;
m_TimeText.GetComponent<RectTransform>().DOScale(1.4f, 0.1f);
```

### 컴포넌트 참조는 GetComponent 대신 직렬화 필드로
- Unity 내장 컴포넌트(`RectTransform`, `Image`, `TextMeshProUGUI`, `Button`, `Rigidbody` 등)는 왠만하면 `Awake()`/`Start()`에서 `GetComponent<T>()`로 매번 받아오지 말고, `[SerializeField]` 멤버 변수로 선언해 프리팹/인스펙터에서 미리 연결해 둔다.
- 예외: 런타임에 동적으로 생성되는 자식이나, 코드로만 붙는 컴포넌트라 인스펙터에서 미리 연결할 대상이 없는 경우엔 `GetComponent<T>()` 사용.

```csharp
// ✅ 올바른 사용
public class UIToastMessage : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI m_MessageText;
    [SerializeField] private Image m_BackgroundImage;
}

// ❌ 잘못된 사용
public class UIToastMessage : MonoBehaviour
{
    private TextMeshProUGUI m_MessageText;
    private Image m_BackgroundImage;

    private void Awake()
    {
        m_MessageText = GetComponent<TextMeshProUGUI>();
        m_BackgroundImage = GetComponent<Image>();
    }
}
```

### for / foreach
- 본문이 한 줄이라도 반드시 `{}` 사용

```csharp
// ✅ 올바른 사용
for (int i = 0; i < list.Count; ++i)
{
    list[i].Run();
}

foreach (Block block in blocks)
{
    block.Run();
}

// ❌ 잘못된 사용
for (int i = 0; i < list.Count; ++i)
    list[i].Run();
```

### continue / break
- `if` 본문에 `continue` 또는 `break` 를 쓸 때는 반드시 줄을 바꿔 작성

```csharp
// ✅ 올바른 사용
if (block == null)
    continue;

if (isDone == true)
    break;

// ❌ 잘못된 사용
if (block == null) continue;
if (isDone == true) break;
```

### 이벤트 구독은 `-=` 후 `+=`
- 같은 인스턴스를 다시 쓰는 코드(목록 증분 갱신, 풀링, 재바인딩, 재부트)에서 `+=`만 하면 리스너가 계속 쌓여 한 번 누른 게 여러 번 실행된다.
- 해제를 먼저 부르면 중복 구독이 구조적으로 막힌다. 등록 안 된 델리게이트를 `-=` 해도 아무 일도 일어나지 않으므로 항상 안전하다.

```csharp
// ✅ 올바른 사용
m_UpgradeButton.onClick.RemoveListener(OnClickUpgradeButton);
m_UpgradeButton.onClick.AddListener(OnClickUpgradeButton);

// ❌ 잘못된 사용 — 이 오브젝트가 재사용될 때마다 리스너가 늘어난다
m_UpgradeButton.onClick.AddListener(OnClickUpgradeButton);
```

### 로그
- 카테고리 접두를 붙인다: `[UIHouseUpgrade]`, `[Save]` 형식.
- 메시지는 **무엇이 · 어떤 값이라 · 무엇을 기대했는지** 세 요소를 담는다. "실패했다"만 남기면 로그를 보고도 다시 재현해야 한다.

```csharp
// ✅ 올바른 사용
Logger.Error($"[GameConfigTable] GetValue Failed! key not found - {_key} (기대: CSV에 해당 행 존재)");

// ❌ 잘못된 사용
Logger.Error("설정을 읽지 못했습니다");
```

### 주석
- 3줄 이상 XML 주석(`///`)은 매개변수가 있거나, 복잡한 변수·속성·필드에만 사용
- 간단한 로직에는 주석 생략

---

## 코드 예시

```csharp
public interface IDamageable
{
    void TakeDamage(int _amount);
}

public enum ePlayerState
{
    Idle,
    Run,
    Dead
}

public class PlayerController : MonoBehaviour, IDamageable
{
    public static readonly int MAX_HEALTH = 100;

    public int Health;
    public bool isAlive;

    private int m_CurrentHp;
    private bool m_isInvincible;

    public int currentHp { get; private set; }

    public void TakeDamage(int _amount)
    {
        if (m_isInvincible == true)
            return;

        m_CurrentHp -= _amount;

        isAlive = (m_CurrentHp > 0) ? true : false;
    }

    private void OnDamageReceived()
    {
        StartCoroutine(CoFlashEffect());
    }

    private IEnumerator CoFlashEffect()
    {
        yield return new WaitForSeconds(0.1f);
    }

    public void OnClickReviveButton()
    {
        m_CurrentHp = MAX_HEALTH;
        isAlive = true;
    }

    public event Action OnDie;
}
```
