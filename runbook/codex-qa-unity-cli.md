# Codex QA — Unity 공식 CLI 경로와 판정 정확도 규칙

마지막 적용: 2026-11-25. **MCP for Unity는 2026-11-17 사용자 결정으로 걷어냈다.** Unity 에디터 조작·Play Mode QA는 공식 CLI(`unity`) + 프로젝트의 `com.unity.pipeline`으로 한다. 이 문서는 공통 준비·판정 증거의 정본이다.
근거는 Cell_Test 시범 3회(CLI 1.0.1 + Pipeline 1.0.0). `runbook/codex-qa-full.md`·`codex-qa-quick.md`가 이 문서를 참조한다.

## 1. 준비

- CLI 설치 확인: `unity --version`. 없으면 사용자에게 묻고 `winget install --id Unity.CLI --exact`(임의 설치 금지).
- 프로젝트에 `com.unity.pipeline`이 없으면 `unity pipeline install --project-path <경로> --non-interactive`. 설치는 `Packages/manifest.json`·`packages-lock.json`을 바꾸므로 **설치 전에 사용자 승인을 받는다.** 원본 백업은 만들지 않는다(`runbook/feedback.md` 「원본 파일 백업을 만들지 않는다」, 2026-11-25 사용자 결정).
- CLI는 명령을 부를 때 실행 중인 에디터에 붙는다. 세션을 먼저 열고 에디터를 나중에 켜도 된다.
- 에디터가 둘 이상 떠 있으면 대상을 반드시 지정한다. 지정하지 않으면 Pipeline 명령 검색이 거부된다(2026-11-17 실측).
- QA는 구현에 참여하지 않은 Codex 또는 사람이 맡는다([CODEX.md](../CODEX.md) 독립 QA 경계). 같은 머신의 원본 에디터에서 실행하며 워크트리·원격에서 실행하지 않는다. Unity 조작은 한 번에 하나만 한다([병렬 계약](../ParallelWorkContract.MD) §2).

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

### 공통 시작·프레임 진행 절차

- `unity status`가 ready인지 확인한다. `STATUS_PIPELINE_LOAD_PENDING`이면 로딩 완료까지 기다린다. 로딩이 계속 실패하거나 정한 대기 시간을 넘기면 중단하고 원인을 보고한다. 에디터 꺼짐·Pipeline 미설치·컴파일 오류 안전 모드 등 다른 준비 실패도 중단·보고한다. 명령·인자는 위 `--help`로 확인하며 추측하지 않는다.
- 변경 반영(리임포트·재컴파일 요청) → 완료 대기 → 최신 상태와 콘솔의 컴파일 오류 0건을 확인한다. 완료·최신성을 확인하지 못하면 Play에 들어가지 않고 **QA 미확인(컴파일 미확인)**으로 반환한다. 여러 수정은 컴파일 한 번 뒤 항목별로 검증하며 구현자 결과도 §4대로 재확인한다.
- Play 전에 `editor set_auto_tick`을 설정한다. Play 직후 `script eval --file`로 `EditorApplication.isPlaying`과 `Time.frameCount`·`Time.time`의 실제 증가를 확인한다. 시작 성공·sleep만으로 시간 진행을 가정하지 않는다.
- 자동 틱에도 프레임이 멈출 때만 OS 포커스를 시도한다. 그래도 진행하지 않으면 `script eval --file`에서 `EditorApplication.Step()`을 유한 횟수·소량 배치로 호출하고 실제 시간·프레임 증가를 확인한다. 과거 수동 진행의 약 0.02초/회 관측을 고정 시간으로 가정하지 않는다.

## 3. 판정 정확도 규칙 (과거 오판 재발 방지)

근거: 2026-09-15 내부 메서드 직접 호출·구현자 오답 기준으로 오판했고, 2026-11-17에는 캡처 최신성·콘솔 누락을 확인했다.

