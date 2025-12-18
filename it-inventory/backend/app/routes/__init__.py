from app.routes.auth import router as auth_router
from app.routes.assets import router as assets_router
from app.routes.employees import router as employees_router
from app.routes.dashboard import router as dashboard_router

__all__ = ['auth_router', 'assets_router', 'employees_router', 'dashboard_router']
