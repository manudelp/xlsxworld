from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/transpose-sheet",
    summary="Transpose Sheet",
    description="Transposes rows to columns and columns to rows for a selected sheet.",
)
async def transpose_sheet(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form(..., description="Sheet name to transpose"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)
    workbook_data = parse_excel_bytes(raw, file.filename)
    has_visuals = has_visual_elements(raw)

    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")

    rows = workbook_data[sheet]
    if rows:
        max_cols = max(len(r) for r in rows)
        padded = [list(r) + [None] * (max_cols - len(r)) for r in rows]
        workbook_data[sheet] = list(map(list, zip(*padded)))

    output_bytes = workbook_bytes_from_data(workbook_data)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="transpose-sheet",
        tool_name="Transpose Sheet",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="transposed.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visuals,
    )
