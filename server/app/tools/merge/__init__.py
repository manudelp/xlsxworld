from fastapi import APIRouter

from app.tools.merge.merge_sheets import router as merge_sheets_router
from app.tools.merge.append_workbooks import router as append_workbooks_router

router = APIRouter(prefix="/api/v1/tools", tags=["merge"])
router.include_router(merge_sheets_router)
router.include_router(append_workbooks_router)
