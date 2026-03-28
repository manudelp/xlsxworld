from typing import Union

import os
from pathlib import Path
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    def load_dotenv(*_args, **_kwargs):
        return False
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import schemas  # type: ignore
import tools_inspect  # type: ignore
import tools_convert  # type: ignore
import tools_merge_split  # type: ignore

app = FastAPI(title="XLSX World API", version="0.1.0")

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

@app.get("/", tags=["root"]) 
def read_root():
    return {"message": "XLSX World backend running"}

@app.get("/health", tags=["meta"]) 
def health():
    return {"status": "ok"}

@app.get("/items/{item_id}", tags=["example"]) 
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}

app.include_router(tools_inspect.router)
app.include_router(tools_convert.router)
app.include_router(tools_merge_split.router)