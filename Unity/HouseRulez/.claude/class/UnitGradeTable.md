# UnitGradeRecord / UnitGradeTable

관련 클래스: Judge, JudgeResult

경로: `Assets/Scripts/Table/UnitGradeRecord.cs` · `Assets/Resources/Table/UnitGradeTable.csv`

유닛 등급별 전력 배수. GDD의 흡수 승급 배수를 그대로 쓴다.

## 2026-08-30-0 — 신규 3행

| Grade | Multiplier |
|---|---|
| 1 | 1.0 |
| 2 | 2.6 |
| 3 | 7.0 |

**프리즘(×18.0)은 넣지 않았다.** 심판 웨이브 클리어라는 별도 조건이 붙고 전장 2칸을 먹으므로, 판정 소환이 마음대로 만들어낼 수 있는 등급이 아니다.

그 결과 [[Judge]]가 배치할 수 있는 최대 전력이 `9칸 × 7.0 = 63`으로 고정된다. 초과분은 버려진다(포커 트리플 4개에서 101 손실, 발생률 0.1%).

배수를 고치면 [[Judge]]의 승격 비용이 함께 바뀐다 — 승격 비용은 배수의 차이로 계산하기 때문이다.
