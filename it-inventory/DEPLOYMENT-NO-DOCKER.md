# IT Asset Management System - Internal Deployment Guide (No Docker)

This guide covers deploying the system on a Windows or Linux server without Docker.

---

## Prerequisites

1. **Python 3.11+** - https://www.python.org/downloads/
2. **Node.js 18+** - https://nodejs.org/
3. **PostgreSQL 14+** - https://www.postgresql.org/download/

---

## Step 1: Database Setup (PostgreSQL)

### Windows
1. Download and install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, set a password for the `postgres` user
3. Open pgAdmin or psql and create the database:

```sql
CREATE DATABASE it_inventory;
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

sudo -u postgres psql
CREATE DATABASE it_inventory;
CREATE USER itadmin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE it_inventory TO itadmin;
\q
```

---

## Step 2: Backend Setup (FastAPI)

### 2.1 Navigate to backend folder
```bash
cd it-inventory/backend
```

### 2.2 Create virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.3 Install dependencies
```bash
pip install -r requirements.txt
```

### 2.4 Configure environment

Create a `.env` file in the `backend` folder:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/it_inventory

# Security - CHANGE THIS IN PRODUCTION!
SECRET_KEY=generate-a-random-64-character-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Email (Optional - leave blank to disable)
SMTP_HOST=smtp.yourcompany.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=IT Asset Management <itassets@yourcompany.com>

# Application
APP_NAME=IT Asset Manager
FRONTEND_URL=http://your-server-ip:3000
```

### 2.5 Initialize the database

The database tables are created automatically on first run.

### 2.6 Start the backend server

**Development:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Production (with multiple workers):**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://your-server:8000`
API docs at `http://your-server:8000/docs`

---

## Step 3: Frontend Setup (React)

### 3.1 Navigate to frontend folder
```bash
cd it-inventory/frontend
```

### 3.2 Install dependencies
```bash
npm install
```

### 3.3 Configure API endpoint

Edit `vite.config.js` to point to your backend server:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',  // Allow external connections
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // Change if backend is on different server
        changeOrigin: true
      }
    }
  }
})
```

### 3.4 Start the frontend

**Development:**
```bash
npm run dev -- --host
```

**Production Build:**
```bash
npm run build
```

This creates a `dist` folder with static files.

---

## Step 4: Production Deployment Options

### Option A: Simple (Node serves frontend)

Install a simple static server:
```bash
npm install -g serve
cd frontend
npm run build
serve -s dist -l 3000
```

### Option B: Using PM2 (Recommended for Production)

PM2 keeps your apps running and restarts them if they crash.

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name it-backend

# Build and serve frontend
cd ../frontend
npm run build
pm2 start "serve -s dist -l 3000" --name it-frontend

# Save PM2 config to survive reboots
pm2 save
pm2 startup  # Follow the instructions it prints
```

### Option C: Using IIS (Windows Server)

See the IIS deployment section below.

### Option D: Using Nginx (Linux)

See the Nginx deployment section below.

---

## IIS Deployment (Windows Server)

### Backend with IIS (using HttpPlatformHandler)

1. Install URL Rewrite and HttpPlatformHandler IIS modules
2. Create a `web.config` in the backend folder:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="PythonHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified"/>
    </handlers>
    <httpPlatform processPath="C:\path\to\venv\Scripts\python.exe"
                  arguments="-m uvicorn app.main:app --host 127.0.0.1 --port %HTTP_PLATFORM_PORT%"
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\python.log"
                  startupTimeLimit="60"
                  processesPerApplication="1">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%"/>
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
```

### Frontend with IIS

1. Run `npm run build` in the frontend folder
2. Create a new IIS site pointing to the `dist` folder
3. Add URL Rewrite rules for React Router:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:8000/api/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## Nginx Deployment (Linux)

### Install Nginx
```bash
sudo apt install nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/it-inventory`:

```nginx
server {
    listen 80;
    server_name your-server-hostname;

    # Frontend
    location / {
        root /var/www/it-inventory/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/it-inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Running as Windows Service

Use NSSM (Non-Sucking Service Manager) to run as a Windows service:

1. Download NSSM from https://nssm.cc/download
2. Install backend as service:

```cmd
nssm install ITInventoryBackend "C:\path\to\venv\Scripts\python.exe" "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"
nssm set ITInventoryBackend AppDirectory "C:\path\to\it-inventory\backend"
nssm start ITInventoryBackend
```

3. Install frontend as service:

```cmd
nssm install ITInventoryFrontend "C:\path\to\node.exe" "C:\path\to\serve\serve" "-s" "dist" "-l" "3000"
nssm set ITInventoryFrontend AppDirectory "C:\path\to\it-inventory\frontend"
nssm start ITInventoryFrontend
```

---

## Running as Linux Service (systemd)

### Backend Service

Create `/etc/systemd/system/it-inventory-backend.service`:

```ini
[Unit]
Description=IT Inventory Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/it-inventory/backend
Environment="PATH=/var/www/it-inventory/backend/venv/bin"
ExecStart=/var/www/it-inventory/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable it-inventory-backend
sudo systemctl start it-inventory-backend
```

---

## Firewall Configuration

### Windows Firewall
```powershell
# Allow backend port
New-NetFirewallRule -DisplayName "IT Inventory Backend" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow

# Allow frontend port
New-NetFirewallRule -DisplayName "IT Inventory Frontend" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

### Linux (UFW)
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
# Or if using Nginx on port 80
sudo ufw allow 80/tcp
```

---

## Quick Start Summary

```bash
# 1. Setup PostgreSQL and create database

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
# Create .env file with your settings
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. Frontend (in new terminal)
cd frontend
npm install
npm run dev -- --host

# 4. Open browser to http://your-server:3000
# 5. Register first user (becomes admin)
```

---

## Troubleshooting

### "Connection refused" to database
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify connection string in `.env`
- Check PostgreSQL allows connections in `pg_hba.conf`

### Frontend can't reach backend
- Check backend is running on correct port
- Verify proxy settings in `vite.config.js`
- Check firewall rules

### "Module not found" errors
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Permission errors on Linux
- Check file ownership: `sudo chown -R www-data:www-data /var/www/it-inventory`
