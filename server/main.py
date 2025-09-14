from typing import Union

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import schemas  # type: ignore
from . import tools_inspect  # type: ignore

app = FastAPI(title="ilovexlsx API", version="0.1.0")

# TODO: tighten origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with ["http://localhost:3000"] when known
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