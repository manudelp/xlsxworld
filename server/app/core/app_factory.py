import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.services.auth_service import AuthServiceError
from app.middleware.analytics import AnalyticsMiddleware
from app.services.analytics_service import AnalyticsService
from app.routes import platform_routers
from app.tools import tool_routers
from app.core.openapi_custom import attach_custom_openapi
from app.core.rate_limit import limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*_args, **_kwargs):
        return False


def create_app() -> FastAPI:
    app = FastAPI(title="XLSX World API", version="1.0.0")
    app.state.analytics_service = AnalyticsService()

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_exception_handler(AuthServiceError, _auth_service_exception_handler)
    app.add_exception_handler(HTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)

    base_dir = Path(__file__).resolve().parent.parent.parent
    load_dotenv(base_dir / ".env")

    raw_origins = os.getenv("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(AnalyticsMiddleware)

    for router in platform_routers:
        app.include_router(router)

    for router in tool_routers:
        app.include_router(router)

    attach_custom_openapi(app)
    return app


async def _auth_service_exception_handler(_: Request, exc: AuthServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "error_code": "AUTH_ERROR"},
    )


_STATUS_CODE_DEFAULTS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "UNPROCESSABLE_ENTITY",
    429: "RATE_LIMITED",
    500: "INTERNAL_SERVER_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


async def _http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Normalize HTTPException responses to {detail, error_code}.

    Endpoints can raise HTTPException(detail={"detail": "...", "error_code": "X"})
    to provide a custom code. Otherwise the code defaults to one derived from
    the status code.
    """
    status_code = exc.status_code
    detail = exc.detail
    headers = getattr(exc, "headers", None)

    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail.get("detail") or "")
        error_code = str(
            detail.get("error_code") or _STATUS_CODE_DEFAULTS.get(status_code, "ERROR")
        )
    else:
        message = str(detail) if detail is not None else ""
        error_code = _STATUS_CODE_DEFAULTS.get(status_code, "ERROR")

    return JSONResponse(
        status_code=status_code,
        content={"detail": message, "error_code": error_code},
        headers=headers,
    )


async def _validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return validation errors in the standard {detail, error_code} shape."""
    errors = exc.errors()
    if errors:
        first = errors[0]
        loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
        message = first.get("msg", "Invalid request")
        if loc:
            message = f"{message} ({loc})"
    else:
        message = "Invalid request"
    return JSONResponse(
        status_code=422,
        content={"detail": message, "error_code": "VALIDATION_ERROR"},
    )


async def _unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Catch-all that prevents tracebacks/file paths from leaking to clients."""
    # NOTE: never include exc args/repr in the response body — they may contain
    # internal file system paths or sensitive details. Server logs will still
    # capture the full exception via FastAPI's default logging.
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again.",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )
