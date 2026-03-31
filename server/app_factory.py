import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import auth
import tools_convert
import tools_inspect
import tools_merge_split
from api.contact import router as contact_router
from api.system import router as system_router
from openapi_custom import attach_custom_openapi
from rate_limit import limiter, _rate_limit_exceeded_handler
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

    base_dir = Path(__file__).resolve().parent
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

    app.include_router(system_router)
    app.include_router(contact_router)
    app.include_router(auth.router)
    app.include_router(tools_inspect.router)
    app.include_router(tools_convert.router)
    app.include_router(tools_merge_split.router)

    attach_custom_openapi(app)
    return app
