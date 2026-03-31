from fastapi import APIRouter

from app.tools.convert.csv_to_xlsx import router as csv_to_xlsx_router
from app.tools.convert.xlsx_to_csv import router as xlsx_to_csv_router

router = APIRouter(prefix="/api/v1/tools/convert", tags=["convert"])
router.include_router(csv_to_xlsx_router)
router.include_router(xlsx_to_csv_router)
