@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

REM ============================================================
REM   Hyperframes Addon by Vibe Coding DACH - Windows Installer
REM   Lokaler Renderer (Puppeteer + ffmpeg) - v1.1.0
REM ============================================================

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║   🎬 Hyperframes Addon by Vibe Coding DACH               ║
echo ║   Installation startet... (v1.1.0 - lokaler Renderer)    ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Repo-Root = ein Level ueber scripts\
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
pushd "%REPO_ROOT%" >nul
set "REPO_ROOT=%CD%"
popd >nul
set "RENDERER_DIR=%REPO_ROOT%\renderer"
set "CONFIG_DIR=%USERPROFILE%\.hyperframes-vbc"
set "ERRORS=0"

REM --- Schritt 1: Dependency-Check ---
echo [1/5] System-Check laeuft...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js fehlt
    echo    Installiere mit: winget install OpenJS.NodeJS
    set /a ERRORS+=1
) else (
    echo ✅ Node.js gefunden
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python fehlt
    echo    Installiere mit: winget install Python.Python.3.11
    set /a ERRORS+=1
) else (
    echo ✅ Python gefunden
)

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ffmpeg fehlt
    echo    Installiere mit: winget install Gyan.FFmpeg
    set /a ERRORS+=1
) else (
    echo ✅ ffmpeg gefunden
)

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git fehlt
    echo    Installiere mit: winget install Git.Git
    set /a ERRORS+=1
) else (
    echo ✅ Git gefunden
)

echo.
if %ERRORS% gtr 0 (
    echo ⚠️  Es fehlen %ERRORS% Tools. Installiere sie zuerst und starte dann neu.
    echo.
    pause
    exit /b 1
)

REM --- Schritt 2: Verzeichnisse anlegen ---
echo [2/5] Verzeichnisse werden angelegt...
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"
if not exist "%CONFIG_DIR%\assets" mkdir "%CONFIG_DIR%\assets"
echo ✅ Verzeichnisse bereit
echo.

REM --- Schritt 3: Renderer (Puppeteer + ffmpeg-Wrapper) ---
echo [3/5] Lokaler Renderer wird installiert...
echo     Hinweis: Beim ersten Mal laedt Puppeteer ca. 150 MB Chromium herunter.
echo     Das passiert nur einmal und braucht 1-3 Minuten je nach Internet.
echo.

if not exist "%RENDERER_DIR%\package.json" (
    echo ❌ renderer\package.json nicht gefunden unter: %RENDERER_DIR%
    echo    Bist du sicher, dass du im hyperframes-vibecoding-dach-Repo bist?
    pause
    exit /b 1
)

pushd "%RENDERER_DIR%"
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ npm install fehlgeschlagen.
    popd
    pause
    exit /b 1
)
popd
echo ✅ Renderer installiert
echo.

REM --- Schritt 4: Faster Whisper (optional) ---
echo [4/5] Faster Whisper wird installiert (optional, fuer Subtitles)...
pip install faster-whisper --quiet
if %errorlevel% neq 0 (
    echo ⚠️  Faster Whisper konnte nicht installiert werden.
    echo     Nicht schlimm - Subtitle-Features sind erst in v1.2 geplant.
    echo     Du kannst es spaeter nachholen mit: pip install faster-whisper
) else (
    echo ✅ Faster Whisper bereit
)
echo.

REM --- Schritt 5: Brand-Config anlegen (Default) ---
echo [5/5] Standard-Konfiguration wird erstellt...
if not exist "%CONFIG_DIR%\brand.config.json" (
    copy /y "%REPO_ROOT%\brand.config.example.json" "%CONFIG_DIR%\brand.config.json" >nul
    echo ✅ brand.config.json angelegt ^(Default-Werte aus brand.config.example.json^)
) else (
    echo ℹ️  brand.config.json existiert bereits. Ueberspringe.
)
echo.

REM --- Fertig ---
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║   🎉 Installation erfolgreich!                           ║
echo ║                                                          ║
echo ║   Naechster Schritt: Sag Claude Code:                    ║
echo ║   "Starte den Brand-Wizard"                              ║
echo ║                                                          ║
echo ║   Oder direkt:                                           ║
echo ║   "Mach mir ein News-Intro ueber AI"                     ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
