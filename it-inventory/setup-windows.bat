@echo off
echo ================================================
echo IT Asset Management System - Initial Setup
echo ================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python found

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo Setting up Backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate and install dependencies
call venv\Scripts\activate.bat
echo Installing Python dependencies...
pip install -r requirements.txt

REM Create .env if it doesn't exist
if not exist ".env" (
    echo.
    echo Creating .env configuration file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit backend\.env with your database settings!
    echo.
)

cd ..

echo.
echo Setting up Frontend...
cd frontend

REM Install npm dependencies
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

cd ..

echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Make sure PostgreSQL is installed and running
echo 2. Create a database called 'it_inventory'
echo 3. Edit backend\.env with your database password
echo 4. Run start-windows.bat to start the servers
echo.
pause
