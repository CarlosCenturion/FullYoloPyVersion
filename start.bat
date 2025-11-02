@echo off
echo ============================================
echo  YOLO Object Detection Explorer Startup
echo ============================================
echo.

echo Checking and installing dependencies...
echo.

REM Check and setup Python backend
if not exist "backend\venv" (
    echo Setting up Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing Python dependencies...
    pip install -r requirements.txt
    cd ..
) else (
    echo Python virtual environment found.
    cd backend
    call venv\Scripts\activate.bat
    cd ..
)

REM Check and setup Node.js frontend
if not exist "frontend\node_modules" (
    echo Installing Node.js dependencies...
    cd frontend
    npm install
    cd ..
) else (
    echo Node.js dependencies found.
)

echo.
echo Starting Backend Server...
start cmd /k "cd backend && call venv\Scripts\activate.bat && python main.py"

timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo  Servers are starting...
echo  Backend: http://localhost:8000
echo  Frontend: http://localhost:5173
echo ============================================
echo.
echo Press any key to exit...
pause > nul
