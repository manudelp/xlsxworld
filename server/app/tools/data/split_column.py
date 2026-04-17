from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_upload_for_principal
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_DELIMITERS = {"comma": ",", "space": " ", "dash": "-", "semicolon": ";", "pipe": "|", "tab": "\t"}


@router.post(
    "/split-column",
    summary="Split Column",
    description="Splits a single column into multiple columns by a delimiter.",
)
async def split_column(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form(..., description="Sheet name"),
    column: str = Form(..., description="Column header name to split"),
    delimiter: str = Form("comma", description="Delimiter: comma, space, dash, semicolon, pipe, tab, or custom string"),
    keep_original: bool = Form(True, description="Keep the original column"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_upload_for_principal(file, principal=principal)
    workbook_data = parse_excel_bytes(raw, file.filename)
    has_visuals = has_visual_elements(raw)

    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")

    rows = workbook_data[sheet]
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Sheet has no data rows")

    header = rows[0]
    data_rows = rows[1:]

    col_idx = None
    for i, h in enumerate(header):
        if str(h).strip() == column.strip():
            col_idx = i
            break
    if col_idx is None:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")

    sep = _DELIMITERS.get(delimiter, delimiter)
    if not sep:
        raise HTTPException(status_code=400, detail="Delimiter cannot be empty")

    max_parts = 1
    matched_any = False
    for row in data_rows:
        val = row[col_idx] if col_idx < len(row) else None
        if val is not None and isinstance(val, str) and sep in val:
            matched_any = True
            max_parts = max(max_parts, len(val.split(sep)))

    new_header: list[Any] = []
    for i, h in enumerate(header):
        if i == col_idx:
            if keep_original:
                new_header.append(h)
            for p in range(1, max_parts + 1):
                new_header.append(f"{h}_{p}")
        else:
            new_header.append(h)

    new_rows: list[list[Any]] = [new_header]
    for row in data_rows:
        val = row[col_idx] if col_idx < len(row) else None
        parts = str(val).split(sep) if val is not None and isinstance(val, str) else [""]
        parts += [""] * (max_parts - len(parts))

        new_row: list[Any] = []
        for i, cell in enumerate(row if len(row) > col_idx else list(row) + [None] * (col_idx + 1 - len(row))):
            if i == col_idx:
                if keep_original:
                    new_row.append(cell)
                new_row.extend(parts)
            else:
                new_row.append(cell)
        new_rows.append(new_row)

    workbook_data[sheet] = new_rows
    output_bytes = workbook_bytes_from_data(workbook_data)

    response = await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="split-column",
        tool_name="Split Column",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="split-column.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visuals,
    )
    if not matched_any:
        response.headers["X-Split-Warning"] = "no-delimiters-found"
        exposed = response.headers.get("Access-Control-Expose-Headers", "")
        response.headers["Access-Control-Expose-Headers"] = (
            f"{exposed}, X-Split-Warning".lstrip(", ")
        )
    return response
