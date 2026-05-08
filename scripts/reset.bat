@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

set "CONFIG_DIR=%USERPROFILE%\.aivc-dach"

echo.
echo 🔄 AIVC DACH Reset
echo.
echo The following will be deleted:
echo   - Brand config
echo   - Cache and temporary files
echo.
echo Will NOT be deleted:
echo   - Renderer install ^(renderer\node_modules\^)
echo   - Your logos in %CONFIG_DIR%\assets\
echo   - Rendered videos in output\
echo   - Legacy config in %USERPROFILE%\.hyperframes-vbc\ ^(left untouched^)
echo.
set /p confirm=Really reset? (y/N):

if /i not "%confirm%"=="y" (
    if /i not "%confirm%"=="yes" (
        echo ❌ Reset cancelled.
        pause
        exit /b 0
    )
)

if exist "%CONFIG_DIR%\brand.config.json" (
    copy "%CONFIG_DIR%\brand.config.json" "%CONFIG_DIR%\brand.config.backup.json" >nul
    echo ✅ Backup saved
)

del /q "%CONFIG_DIR%\brand.config.json" 2>nul
rmdir /s /q "%CONFIG_DIR%\cache" 2>nul

echo.
echo ✅ Reset complete!
echo.
echo Set up again by telling Claude Code:
echo   "Set up brand"
echo.
pause
