from fastapi import APIRouter

from app.tools.convert.csv_to_xlsx import router as csv_to_xlsx_router
from app.tools.convert.json_to_xlsx import router as json_to_xlsx_router
from app.tools.convert.sql_to_xlsx import router as sql_to_xlsx_router
from app.tools.convert.xlsx_to_csv import router as xlsx_to_csv_router
from app.tools.convert.xlsx_to_json import router as xlsx_to_json_router
from app.tools.convert.xlsx_to_sql import router as xlsx_to_sql_router
from app.tools.convert.xlsx_to_xml import router as xlsx_to_xml_router
from app.tools.convert.xml_to_xlsx import router as xml_to_xlsx_router
from app.tools.convert.xlsx_to_pdf import router as xlsx_to_pdf_router
from app.tools.convert.pdf_to_xlsx import router as pdf_to_xlsx_router

router = APIRouter(prefix="/api/v1/tools/convert", tags=["convert"])
router.include_router(csv_to_xlsx_router)
router.include_router(xlsx_to_csv_router)
router.include_router(xlsx_to_json_router)
router.include_router(json_to_xlsx_router)
router.include_router(xlsx_to_sql_router)
router.include_router(sql_to_xlsx_router)
router.include_router(xlsx_to_xml_router)
router.include_router(xml_to_xlsx_router)
router.include_router(xlsx_to_pdf_router)
router.include_router(pdf_to_xlsx_router)
