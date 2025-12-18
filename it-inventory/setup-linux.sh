#!/bin/bash

echo "================================================"
echo "IT Asset Management System - Initial Setup"
echo "================================================"
echo

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11+:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-venv python3-pip"
    echo "  RHEL/CentOS: sudo dnf install python3 python3-pip"
    exit 1
fi
echo "[OK] Python found: $(python3 --version)"

# Check Node
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js 18+:"
    echo "  https://nodejs.org/en/download/package-manager"
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed"
    exit 1
fi
echo "[OK] npm found: $(npm --version)"

echo
echo "Setting up Backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo
    echo "Creating .env configuration file..."
    cp .env.example .env
    echo
    echo "IMPORTANT: Please edit backend/.env with your database settings!"
    echo
fi

cd ..

echo
echo "Setting up Frontend..."
cd frontend

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

cd ..

# Make scripts executable
chmod +x start-linux.sh

echo
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo
echo "Next steps:"
echo "1. Make sure PostgreSQL is installed and running"
echo "2. Create a database called 'it_inventory':"
echo "   sudo -u postgres psql -c 'CREATE DATABASE it_inventory;'"
echo "3. Edit backend/.env with your database password"
echo "4. Run ./start-linux.sh to start the servers"
echo
