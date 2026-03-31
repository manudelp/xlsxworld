import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import platform_routers
from app.tools import tool_routers
from app.core.openapi_custom import attach_custom_openapi
from app.core.rate_limit import limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*_args, **_kwargs):
        return False


def create_app() -> FastAPI:
    app = FastAPI(title="XLSX World API", version="1.0.0")

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

    for router in platform_routers:
        app.include_router(router)

    for router in tool_routers:
        app.include_router(router)

    attach_custom_openapi(app)
    return app
