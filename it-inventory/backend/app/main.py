from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

from app.database import engine, Base
from app.routes import auth_router, assets_router, employees_router, dashboard_router
from app.services.warranty_service import warranty_service
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Scheduler for background tasks
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting IT Asset Management System...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Start scheduler for warranty notifications
    # Run daily at 8:00 AM
    scheduler.add_job(
        warranty_service.check_and_send_warranty_alerts,
        CronTrigger(hour=8, minute=0),
        id="warranty_check",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Warranty notification scheduler started")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="IT Asset Management System",
    description="""
    A comprehensive IT inventory management system for tracking:
    - Hardware assets (laptops, monitors, docks, peripherals)
    - User assignments
    - Warranty tracking with automated notifications
    - Repair history
    - Decommissioning records
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        settings.FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(assets_router, prefix="/api")
app.include_router(employees_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "ok"}
