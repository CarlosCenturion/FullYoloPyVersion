#!/bin/bash

echo "============================================"
echo " YOLO Object Detection Explorer Startup"
echo "============================================"
echo

echo "Checking and installing dependencies..."
echo

# Check and setup Python backend
if [ ! -d "backend/venv" ]; then
    echo "Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    cd ..
else
    echo "Python virtual environment found."
fi

# Check and setup Node.js frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing Node.js dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "Node.js dependencies found."
fi

echo
echo "Starting Backend Server..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend in background
echo "Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "============================================"
echo " Servers are starting..."
echo " Backend: http://localhost:8000"
echo " Frontend: http://localhost:5173"
echo "============================================"
echo
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
