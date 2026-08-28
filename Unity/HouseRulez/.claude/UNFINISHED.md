# 미완료 작업

## 2026-08-28-1 — QARecorderToolbar Unity 6 지원 API 전환 필요

- 에디터 재시작 시 `Assets/Editor/QA/QARecorderToolbar.cs:64`에서 Unity 메인 툴바에 비지원 방식으로 커스텀 요소를 삽입한다는 오류가 1회 확인됨.
- Pipeline 설치 오류는 아니며 기존 QA 툴바 구현 문제다.
- Unity 6 `Toolbars.MainToolbar` 공식 API를 사용하도록 마이그레이션하고, 에디터 재시작 후 콘솔 오류가 사라지는지 검증해야 한다.
