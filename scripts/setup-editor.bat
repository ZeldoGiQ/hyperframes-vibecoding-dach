@echo off
REM AIVC DACH alpha.2 - editor + overlay engine setup.
REM Run from the repo root: scripts\setup-editor.bat

setlocal enabledelayedexpansion

cd /d "%~dp0\.."
set "REPO_ROOT=%CD%"

echo == AIVC DACH editor setup ==

where bun >nul 2>&1
if errorlevel 1 (
  echo ERROR: bun is not on PATH. Install it from https://bun.sh and re-run this script.
  exit /b 1
)
for /f "tokens=*" %%v in ('bun --version') do echo bun: %%v

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: node is not on PATH. The ffmpeg-static postinstall step needs Node.
  echo Install Node ^>= 18 from https://nodejs.org and re-run.
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo node: %%v

echo.
echo Step 1/5: bun install in editor\
cd /d "%REPO_ROOT%\editor"
call bun install
if errorlevel 1 exit /b 1

echo.
echo Step 2/5: bun install in editor\apps\web\
cd /d "%REPO_ROOT%\editor\apps\web"
call bun install
if errorlevel 1 exit /b 1

echo.
echo Step 3/5: ffmpeg-static postinstall (Bun skips it by default)
if exist "node_modules\ffmpeg-static\ffmpeg.exe" (
  echo   ffmpeg binary already present, skipping.
) else (
  if exist "node_modules\ffmpeg-static\install.js" (
    node node_modules\ffmpeg-static\install.js
    if errorlevel 1 exit /b 1
    echo   ffmpeg binary downloaded.
  ) else (
    echo ERROR: ffmpeg-static not installed under editor\apps\web\. Check step 2.
    exit /b 1
  )
)

echo.
echo Step 4/5: Puppeteer Chrome (~200 MB, one-shot)
call bun x puppeteer browsers install chrome
if errorlevel 1 exit /b 1

echo.
echo Step 5/5: .env.local from .env.example
if exist ".env.local" (
  echo   .env.local exists already, leaving it untouched.
) else (
  copy /Y ".env.example" ".env.local" >nul
  echo   .env.local created - open it and set AIVC_AI_PROVIDER + key + model.
)

echo.
echo == Setup complete ==
echo.
echo Next steps:
echo   1. Edit editor\apps\web\.env.local - set AIVC_AI_PROVIDER and the matching *_API_KEY + *_MODEL.
echo      Model docs: see the link in the file for each provider.
echo   2. From editor\apps\web\ run:  bun run dev
echo   3. Open http://localhost:3000 in Chrome.

endlocal