1. **기대값은 검증자가 직접 세운다.** 기획 문서·데이터(CSV)·코드에서 수치 기대값과 근거(파일:줄)를 먼저 적는다. 구현자가 준 목록은 그대로 쓰지 않고 대조 대상으로만 둔다. 문서와 코드가 다르면 그 자체를 발견으로 기록한다.
   - 원본 설정값과 보너스·초기화가 더해진 최종 표시값을 구분해 확인한다. 화면 숫자만 보고 판정하지 않는다([검사기 런북](verification-scripts.md)의 2026-09-10 오판 근거).
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
5. **조작 경로를 항목마다 적는다.** 씬 전환·화면 이동을 검증할 때 `OnClickXxx()`를 직접 호출하지 않는다(Edit Mode에서도 실행될 수 있다). `script eval`로 Button을 조회해 `ExecuteEvents.pointerClickHandler`를 발송한 결과는 **핸들러 경로 확인**이다. 실제 클릭·물리 입력·히트 테스트·가림 검증과 구분한다. 값 직접 대입이나 메서드 호출로 얻은 결과는 "사용자 조작 검증 아님"으로 표시한다.
6. **간헐 오류는 한 번 안 보였다고 해결로 치지 않는다.** Cell_Test의 Play 종료 예외는 3회 중 2회 나왔다.
7. **항목별 결과를 보고한다.** 통과/실패/불일치/미확인을 구분하고, 필요한 증거·물리 입력을 확보하지 못한 항목은 미확인으로 남긴다. 일부 통과를 전체 통과로 확대하지 않는다.

## 4. 구현자(Claude)의 컴파일 확인

2026-11-17 사용자 결정으로 **구현자도 컴파일 오류 확인까지는 직접 한다.** 넘기기 전에 왕복을 줄이기 위해서다.

- 구현자가 하는 것: `unity recompile` 또는 `script recompile_status`로 자기 변경의 컴파일 오류를 보고 고친다.
- 구현자가 하지 않는 것: Play Mode 진입, 시나리오 실행, 화면 판정, QA 통과 선언.
- 인계 문구: "구현자 준비 점검: 컴파일 완료·오류 0 / 기능·화면 QA: 독립 검증 대기". 마지막 변경 뒤의 컴파일 결과라는 근거가 없으면 "기존 로그에서 오류 미발견"으로 낮춘다.
- 검증자는 구현자의 "오류 0"을 믿고 건너뛰지 않는다. 대상 프로젝트에서 다시 확인한다.
- 사용자가 에디터를 쓰는 중이거나 Codex QA가 진행 중이면 재컴파일 요청 전에 조율한다(배타 자원, `ParallelWorkContract.MD` §2).

## 5. 시험 기록 (근거)

2026-11-17 Cell_Test 시범 3회(CLI 1.0.1 + Pipeline 1.0.0): Play 진입·조작·캡처·종료 경로를 수행했고 대상 지정 무시·Play 후 401은 재현되지 않았다. 2회차는 알려진 오답 2개의 관측 차이만 확인했고 화면 최신성 증명은 실패했다. 3회차는 스탬프 캡처 11회 모두 범위 안이고 숨긴 오답 2개를 불일치로 검출했지만, 종료 예외·스크롤 밖 화면·항목별 로그 대조 때문에 전체 QA는 미완료다.

보고서: `.claude/briefs/`의 2026-11-17 시범 보고는 일회용이라 지웠다. 결과는 `.claude/UNFINISHED.md` Cell_Test 항목에 남아 있다.
미검증: 실행 중 에디터에 Pipeline 추가·업그레이드 직후의 동작, CLI·Pipeline 버전 불일치, 백그라운드에서 새 파일 `.meta` 생성, 모달 대화상자, 강제 갱신(`RepaintAllViews`) 효과(1회만 시험), `editor invoke_menu` 실행, **물리 입력(실제 포인터·터치·키보드) 경로** — CLI 대안을 찾지 못했다. 물리 입력이 필요한 항목은 사람이 확인하거나 미확인으로 반환한다.
