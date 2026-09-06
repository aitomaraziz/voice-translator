@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Voice Translator - المترجم الصوتي الفوري

REM ============================================================
REM  Voice Translator - internal Microsoft Edge app-window
REM  Runs the translator inside Edge so the neural Arabic voice
REM  (Edge TTS) is accepted by the Bing speech service.
REM ============================================================

set "EDGE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined EDGE if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set "EDGE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

if not defined EDGE (
    echo Microsoft Edge not found.
    pause
    exit /b 1
)

REM --app = standalone window (no tabs / address bar), real Edge engine + Edg/ User-Agent
start "" "%EDGE%" --app=https://aitomaraziz.github.io/voice-translator/ --window-size=460,800

endlocal