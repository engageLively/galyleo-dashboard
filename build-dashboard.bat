@echo off
setlocal

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%app
set SERVICE_STATIC=%SCRIPT_DIR%..\jh2\galyleo-service-platform\src\static\studio

echo === Building React editor (VITE_BASE_URL=/services/galyleo/static/studio/) ===
cd /d "%APP_DIR%"

set VITE_BASE_URL=/services/galyleo/static/studio/
set VITE_DEFAULT_MODE=edit
call npm run build
if %ERRORLEVEL% neq 0 (
    echo React build failed.
    exit /b 1
)

echo.
echo === Copying dist/ to galyleo-service-platform/src/static/studio/ ===
if exist "%SERVICE_STATIC%" rmdir /S /Q "%SERVICE_STATIC%"
xcopy /E /I /Y "dist" "%SERVICE_STATIC%"
if %ERRORLEVEL% neq 0 (
    echo Copy failed.
    exit /b 1
)

echo.
echo Done. Next: run build-service.sh from WSL to rebuild the service image.
endlocal
