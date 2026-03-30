from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import List, Any, Dict, Tuple
import secrets
import time

from excel_reader import ensure_supported_excel_filename, parse_excel_bytes

# Simple in-memory workbook cache; replace with redis or disk later
# token -> (timestamp, workbook_data, sheet_totals)
_WORKBOOK_STORE: Dict[str, Tuple[float, Dict[str, List[List[Any]]], Dict[str, int]]] = {}
_MAX_STORE = 32  # naive cap
_TTL_SECONDS = 60 * 15  # 15 minutes
_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

router = APIRouter(prefix="/api/tools/inspect", tags=["tools"])

class SheetPreview(BaseModel):
    name: str
    headers: List[Any]
    sample: List[List[Any]]  # sample rows (excluding header)
    total_rows: int  # including header

class WorkbookPreview(BaseModel):
    token: str
    sheets: List[SheetPreview]
    sheet_count: int

class SheetPage(BaseModel):
    sheet: str
    header: List[Any] | None = None
    rows: List[List[Any]]
    offset: int
    limit: int
    total_rows: int
    done: bool

@router.post(
    "/preview",
    response_model=WorkbookPreview,
    summary="Preview Workbook",
    description="Uploads an Excel workbook, stores it temporarily, and returns sheet headers plus sample rows.",
)
async def preview_workbook(
    file: UploadFile = File(..., description="Excel file to inspect"),
    sample_rows: int = Query(25, ge=1, le=500),
):
    ensure_supported_excel_filename(file.filename)

    raw = await file.read()

    if len(raw) > _MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {_MAX_UPLOAD_SIZE_BYTES // 1024 // 1024}MB)",
        )

    workbook_data = parse_excel_bytes(raw, file.filename)

    token = secrets.token_urlsafe(16)
    if len(_WORKBOOK_STORE) >= _MAX_STORE:
        # drop oldest
        oldest = sorted(_WORKBOOK_STORE.items(), key=lambda kv: kv[1][0])[:4]
        for k, _ in oldest:
            _WORKBOOK_STORE.pop(k, None)

    # Build a sheet->row count map (including header row if present)
    sheet_totals: Dict[str, int] = {}

    sheets: List[SheetPreview] = []
    for sheet_name, rows in workbook_data.items():
        header_list = [*rows[0]] if rows else []
        data_rows = [[*row] for row in rows[1 : 1 + sample_rows]] if len(rows) > 1 else []

        sheet_total = len(rows)
        sheet_totals[sheet_name] = sheet_total

        sheets.append(
            SheetPreview(
                name=sheet_name,
                headers=[*header_list],
                sample=data_rows,
                total_rows=sheet_total,
            )
        )

    _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals)
    return WorkbookPreview(token=token, sheets=sheets, sheet_count=len(sheets))


def _load_workbook_from_token(token: str):
    meta = _WORKBOOK_STORE.get(token)
    if not meta:
        raise HTTPException(status_code=404, detail="Unknown or expired token")

    ts, workbook_data, sheet_totals = meta

    if time.time() - ts > _TTL_SECONDS:
        _WORKBOOK_STORE.pop(token, None)
        raise HTTPException(status_code=404, detail="Token expired")

    # touch
    _WORKBOOK_STORE[token] = (time.time(), workbook_data, sheet_totals)
    return workbook_data


def _get_sheet_total_rows(token: str, sheet: str) -> int | None:
    meta = _WORKBOOK_STORE.get(token)
    if not meta:
        return None

    _, _, sheet_totals = meta
    return sheet_totals.get(sheet)


@router.get(
    "/sheet",
    response_model=SheetPage,
    summary="Page Sheet",
    description="Returns paginated rows for one sheet from a previously uploaded workbook token.",
)
async def page_sheet(
    token: str = Query(..., description="Workbook token from preview"),
    sheet: str = Query(..., description="Sheet name"),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=2000),
):
    workbook_data = _load_workbook_from_token(token)
    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")
    rows = workbook_data[sheet]

    sheet_total = _get_sheet_total_rows(token, sheet)
    total_rows = sheet_total if sheet_total is not None else 0
    known_data_rows = sheet_total - 1 if sheet_total is not None and sheet_total > 0 else None

    if not rows:
        return SheetPage(sheet=sheet, header=None, rows=[], offset=offset, limit=limit, total_rows=0, done=True)

    header = [*rows[0]]
    data_only_rows = rows[1:]
    data_rows = [[*row] for row in data_only_rows[offset : offset + limit]]
    fetched = len(data_rows)

    if known_data_rows is not None:
        done = offset + fetched >= known_data_rows
    else:
        done = offset + fetched >= len(data_only_rows)
        total_rows = len(rows)

    return SheetPage(
        sheet=sheet,
        header=header,
        rows=data_rows,
        offset=offset,
        limit=limit,
        total_rows=total_rows,
        done=done,
    )

