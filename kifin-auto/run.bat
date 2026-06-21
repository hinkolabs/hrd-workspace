@echo off
setlocal EnableDelayedExpansion

set "KIFIN_DIR=%~dp0"
set "ROOT=%KIFIN_DIR%.."
cd /d "%ROOT%"

title KIFIN Auto Learning

echo ========================================
echo  KIFIN Auto Learning
echo ========================================
echo.
echo  1. Browser opens - login at kifin.or.kr
echo  2. Go to course page with [학습하기] buttons
echo  3. Press Enter in THIS window (do not close it!)
echo.

if not exist "%KIFIN_DIR%config.json" (
  copy "%KIFIN_DIR%config.example.json" "%KIFIN_DIR%config.json" >nul 2>&1
)

echo Checking Playwright Chromium...
call npx playwright install chromium
if errorlevel 1 (
  echo [ERROR] Playwright install failed
  goto :done
)

echo.
echo Starting automation...
call node "%KIFIN_DIR%run.mjs"
set "EXITCODE=!ERRORLEVEL!"

if !EXITCODE! neq 0 (
  echo.
  echo [ERROR] Script failed. See kifin-auto\error.log
)

:done
echo.
pause
