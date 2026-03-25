from typing import Union

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# When running via `uvicorn main:app` from the /app working dir, this module is
# a top-level script, so relative imports (from . import ...) won't work.
# Use absolute imports instead.
import schemas  # type: ignore
import tools_inspect  # type: ignore
import tools_convert  # type: ignore
import tools_merge_split  # type: ignore

app = FastAPI(title="XLSX World API", version="0.1.0")

# Allow local frontend dev origin for Cross-Origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS is handled by Nginx in production. Do not enable FastAPI CORS here to
# avoid duplicate Access-Control-Allow-Origin headers.

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