from typing import List, Any, Optional
from pydantic import BaseModel

class SheetPreview(BaseModel):
    name: str
    headers: List[Any]
    sample: List[List[Any]]  # up to N sample rows (excluding header)
    total_rows: int  # including header

class WorkbookPreview(BaseModel):
    token: str  # opaque handle to reference workbook for paging
    sheets: List[SheetPreview]
    sheet_count: int

class SheetPage(BaseModel):
    sheet: str
    header: Optional[List[Any]] = None
    rows: List[List[Any]]
    offset: int
    limit: int
    total_rows: int  # including header
    done: bool

class ErrorResponse(BaseModel):
    detail: str
