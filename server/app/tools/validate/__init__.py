from fastapi import APIRouter

from app.tools.validate.validate_emails import router as validate_emails_router
from app.tools.validate.detect_blanks import router as detect_blanks_router

router = APIRouter(prefix="/api/v1/tools/validate", tags=["validate"])
router.include_router(validate_emails_router)
router.include_router(detect_blanks_router)
