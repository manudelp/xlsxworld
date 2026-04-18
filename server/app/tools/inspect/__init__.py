from fastapi import APIRouter

from app.tools.inspect.preview import router as preview_router
from app.tools.inspect.page_sheet import router as page_sheet_router

# Quota-enforced router: only the initial upload/preview counts as a job.
router = APIRouter(prefix="/api/v1/tools/inspect", tags=["inspect"])
router.include_router(preview_router)

# Pagination router: registered WITHOUT quota enforcement in app_factory.
# Loading more rows from an already-uploaded workbook is NOT a new job.
pagination_router = APIRouter(prefix="/api/v1/tools/inspect", tags=["inspect"])
pagination_router.include_router(page_sheet_router)
