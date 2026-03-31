from fastapi import APIRouter

from app.tools.split.split_sheet import router as split_sheet_router
from app.tools.split.split_workbook import router as split_workbook_router

router = APIRouter(prefix="/api/v1/tools", tags=["split"])
router.include_router(split_sheet_router)
router.include_router(split_workbook_router)
