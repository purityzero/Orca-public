# Codex QA — Unity 공식 CLI 경로와 판정 정확도 규칙

마지막 적용: 2026-11-17. **MCP for Unity는 2026-11-17 사용자 결정으로 걷어냈다.** Unity 에디터 조작·Play Mode QA는 공식 CLI(`unity`) + 프로젝트의 `com.unity.pipeline`으로 한다.
근거는 Cell_Test 시범 3회(CLI 1.0.1 + Pipeline 1.0.0). `runbook/codex-qa-full.md`·`codex-qa-quick.md`가 이 문서를 참조한다.

## 1. 준비

- CLI 설치 확인: `unity --version`. 없으면 사용자에게 묻고 `winget install --id Unity.CLI --exact`(임의 설치 금지).
- 프로젝트에 `com.unity.pipeline`이 없으면 `unity pipeline install --project-path <경로> --non-interactive`. 그 전에 `Packages/manifest.json`·`packages-lock.json`을 백업한다. **팀 공용 저장소의 manifest 변경은 사용자 승인을 받는다.**
- CLI는 명령을 부를 때 실행 중인 에디터에 붙는다. 세션을 먼저 열고 에디터를 나중에 켜도 된다.
- 에디터가 둘 이상 떠 있으면 대상을 반드시 지정한다. 지정하지 않으면 Pipeline 명령 검색이 거부된다(2026-11-17 실측).

## 2. 명령 (PowerShell)

대상 지정은 둘 중 하나다: 각 명령에 `--project-path <경로>`를 붙이거나, 먼저 `$env:UNITY_PROJECT_PATH = '<경로>'`를 설정한다. 아래 표는 `--project-path`를 생략하고 적었다. 정확한 인자는 `unity command <이름> --help`로 확인한다. 명령을 찾을 때는 `unity command --query <단어> --project-path <경로>`를 쓴다.

| 할 일 | 명령 | 메모 |
|---|---|---|
| 준비 상태 | `unity status --project-path <경로>` | 시작 직후 종료 코드 6 `STATUS_PIPELINE_LOAD_PENDING`은 아직 로딩 중이다. 실패로 읽지 않는다 |
| 에디터 열기 | `unity open <경로> --until-ready --args=-automated` | Cell_Test 기준 111초 |
| 컴파일 상태 | `unity command script recompile_status` | `failed:false`, `errors:[]`를 본다. **연결 불가를 오류 0으로 치지 않는다** |
| 재컴파일 | `unity recompile --project-path <경로>` | 에디터가 응답하지 않으면 종료 코드 12 |
| 자동 틱 | `unity command editor set_auto_tick` | 포커스 없이 에디터가 계속 돈다 |
| Play 시작·정지 | `unity command editor.playmode start` / `stop` | start는 Play 동안 Run In Background를 켠다 |
| C# 실행 | `unity command script eval --file <파일.cs>` | 긴 코드를 인라인으로 넘기면 PowerShell 따옴표가 깨진다(종료 코드 2) |
| 메뉴 실행 | `unity command editor invoke_menu` | 경로 없이 부르면 메뉴 목록. QARecorder 같은 메뉴 기반 도구를 부를 때 쓴다(미실측) |
| 화면 | `unity command capture game_view` (기본 source=screen) | Screen Space Overlay UI가 찍힌다. Cell_Test에서 `source=camera`는 UI가 안 찍혔다 |
| 콘솔 | `unity command console status` / `console get` | §3-4. `console clear`는 사용자 기록도 지우므로 쓰지 않는다 |

설정을 바꾸기 전에 원래 값을 조회해 기록하고, 끝나면 되돌린다. 호출당 0.6~0.9초가 걸렸다.

### 절차서의 옛 MCP 도구 이름 대응

`codex-qa-full.md`·`codex-qa-quick.md` 본문에는 MCP 시절 도구 이름이 남아 있다. 아래처럼 바꿔 읽는다.

| 옛 이름 | CLI |
|---|---|
| `manage_editor(action:"play"/"stop")` | `editor.playmode start` / `stop` |
| `execute_code` | `script eval --file` |
| `read_console` | `console get` + `Logs/Editor.log` |
| `find_gameobjects`, 컴포넌트 조회 | `script eval`로 조회, 또는 `--query`로 전용 명령 검색 |
| 메뉴 실행(`Tools/QA/Start Recording` 등) | `editor invoke_menu` |
| 리임포트·재컴파일 | `unity recompile` |
| OS 포커스 맞추기(`AppActivate`) | `editor set_auto_tick`으로 대신한다. 그래도 프레임이 멈추면 포커스를 시도한다 |

## 3. 판정 정확도 규칙 (과거 오판 재발 방지)

배경: 2026-09-15 QA에서 내부 메서드를 직접 부르고 실플레이라고 보고했다. 구현자 브리프의 틀린 기준으로 통과를 냈다. 2026-11-17 시범에서도 캡처 최신성 문제와 콘솔 누락이 나왔다.

1. **기대값은 검증자가 직접 세운다.** 기획 문서·데이터(CSV)·코드에서 수치 기대값과 근거(파일:줄)를 먼저 적는다. 구현자가 준 목록은 그대로 쓰지 않고 대조 대상으로만 둔다. 문서와 코드가 다르면 그 자체를 발견으로 기록한다.
2. **정지 화면 캡처는 프레임 스탬프로 시점을 증명한다.**
   - Play 직후 `script eval --file <Orca 저장소 루트>\tools\unity-qa\framestamp.eval.cs`를 실행한다. 화면 왼쪽 위에 `F=<frameCount> T=<time>`이 뜬다. 런타임 전용이라 Play 종료와 함께 사라진다.
   - 캡처마다 비교한다. a는 캡처 직전 CLI로 읽은 frameCount, b는 이미지에 찍힌 F, c는 캡처 직후 frameCount다.
   - **a ≤ b ≤ c면 그 캡처는 그 구간의 화면이다.** 범위 밖이거나 스탬프가 안 보이면 그 캡처로 화면 판정을 하지 않는다(미확인).
   - 캡처의 "Game view was not redrawn" 경고는 판정 근거가 아니다. 경고가 나와도 11회 모두 범위 안이었다.
   - 스탬프는 캡처 시점만 증명한다. 화면의 모든 요소가 같은 프레임에 갱신됐다는 증명은 아니다.
   - 연속 녹화(영상)는 프레임마다 스탬프가 보이게 녹화하고, 판독할 수 없는 구간의 화면 판정은 미확인으로 둔다.
3. **항목마다 적용 가능한 독립 증거를 정해 대조한다.** 후보는 CLI 내부값, 최신 캡처의 표시값(이미지를 직접 열어 읽는다), 해당 구간 로그다.
   - 출처끼리 실제로 모순되면 **불일치**다. 통과가 아니다.
   - 필요한 증거를 확보하지 못했으면 **미확인**이다. 증거가 없는 것을 불일치로 치지 않는다.
   - 애니메이션처럼 대응하는 내부 수치나 로그가 없는 항목은 쓸 수 있는 증거만 정해 둔다.
   - 화면 밖에 있는 값은 스크롤해서 다시 찍는다.
4. **로그는 조작마다 구간을 남긴다.**
   - 조작 직전·직후에 `Editor.log` 줄 수를 기록한다. 관련 로그가 없는 게 정상이면 "구간 확인, 신규 관련 로그 없음"으로 적는다.
   - **Play 종료 직후 신규 예외도 따로 확인한다.**
   - `console get`이 `console status`의 건수보다 적게 돌려준 적이 있다. 콘솔만 믿지 않는다.
   - 스크립트 리로드 중 Pipeline의 `/api/exec` 처리에서 나는 `ObjectDisposedException`은 도구 쪽 기록일 가능성이 있다. 게임 오류와 구분해 적는다.
5. **조작 경로를 항목마다 적는다.** `ExecuteEvents.pointerClickHandler` 직접 발송은 핸들러 경로 확인이다. 물리 입력·히트 테스트·가림 검증이 아니다. 값 직접 대입이나 메서드 호출로 얻은 결과는 "사용자 조작 검증 아님"으로 표시한다.
6. **간헐 오류는 한 번 안 보였다고 해결로 치지 않는다.** Cell_Test의 Play 종료 예외는 3회 중 2회 나왔다.

## 4. 구현자(Claude)의 컴파일 확인

2026-11-17 사용자 결정으로 **구현자도 컴파일 오류 확인까지는 직접 한다.** 넘기기 전에 왕복을 줄이기 위해서다.

- 구현자가 하는 것: `unity recompile` 또는 `script recompile_status`로 자기 변경의 컴파일 오류를 보고 고친다.
- 구현자가 하지 않는 것: Play Mode 진입, 시나리오 실행, 화면 판정, QA 통과 선언.
- 인계 문구: "구현자 준비 점검: 컴파일 완료·오류 0 / 기능·화면 QA: 독립 검증 대기". 마지막 변경 뒤의 컴파일 결과라는 근거가 없으면 "기존 로그에서 오류 미발견"으로 낮춘다.
- 검증자는 구현자의 "오류 0"을 믿고 건너뛰지 않는다. 대상 프로젝트에서 다시 확인한다.
- 사용자가 에디터를 쓰는 중이거나 Codex QA가 진행 중이면 재컴파일 요청 전에 조율한다(배타 자원, `ParallelWorkContract.MD` §2).

## 5. 시험 기록 (근거)

| 회차 | 한 것 | 결과 |
|---|---|---|
| 1 | CLI만으로 Play 진입·조작·캡처·종료 | 경로는 끝까지 수행. 종료 예외와 미검증 항목 때문에 화면 QA는 미완료. 예전 문제(대상 지정 무시, Play 후 401)는 재현 안 됨 |
| 2 | 검증자가 알고 넣은 오답 2개 | 관측 차이는 찾았으나 화면 최신성을 증명하지 못함 |
| 3 | 프레임 스탬프 + 구현자 목록에 몰래 넣은 오답 2개 | screen 캡처 11회 모두 범위 안. 오답 2개를 불일치로 찾음. 일부 화면(스크롤 밖)과 항목별 로그 대조는 미완료 |

보고서: `.claude/briefs/`의 2026-11-17 시범 보고는 일회용이라 지웠다. 결과는 `.claude/UNFINISHED.md` Cell_Test 항목에 남아 있다.
미검증: 실행 중 에디터에 Pipeline 추가·업그레이드 직후의 동작, CLI·Pipeline 버전 불일치, 백그라운드에서 새 파일 `.meta` 생성, 모달 대화상자, 강제 갱신(`RepaintAllViews`) 효과(1회만 시험), `editor invoke_menu` 실행, **물리 입력(실제 포인터·터치·키보드) 경로** — CLI 대안을 찾지 못했다. 물리 입력이 필요한 항목은 사람이 확인하거나 미확인으로 반환한다.
