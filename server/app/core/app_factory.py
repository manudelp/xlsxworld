import os
from pathlib import Path

from fastapi import FastAPI, Request
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
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
