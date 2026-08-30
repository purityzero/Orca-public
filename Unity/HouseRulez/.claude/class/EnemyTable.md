# EnemyRecord / EnemyTable

관련 클래스: WaveTable, GameConfigTable

경로: `Assets/Scripts/Table/EnemyRecord.cs` · `Assets/Resources/Table/EnemyTable.csv`

적 1종의 스탯. `Power`가 밸런스의 기준 단위다 — 플레이어 1성 유닛 1기를 1로 보고, 이 적 한 마리가 그 몇 기에 해당하는지를 뜻한다.

## 2026-08-30-0 — 신규 7행

| Key | Power | Hp | Atk | Range | 등장 |
|---|---|---|---|---|---|
| grunt | 1 | 10 | 2 | 1 | 1–2연차 |
| shield | 2 | 26 | 3 | 1 | 3–4연차 |
| archer | 2 | 14 | 5 | 3 | 5–6연차 |
| brute | 4 | 52 | 8 | 1 | 7–12연차 |
| king_first | 17 | 240 | 18 | 2 | 4연차 심판 |
| king_second | 41 | 600 | 34 | 2 | 8연차 심판 |
| king_final | 110 | 1650 | 78 | 2 | 12연차 최종 |

**`Power`를 고칠 때는 Hp/Atk도 함께 본다.** 웨이브가 몇 마리를 낼지 이 값으로 역산하므로, Power만 낮추면 같은 스탯의 적이 더 많이 나온다.

⚠️ **`SpritePath`가 가리키는 아트가 아직 없다.** `Image/InGame/Enemy/enemy_*` 규약만 정해둔 상태라 스폰을 붙일 때 스텁이 필요하다.

GDD의 제안 테이블 목록에는 적 테이블이 **빠져 있었다** — `Wave.csv`가 `EnemyGroupId`를 참조한다고 적어놓고 정작 그 스키마가 없었다. 이번에 채운 것이다.
