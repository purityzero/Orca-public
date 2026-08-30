# JudgeRecord / JudgeTable

관련 클래스: Judge, HouseTable

경로: `Assets/Scripts/Table/JudgeRecord.cs` · `Assets/Resources/Table/JudgeTable.csv`

종족별 판정 패턴의 계수. GDD가 50만 회 몬테카를로로 역산한 값이라 코드에 박지 않고 CSV로 둔다.

## 2026-08-30-0 — 신규 9행

| HouseKey | PatternKey | Coef |
|---|---|---|
| chess | ChessLineTriple / ChessLinePair | 8.0 / 1.3 |
| janggi | JanggiJump / JanggiCannon / JanggiEdge | 3.8 / 3.8 / 0.95 |
| poker | PokerTriple / PokerStraight / PokerPair | 40 / 11 / 1 |
| hwatu | HwatuScale | 0.2055 |

**여기 숫자를 고치면 종족 밸런스가 직접 바뀐다.** 고친 뒤에는 반드시 시뮬레이션을 다시 돌린다 — [[Judge]]의 검증 절차 참고.

패턴 키는 `JudgeTable`의 `const`로 두었다. 문자열을 호출부마다 다시 적으면 오타가 조용히 계수 0으로 흘러간다.

섯다 족보값은 여기 없다. 규칙 그 자체라 조정 대상이 아니고 `Judge.cs` 상수로 둔다.
