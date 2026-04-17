from __future__ import annotations

import secrets
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import read_upload_for_principal
from app.tools.inspect._store import store_workbook

router = APIRouter()


class SheetPreview(BaseModel):
    name: str
    headers: List[Any]
    sample: List[List[Any]]
    total_rows: int


class WorkbookPreview(BaseModel):
    token: str
    sheets: List[SheetPreview]
    sheet_count: int


@router.post(
    "/preview",
    response_model=WorkbookPreview,
    summary="Preview Workbook",
    description="Uploads an Excel workbook, stores it temporarily, and returns sheet headers plus sample rows.",
)
async def preview_workbook(
    file: UploadFile = File(..., description="Excel file to inspect"),
    sample_rows: int = Query(25, ge=1, le=500),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_upload_for_principal(file, principal=principal)

    workbook_data = parse_excel_bytes(raw, file.filename)
    token = secrets.token_urlsafe(16)

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

    await store_workbook(token, workbook_data, sheet_totals)
    return WorkbookPreview(token=token, sheets=sheets, sheet_count=len(sheets))
