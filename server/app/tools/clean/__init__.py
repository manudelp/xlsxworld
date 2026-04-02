from fastapi import APIRouter

from app.tools.clean.remove_duplicates import router as remove_duplicates_router
from app.tools.clean.trim_spaces import router as trim_spaces_router
from app.tools.clean.normalize_case import router as normalize_case_router
from app.tools.clean.find_replace import router as find_replace_router

router = APIRouter(prefix="/api/v1/tools/clean", tags=["clean"])
router.include_router(remove_duplicates_router)
router.include_router(trim_spaces_router)
router.include_router(normalize_case_router)
router.include_router(find_replace_router)
