@echo off
chcp 65001 >nul

:: 使用批处理文件当前目录作为基础路径，避免路径解析问题
setlocal enabledelayedexpansion
set BASEDIR=%~dp0

echo 正在启动服务...
echo.

REM 启动AI代理服务器（端口8001）
REM 在新窗口中运行，并将工作目录切换到项目根目录
start "" cmd /k "cd /d "%BASEDIR%" && python "%BASEDIR%scripts\ai-proxy.py""
timeout /t 1 /nobreak >nul

REM 启动Web服务器（端口8000）
start "" cmd /k "cd /d "%BASEDIR%" && python -m http.server 8000"
timeout /t 1 /nobreak >nul

echo.
echo 服务启动命令已发出（请在打开的窗口中查看运行日志）
echo.
echo 访问地址: http://localhost:8000/pages/index.html
echo.
endlocal
pause
