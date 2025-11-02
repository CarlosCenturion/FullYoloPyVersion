@echo off
echo ============================================
echo  YOLO Object Detection Explorer Cleanup
echo ============================================
echo.

echo This will remove all installed dependencies and cached files.
echo.

set /p choice="Are you sure you want to continue? (y/N): "
if /i not "%choice%"=="y" goto :exit

echo.
echo Cleaning Python virtual environment...
if exist "backend\venv" (
    rmdir /s /q backend\venv
    echo Removed backend\venv
) else (
    echo No Python virtual environment found.
)

echo.
echo Cleaning Node.js dependencies...
if exist "frontend\node_modules" (
    rmdir /s /q frontend\node_modules
    echo Removed frontend\node_modules
) else (
    echo No Node.js dependencies found.
)

echo.
echo Cleaning model cache...
if exist "models" (
    for /d %%i in (models\*) do rmdir /s /q "%%i" 2>nul
    del /q models\* 2>nul
    echo Cleaned models directory
) else (
    echo No models directory found.
)

echo.
echo Cleaning logs...
if exist "logs" (
    del /q logs\* 2>nul
    echo Cleaned logs directory
) else (
    echo No logs directory found.
)

echo.
echo ============================================
echo  Cleanup completed!
echo  Run start.bat to reinstall everything.
echo ============================================
echo.

:exit
pause
