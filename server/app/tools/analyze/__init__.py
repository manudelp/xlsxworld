from fastapi import APIRouter

from app.tools.analyze.scan_formula_errors import router as scan_formula_errors_router
from app.tools.analyze.compare_workbooks import router as compare_workbooks_router
from app.tools.analyze.summary_stats import router as summary_stats_router

router = APIRouter(prefix="/api/v1/tools/analyze", tags=["analyze"])
router.include_router(scan_formula_errors_router)
router.include_router(compare_workbooks_router)
router.include_router(summary_stats_router)
