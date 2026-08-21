@echo off
chcp 65001 >nul
title Orca 시작 시퀀스

rem Orca 기본 작동 시퀀스
rem   1. Unity 프로젝트 선택 -> 해당 버전 에디터로 실행 (MCP 자동 연결)
rem   2. Orca 실행
rem Orca 자체에는 앱 시작 훅이 없으므로, 이 래퍼가 그 역할을 한다.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0UnityLauncher.ps1"

echo.
echo   Orca 실행 중...

start "" "%LOCALAPPDATA%\Programs\orca\Orca.exe"

timeout /t 2 >nul
exit /b 0
