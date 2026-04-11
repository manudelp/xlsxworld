from fastapi import APIRouter

from app.tools.format.freeze_header import router as freeze_header_router
from app.tools.format.auto_size_columns import router as auto_size_columns_router

router = APIRouter(prefix="/api/v1/tools/format", tags=["format"])
router.include_router(freeze_header_router)
router.include_router(auto_size_columns_router)
