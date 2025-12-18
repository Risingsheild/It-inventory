#!/bin/bash

echo "================================================"
echo "IT Asset Management System - Startup Script"
echo "================================================"
echo

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "ERROR: backend/.env file not found!"
    echo "Please copy backend/.env.example to backend/.env and configure your database settings."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "Starting Backend Server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting Frontend Server..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo
echo "================================================"
echo "Servers running!"
echo
echo "Backend API: http://localhost:8000"
echo "Frontend:    http://localhost:3000"
echo "API Docs:    http://localhost:8000/docs"
echo
echo "Press Ctrl+C to stop all servers"
echo "================================================"

# Trap Ctrl+C to kill both processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for processes
wait
