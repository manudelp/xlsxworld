from typing import Union

import os
from fastapi import FastAPI
# When running via `uvicorn main:app` from the /app working dir, this module is
# a top-level script, so relative imports (from . import ...) won't work.
# Use absolute imports instead.
import schemas  # type: ignore
import tools_inspect  # type: ignore

app = FastAPI(title="ilovexlsx API", version="0.1.0")

# CORS is handled by Nginx in production. Do not enable FastAPI CORS here to
# avoid duplicate Access-Control-Allow-Origin headers.


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