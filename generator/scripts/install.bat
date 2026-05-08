@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

REM ============================================================
REM   AIVC DACH - Windows Installer
REM   Local renderer (Puppeteer + ffmpeg) - v2.0.0
REM   by ZELDOgiq ^& Media AI AT
REM ============================================================

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║   🎬 AIVC DACH                                           ║
echo ║   Installation starting... (v2.0.0 - local renderer)     ║
echo ║   by ZELDOgiq ^& Media AI AT                              ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Layout in v3.0.0+:
REM   <repo>\generator\scripts\install.bat   (this file)
REM   <repo>\generator\renderer\
REM   <repo>\shared\brand.config.example.json
set "SCRIPT_DIR=%~dp0"
set "GENERATOR_ROOT=%SCRIPT_DIR%.."
pushd "%GENERATOR_ROOT%" >nul
set "GENERATOR_ROOT=%CD%"
popd >nul
pushd "%GENERATOR_ROOT%\.." >nul
set "REPO_ROOT=%CD%"
popd >nul
set "RENDERER_DIR=%GENERATOR_ROOT%\renderer"
set "SHARED_DIR=%REPO_ROOT%\shared"
set "NEW_CONFIG_DIR=%USERPROFILE%\.aivc-dach"
set "LEGACY_CONFIG_DIR=%USERPROFILE%\.hyperframes-vbc"
set "ERRORS=0"
set "WARNINGS=0"

REM --- Step 1: Dependency check ---
echo [1/6] System check...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js missing
    echo    Install with: winget install OpenJS.NodeJS
    set /a ERRORS+=1
) else (
    echo ✅ Node.js found
)

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git missing
    echo    Install with: winget install Git.Git
    set /a ERRORS+=1
) else (
    echo ✅ Git found
)

REM Optional: Python (only for subtitle features)
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Python missing ^(optional, only for subtitles^)
    echo    Install with: winget install Python.Python.3.11
    set /a WARNINGS+=1
) else (
    echo ✅ Python found
)

REM ffmpeg detection: PATH, then common paths, else fall back to ffmpeg-static via npm
set "FFMPEG_FOUND="
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    set "FFMPEG_FOUND=1"
) else (
    if exist "C:\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_FOUND=C:\ffmpeg\bin\ffmpeg.exe"
    if exist "%ProgramFiles%\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_FOUND=%ProgramFiles%\ffmpeg\bin\ffmpeg.exe"
)
if defined FFMPEG_FOUND (
    echo ✅ ffmpeg found
) else (
    echo ⚠️  ffmpeg missing in PATH ^(will fall back to bundled ffmpeg-static via npm^)
    set /a WARNINGS+=1
)

echo.
if %ERRORS% gtr 0 (
    echo ❌ %ERRORS% required tool^(s^) missing. Install them first and re-run.
    pause
    exit /b 1
)
if %WARNINGS% gtr 0 (
    echo ℹ️  %WARNINGS% optional tool^(s^) missing - continuing anyway.
)
echo.

REM --- Step 2: Directories + legacy config migration ---
echo [2/6] Preparing directories...
if not exist "%NEW_CONFIG_DIR%" mkdir "%NEW_CONFIG_DIR%"
if not exist "%NEW_CONFIG_DIR%\assets" mkdir "%NEW_CONFIG_DIR%\assets"

if exist "%LEGACY_CONFIG_DIR%\brand.config.json" (
    if not exist "%NEW_CONFIG_DIR%\brand.config.json" (
        copy /y "%LEGACY_CONFIG_DIR%\brand.config.json" "%NEW_CONFIG_DIR%\brand.config.json" >nul
        if exist "%LEGACY_CONFIG_DIR%\assets" (
            if not exist "%NEW_CONFIG_DIR%\assets\_legacy" (
                xcopy /e /i /q "%LEGACY_CONFIG_DIR%\assets" "%NEW_CONFIG_DIR%\assets\_legacy" >nul 2>&1
            )
        )
        echo ℹ️  Migrated config from %LEGACY_CONFIG_DIR% to %NEW_CONFIG_DIR% - you can delete the old folder when ready.
    )
)
echo ✅ Directories ready
echo.

REM --- Step 3: Renderer (Puppeteer + ffmpeg-static) ---
echo [3/6] Installing local renderer...
echo     Heads up: on first install Puppeteer downloads ~150 MB of Chromium.
echo     This happens once and takes 1-3 minutes depending on your connection.
echo.

if not exist "%RENDERER_DIR%\package.json" (
    echo ❌ renderer\package.json not found at: %RENDERER_DIR%
    echo    Are you sure you're inside the aivc-dach repo?
    pause
    exit /b 1
)

pushd "%RENDERER_DIR%"
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ npm install failed.
    popd
    pause
    exit /b 1
)
popd
echo ✅ Renderer installed
echo.

REM --- Step 4: Faster Whisper (optional) ---
echo [4/6] Installing Faster Whisper (optional, for future subtitles)...
where pip >nul 2>nul
if %errorlevel% equ 0 (
    pip install faster-whisper --quiet 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️  faster-whisper skipped ^(not needed for MVP rendering, install later for subtitle features^)
    ) else (
        echo ✅ Faster Whisper ready
    )
) else (
    echo ⚠️  pip not found - skipping faster-whisper. Subtitles are planned for v2.1.
)
echo.

REM --- Step 5: Brand config ---
echo [5/6] Setting up default brand config...
if not exist "%NEW_CONFIG_DIR%\brand.config.json" (
    copy /y "%SHARED_DIR%\brand.config.example.json" "%NEW_CONFIG_DIR%\brand.config.json" >nul
    echo ✅ brand.config.json created ^(defaults from brand.config.example.json^)
) else (
    echo ℹ️  brand.config.json already exists. Skipping.
)
echo.

REM --- Step 6: Smoke test render ---
echo [6/6] Running test render...
pushd "%GENERATOR_ROOT%"
if not exist "output" mkdir "output"
call node "%RENDERER_DIR%\render.js" --template news-intro --vars "{\"TOPIC\":\"AIVC DACH installed\",\"SUBTITLE\":\"Your first test render\"}" --quiet
if %errorlevel% equ 0 (
    echo ✅ Test render successful! Check ./output/ for the MP4.
    echo.
    echo     ^> Tell Claude Code: "Make a news intro about my first AIVC DACH video"
) else (
    echo ⚠️  Test render failed. Templates and config are installed though - see TROUBLESHOOTING.md.
)
popd
echo.

REM --- Done ---
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║   🎉 Installation complete!                              ║
echo ║                                                          ║
echo ║   Next: open Claude Code in any folder and try one of:   ║
echo ║                                                          ║
echo ║   * "Make a news intro about [topic]"                    ║
echo ║   * "Set up brand"   (optional brand wizard)             ║
echo ║   * "Show examples"                                      ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
