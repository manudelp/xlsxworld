from fastapi import APIRouter

from app.tools.inspect.preview import router as preview_router
from app.tools.inspect.page_sheet import router as page_sheet_router

router = APIRouter(prefix="/api/v1/tools/inspect", tags=["inspect"])
router.include_router(preview_router)
router.include_router(page_sheet_router)
