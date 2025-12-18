# IT Asset Management System

A comprehensive, full-stack IT inventory management system for tracking hardware assets, warranties, repairs, and user assignments.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

### Core Functionality
- **Asset Management**: Track laptops, monitors, docks, headsets, cameras, and other IT equipment
- **User Assignments**: Assign equipment to employees with full history tracking
- **Warranty Tracking**: Visual warranty countdown with 90-day, 30-day, and expired alerts
- **Repair History**: Log repairs with cost tracking, identify problematic assets
- **Decommissioning**: Document end-of-life decisions with reasoning

### Advanced Features
- **Role-Based Access Control**: Admin, Technician, and Viewer roles
- **CSV Import/Export**: Bulk data management with template downloads
- **Email Notifications**: 
  - Automated warranty expiration alerts (daily scheduled)
  - Equipment assignment notifications to employees
- **Audit Logging**: Track all changes for compliance

### Tech Stack
- **Backend**: FastAPI (Python 3.12), SQLAlchemy, PostgreSQL
- **Frontend**: React 18, Vite, Tailwind CSS
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker & Docker Compose

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd it-inventory

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 3. Create Your Admin Account

1. Navigate to http://localhost:3000/register
2. Create your first user account
3. **First user automatically becomes Admin**

---

## Development Setup

### Backend (Python/FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database (PostgreSQL)

```bash
# Using Docker for development database
docker run -d \
  --name it_inventory_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=it_inventory \
  -p 5432:5432 \
  postgres:16-alpine
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/it_inventory

# JWT Settings
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Email Settings (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=IT Asset Management <your-email@gmail.com>

# Application
APP_NAME=IT Asset Manager
FRONTEND_URL=http://localhost:3000
```

### Email Configuration (Gmail)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the app password in `SMTP_PASSWORD`

---

## API Documentation

### Authentication
All endpoints except `/auth/login` and `/auth/register` require a JWT token.

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token in subsequent requests
curl http://localhost:8000/api/assets \
  -H "Authorization: Bearer <token>"
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Create new asset |
| POST | `/api/assets/{id}/assign` | Assign asset to employee |
| POST | `/api/assets/{id}/decommission` | Decommission asset |
| POST | `/api/assets/{id}/repairs` | Log a repair |
| GET | `/api/employees` | List all employees |
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/dashboard/warranty-alerts` | Get warranty alerts |
| GET | `/api/export/assets` | Export assets CSV |
| POST | `/api/import/assets` | Import assets from CSV |

Full API documentation available at http://localhost:8000/docs

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: manage users, assets, employees, all settings |
| **Technician** | Manage assets and employees, cannot manage users |
| **Viewer** | Read-only access to all data |

---

## CSV Import Format

### Assets Template

Download the template from Settings → Data Management or use this format:

```csv
Type*,Name*,Manufacturer,Model,Serial Number*,Purchase Date,Purchase Price,Warranty End,Vendor,PO Number,Location,Notes
laptop,Dell Latitude 5540,Dell,Latitude 5540,ABC123XYZ,2024-01-15,1299.99,2027-01-15,Dell Direct,PO-2024-001,Main Office,Standard config
```

**Required fields**: Type, Name
**Asset Types**: laptop, monitor, dock, headset, camera, keyboard, mouse, other

### Employees Template

```csv
Employee ID,Email,Full Name,Department,Location,Manager
EMP-001,john.doe@company.com,John Doe,Engineering,Building A,Jane Smith
```

**Required fields**: Email, Full Name

---

## Scheduled Tasks

The system runs automated tasks:

| Task | Schedule | Description |
|------|----------|-------------|
| Warranty Check | Daily 8:00 AM | Sends email alerts for expiring warranties |

---

## Production Deployment

### Security Checklist

1. **Change default secrets**
   ```env
   SECRET_KEY=<generate-strong-random-key>
   ```

2. **Use strong database password**
   ```env
   DATABASE_URL=postgresql://user:strong_password@host:5432/db
   ```

3. **Enable HTTPS** (use reverse proxy like nginx or Traefik)

4. **Configure CORS** appropriately in `app/main.py`

5. **Set up database backups**

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start with production settings
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Check if PostgreSQL is running
docker-compose ps
# Check logs
docker-compose logs db
```

**CORS errors**
- Ensure `FRONTEND_URL` matches your frontend URL
- Check CORS settings in `backend/app/main.py`

**Email not sending**
- Verify SMTP credentials
- Check spam folder
- For Gmail, ensure App Password is used

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues and feature requests, please open a GitHub issue.
