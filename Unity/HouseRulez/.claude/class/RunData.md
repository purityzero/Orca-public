# RunData

연관: `InGameScene`(소유자, `Assets/Scripts/InGame/InGameScene.cs`), [[UIInGameHud]], [[UIInGameAction]], `GameConfigTable`(초기값 출처, `Assets/Scripts/Table/GameConfigRecord.cs`), `PlayerData`(대비되는 저장 계층, `Assets/Scripts/Player/PlayerData.cs`)

## 2026-08-27-0 — 신설 (런 상태 담는 그릇)

### 개요
인게임 HUD가 표시할 값(본거지 HP, 연차, 골드, 스핀 코인, 판돈, 스왑, 배속)을 담을 곳이 없어 새로 만들었다.
`MonoBehaviour`가 아닌 순수 클래스이고, **저장하지 않는다**.

### PlayerData에 넣지 않은 이유
`PlayerData`의 클래스 주석이 "GDD 06장 — 코어·각인·재화는 런 안에서만 사는 값이라 여기 들어오지 않는다"로
담을 수 있는 필드의 상한을 이미 못 박아 뒀다. 그 경계를 그대로 지켰다 — 저장되는 진행도(선택 종족, 해금)와
런 한 판만 사는 값(HP/골드/코인)은 다른 클래스가 든다.

### 소유와 갱신 경로
`InGameScene`이 인스턴스를 들고, 값 변경도 전부 거기서 한다. UI(`UIInGameHud`/`UIInGameAction`)는
참조만 받아 읽고 그린다 — UI가 상태를 고치기 시작하면 갱신 경로가 둘로 갈라져 서로 덮어쓰게 된다.

### 필드 (전부 private + 읽기 전용 프로퍼티)
| 필드 | 초기값 출처 |
|---|---|
| `m_HomeHp` / `m_HomeHpMax` | `GameConfigTable.KEY_HOME_HP_MAX` (8) |
| `m_Year` / `m_YearMax` | 1 부터 / `KEY_RUN_YEAR_MAX` (12) |
| `m_Gold` | `KEY_RUN_START_GOLD` (0) |
| `m_SpinCoin` / `m_SpinCoinMax` | `KEY_SPIN_COIN_PER_YEAR` (3) |
| `m_SwapCount` / `m_SwapCountMax` | `KEY_SWAP_COUNT_PER_YEAR` (2) |
| `m_BetLevel` | 0 |
| `m_BattleSpeed` / `m_BattleSpeedFast` | 1 / `KEY_BATTLE_SPEED_FAST` (2) |

숫자는 코드에 하나도 박지 않았다. `Init()`의 `GetValue(key, 기본값)` 두 번째 인자는 CSV 자체가 없을 때의
최후 방어값이고, 실제 튜닝은 `GameConfigTable.csv`만 고쳐서 한다.

### 메서드
- `Init()` — 테이블에서 초기값을 읽어 채운다. 인게임 진입 시 `InGameScene.OnSetup()`에서 1회.
- `SpendSpinCoin()` — 코인 1개 소모. 남은 게 없으면 `false`를 돌려주고 아무것도 바꾸지 않는다.
- `ToggleBattleSpeed()` — ×1 과 `m_BattleSpeedFast` 두 단계만 오간다.

### 아직 없는 것
HP 감소(선전포고 패배 −2), 연차 진행, 골드 증감, 판돈 변경, 스왑 소모 — 전부 그 단계(전투/외교/배치)가
아직 없어 변경 API를 만들지 않았다. 필요해지는 시점에 그 단계와 함께 붙인다.

## 2026-08-29-0 — 영구 메타 스냅샷 반영과 옥새 보상

### 런 시작값에 메타를 더한다
`Init()`이 `GameConfigTable` 기본값 위에 `PlayerManager.GetRunConfigBonus(houseKey, 키)`를 더한다.
대상은 `HomeHpMax`, `SpinCoinPerYear`, `SwapCountPerYear`, `RunStartGold` 네 개다.
`RunYearMax`와 `BattleSpeedFast`는 강화 대상이 아니라 그대로 둔다.

`TargetKey`를 `GameConfigTable` 키 이름과 같게 맞춰뒀기 때문에, 자기가 읽는 키를 그대로 넘기면 된다.
별도의 매핑 테이블이 필요 없다.

**스냅샷은 `Init()`에서 한 번만 적용한다.** 다른 곳에서 다시 더하지 않는다 — 런 도중 타이틀에서 산 것이
진행 중인 런에 소급되면 안 되고, 두 경로가 생기면 값이 배수로 튄다.

### GetRoyalReward()
런 종료 시 줄 옥새를 계산한다. `도달 연차 × RoyalPerYear`, 도달 연차가 `yearMax` 이상이면
`RoyalClearBonus`를 더한다. 패배해도 도달 연차만큼은 나온다.

**호출부가 아직 없다.** 런 종료 단계 자체가 없어서다. 종료 처리가 생기면 이 결과를
`PlayerManager.AddRoyal()`로 넘긴다 — 코드에 `TODO`로 남겨뒀다.

### 검증 (Play Mode 실측)
슬롯에서 `home_hp` Lv1 / `spin_coin` Lv2를 산 상태로 `homeHpMax=9`(8+1), `spinCoinMax=5`(3+2),
`swapCountMax=2`(슬롯엔 스왑 노드가 없어 기본값), `gold=0`을 확인했다.
