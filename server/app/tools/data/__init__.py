from fastapi import APIRouter

from app.tools.data.sort_rows import router as sort_rows_router
from app.tools.data.transpose_sheet import router as transpose_sheet_router
from app.tools.data.split_column import router as split_column_router

router = APIRouter(prefix="/api/v1/tools/data", tags=["data"])
router.include_router(sort_rows_router)
router.include_router(transpose_sheet_router)
router.include_router(split_column_router)
