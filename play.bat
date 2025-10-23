@echo off
chcp 65001 >nul

:: Use batch file current directory as base path to avoid path parsing issues
setlocal enabledelayedexpansion
set BASEDIR=%~dp0

echo Starting services...
echo.

REM Start AI proxy server (port 8001)
REM Run in new window and change working directory to project root
start "" cmd /k "cd /d "%BASEDIR%" && python "%BASEDIR%scripts\ai-proxy.py""
timeout /t 1 /nobreak >nul

REM Start Web server (port 8000)
start "" cmd /k "cd /d "%BASEDIR%" && python -m http.server 8000"
timeout /t 1 /nobreak >nul

echo.
echo Services started (please check the running logs in the opened windows)
echo.
echo Access URL: http://localhost:8000/pages/index.html
echo.
endlocal
pause
