from app.routes.system import router as system_router
from app.routes.contact import router as contact_router
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.me import router as me_router
from app.routes.usage import router as usage_router

platform_routers = [
    system_router,
    contact_router,
    auth_router,
    admin_router,
    usage_router,
    me_router,
]
