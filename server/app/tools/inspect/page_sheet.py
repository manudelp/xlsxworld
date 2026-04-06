from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.tools.inspect._store import load_workbook, get_sheet_total_rows

router = APIRouter()


class SheetPage(BaseModel):
    sheet: str
    header: List[Any] | None = None
    rows: List[List[Any]]
    offset: int
    limit: int
    total_rows: int
    done: bool


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
    workbook_data = await load_workbook(token)
    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")
    rows = workbook_data[sheet]

    sheet_total = await get_sheet_total_rows(token, sheet)
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
