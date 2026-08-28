# ProjectVerificationCommands

HouseRulez의 Unity CLI/Pipeline 전용 기계 판정 명령. 구현은 `<원본:HouseRulez>/Assets/Editor/Verification/ProjectVerificationCommands.cs`에 있으며 Editor 전용 `Assembly-CSharp-Editor`에서 로드된다.

## 2026-08-28-0 — `verify-compile` / `verify-tables` 구현

### 호출

```powershell
unity command verify-compile --project-path "<원본:HouseRulez>" --format json
unity command verify-tables --project-path "<원본:HouseRulez>" --format json
```

### `verify-compile`

- `EditorApplication.isCompiling`이 true면 실패.
- `EditorUtility.scriptCompilationFailed`가 true면 실패.
- 둘 다 아니면 최신 Unity 스크립트 컴파일 성공으로 종료 코드 0.
- **컴파일을 새로 요청하지는 않는다.** 파일 변경 후 Unity가 import/compile을 마치고 `unity status`가 `ready`가 된 다음 호출해야 한다.

### `verify-tables`

`Assets/Resources/Table/*.csv` 전체를 검사한다.

- 파일명 `{Name}Table.csv`에 대응하는 `{Name}Record` 타입이 있어야 한다.
- 빈 헤더와 중복 헤더 금지.
- CSV 헤더는 Record의 public instance 필드명 및 대소문자와 정확히 같아야 한다.
- Record에 직접 선언된 public 필드는 모두 헤더에 있어야 한다.
- 상속받은 `Record.Id`는 기존 `UITable`/`SoundTable` 등에서 의도적으로 생략하므로 선택 필드다. CSV에 `Id`가 있으면 타입 검증은 한다.
- 각 행의 열 수가 헤더 수와 같아야 한다.
- 각 값을 실제 필드 타입으로 변환할 수 있어야 한다. float는 런타임 로더와 동일하게 invariant culture를 쓴다.
- 현재 9개 CSV 테이블을 검사한다.

프로젝트의 실제 `TableManager.LoadCsvTable<T>()`가 따옴표/이스케이프 CSV 파서를 쓰지 않고 단순 쉼표 분리를 하므로 검증기도 같은 형식을 따른다.

### 실패 계약 검증

- 정상 상태: 두 명령 모두 종료 코드 0.
- 임시 `__VerifierFailureTable.csv`를 추가해 대응 Record 부재를 만들었을 때 `verify-tables` 종료 코드 6과 원인 메시지 반환 확인 후 임시 파일 제거.
- 임시 문법 오류 C# 파일을 추가했을 때 `verify-compile` 종료 코드 6과 최신 컴파일 실패 메시지 반환 확인 후 임시 파일 제거·재컴파일.
- 최종 재검증: 두 명령 종료 코드 0, Unity 콘솔 오류 0건.
