from typing import Union

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import schemas  # type: ignore
from . import tools_inspect  # type: ignore

app = FastAPI(title="ilovexlsx API", version="0.1.0")

# CORS from env or wildcard for dev
cors_origins = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["root"])
def read_root():
    return {"message": "ilovexlsx backend running"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/items/{item_id}", tags=["example"])
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


app.include_router(tools_inspect.router)

# Conditionally include auth routes only when DB/JWT are configured
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
if DATABASE_URL and JWT_SECRET:
    from . import auth as auth_router  # type: ignore
    app.include_router(auth_router.router)
else:
    # Expose a hint endpoint for diagnostics
    @app.get("/auth-disabled")
    def auth_disabled():  # pragma: no cover - informational
        return {
            "auth": "disabled",
            "reason": "DATABASE_URL or JWT_SECRET not set",
        }