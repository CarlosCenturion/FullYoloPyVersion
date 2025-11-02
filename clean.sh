#!/bin/bash

echo "============================================"
echo " YOLO Object Detection Explorer Cleanup"
echo "============================================"
echo

echo "This will remove all installed dependencies and cached files."
echo

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

echo
echo "Cleaning Python virtual environment..."
if [ -d "backend/venv" ]; then
    rm -rf backend/venv
    echo "Removed backend/venv"
else
    echo "No Python virtual environment found."
fi

echo
echo "Cleaning Node.js dependencies..."
if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    echo "Removed frontend/node_modules"
else
    echo "No Node.js dependencies found."
fi

echo
echo "Cleaning model cache..."
if [ -d "models" ]; then
    rm -rf models/*
    echo "Cleaned models directory"
else
    echo "No models directory found."
fi

echo
echo "Cleaning logs..."
if [ -d "logs" ]; then
    rm -f logs/*
    echo "Cleaned logs directory"
else
    echo "No logs directory found."
fi

echo
echo "============================================"
echo " Cleanup completed!"
echo " Run ./start.sh to reinstall everything."
echo "============================================"
echo
