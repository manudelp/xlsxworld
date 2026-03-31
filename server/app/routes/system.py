from fastapi import APIRouter

router = APIRouter(tags=["meta"])


@router.get(
    "/",
    tags=["root"],
    summary="API Status",
    description="Returns a short status message confirming the XLSX World backend is running.",
)
def read_root():
    return {"message": "XLSX World backend running"}


@router.get(
    "/health",
    summary="Health Check",
    description="Returns a simple health signal for uptime checks and monitoring.",
)
def health():
    return {"status": "ok"}
