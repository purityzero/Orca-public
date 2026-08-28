# 미완료 작업

## 2026-08-28-0 — Unity CLI/Pipeline 설치 완료, 프로젝트 검증 명령 구현 남음

- Windows Unity CLI `1.0.0-beta.6` 설치 완료 (`winget install Unity.CLI`).
- HouseRulez `Packages/manifest.json`에 `com.unity.pipeline` `0.5.0-exp.1` 추가 완료.
- 패키지 추가 직후에는 실행 중인 에디터에 Pipeline 서버가 안 떠서 에디터를 한 번 재시작했다.
- 재시작 후 `unity status --format json` → HouseRulez `state: ready`, 포트 `7800` 확인.
- `unity command editor_status --project-path <원본:HouseRulez> --format json` 실행 성공.
- 실행 중 패키지를 추가한 직후 immutable PackageCache 변경 알림이 한 번 남았으나, 재시작·콘솔 초기화 뒤 같은 명령을 재실행했을 때 오류 0건으로 재발하지 않음.
- **남은 작업:** `[CliCommand]` 기반 `verify-compile`/`verify-tables`를 구현해 컴파일과 테이블 정합성을 종료 코드로 판정하도록 만들기. 구현 메커니즘은 Orca 루트 `README.md` 부록 A 참고.
- 참고: `unity doctor`는 CLI/PATH/설치 에디터 환경 진단용이다. Pipeline 연결 여부는 `unity status`/`unity pipeline list`로 확인한다.

## 2026-08-28-1 — QARecorderToolbar Unity 6 지원 API 전환 필요

- 에디터 재시작 시 `Assets/Editor/QA/QARecorderToolbar.cs:64`에서 Unity 메인 툴바에 비지원 방식으로 커스텀 요소를 삽입한다는 오류가 1회 확인됨.
- Pipeline 설치 오류는 아니며 기존 QA 툴바 구현 문제다.
- Unity 6 `Toolbars.MainToolbar` 공식 API를 사용하도록 마이그레이션하고, 에디터 재시작 후 콘솔 오류가 사라지는지 검증해야 한다.
