@echo off
chcp 65001 >nul

setlocal enabledelayedexpansion
set BASEDIR=%~dp0

echo Starting services...
echo.

start "" cmd /k "cd /d "%BASEDIR%" && python "%BASEDIR%scripts\ai-proxy.py""
timeout /t 1 /nobreak >nul

start "" cmd /k "cd /d "%BASEDIR%" && python -m http.server 8000"
timeout /t 1 /nobreak >nul

echo.
echo Services started (please check the running logs in the opened windows)
echo.
echo Access URL: http://localhost:8000/pages/index.html
echo.
endlocal
pause
