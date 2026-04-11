from fastapi import APIRouter

from app.tools.security.password_protect import router as password_protect_router
from app.tools.security.remove_password import router as remove_password_router

router = APIRouter(prefix="/api/v1/tools/security", tags=["security"])
router.include_router(password_protect_router)
router.include_router(remove_password_router)
