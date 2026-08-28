# QARecorderToolbar

연관: [[QARecorder]]

Unity 에디터 메인 툴바 우측에 QA 녹화 시작/중지 버튼을 등록하는 에디터 전용 클래스.

## 2026-08-28 — Unity 6.3 공식 MainToolbar API로 전환

### 원인

기존 구현은 `[InitializeOnLoad]`에서 `UnityEditor.Toolbar.m_Root`를 리플렉션으로 가져온 뒤 `ToolbarZoneRightAlign`에 `VisualElement`를 직접 추가했다. Unity 6000.3.16f1은 이 비지원 삽입을 감지해 에디터 시작 시 경고를 출력하고 해당 요소를 기본적으로 숨긴다.

### 수정

- 내부 필드 리플렉션과 `delayCall` 기반 직접 삽입을 제거했다.
- `[MainToolbarElement]` 정적 팩토리 두 개가 `MainToolbarButton`을 반환하도록 변경했다.
- `QA/Start Recording`, `QA/Stop Recording`을 `MainToolbarDockPosition.Right`의 0, 1 인덱스에 등록했다.
- 버튼 콜백은 기존 `QARecorder.StartRecording`, `QARecorder.StopRecording`을 그대로 사용한다.

### 검증

- Unity 6000.3.16f1 에디터 재시작 후 비지원 툴바 삽입 경고 및 컴파일 오류 0건.
- 공식 MainToolbar 레지스트리에 두 요소가 Right/0, Right/1로 등록됨을 확인했다.
- 메인 툴바 Visual Tree에서 `● QA Rec`, `■ QA Stop`이 표시 상태인 `EditorToolbarButton`으로 생성됨을 확인했다.
- `unity command verify-compile`: 성공, 종료 코드 0.
- `unity command verify-tables`: CSV 9개 성공, 종료 코드 0.
