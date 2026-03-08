@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURATION ---
set "TARGET_URL=https://www.google.com"
set "EXT_DIR=%~dp0dist"
set "USER_DATA_DIR=%~dp0.chromiumCache"
set "PREFS_DIR=%USER_DATA_DIR%\Default"
set "PREFS_FILE=%PREFS_DIR%\Preferences"
set "CDP_PORT=9222"

:: Command line argument (default to 'start')
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=start"

if /i "%COMMAND%"=="start" goto :start_chromium
if /i "%COMMAND%"=="refresh" goto :refresh_extension

echo Usage: %~nx0 {start^|refresh}
echo   start   - Launch Chrome with the extension (Default)
echo   refresh - Reload the extension and refresh all pages
exit /b 1

:start_chromium
:: 1. Ensure directory exists
if not exist "%PREFS_DIR%" mkdir "%PREFS_DIR%"

:: 2. Pre-set Developer Mode (keeps the script simple)
if not exist "%PREFS_FILE%" (
    echo {"extensions": {"ui": {"developer_mode": true}}} > "%PREFS_FILE%"
)

:: 3. Launch (URL placed first for reliability)
echo 🚀 Launching Chrome to %TARGET_URL% on port %CDP_PORT%...
:: We use 'start chrome' as it usually handles the path discovery on Windows
start chrome ^
  "%TARGET_URL%" ^
  --remote-debugging-port=%CDP_PORT% ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --disable-extensions-except="%EXT_DIR%" ^
  --load-extension="%EXT_DIR%" ^
  --unsafely-disable-devtools-self-xss-warnings ^
  --no-first-run ^
  --auto-open-devtools-for-tabs
goto :eof

:refresh_extension
echo 🔍 Checking for running Chrome on port %CDP_PORT%...
curl -s "http://localhost:%CDP_PORT%/json" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Chrome does not appear to be running on port %CDP_PORT%.
    echo    Please run "%~nx0 start" first.
    exit /b 1
)

echo 🛠 Building...
call npm run build:debug

echo 🔄 Reloading extension...
call npx tsx scripts/reload.ts
goto :eof
