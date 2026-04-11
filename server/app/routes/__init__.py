from app.routes.system import router as system_router
from app.routes.contact import router as contact_router
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router

platform_routers = [system_router, contact_router, auth_router, admin_router]
