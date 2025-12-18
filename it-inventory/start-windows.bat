@echo off
echo ================================================
echo IT Asset Management System - Startup Script
echo ================================================
echo.

REM Check if PostgreSQL is configured
if not exist "backend\.env" (
    echo ERROR: backend\.env file not found!
    echo Please copy backend\.env.example to backend\.env and configure your database settings.
    pause
    exit /b 1
)

echo Starting Backend Server...
start "IT Inventory - Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "IT Inventory - Frontend" cmd /k "cd frontend && npm run dev -- --host"

echo.
echo ================================================
echo Servers starting up!
echo.
echo Backend API: http://localhost:8000
echo Frontend:    http://localhost:3000
echo API Docs:    http://localhost:8000/docs
echo.
echo Close the terminal windows to stop the servers.
echo ================================================
pause
