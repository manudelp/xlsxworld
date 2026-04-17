from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import (
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/freeze-header",
    summary="Freeze Header",
    description="Freezes the first N rows of each sheet so they stay visible when scrolling.",
)
async def freeze_header(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    rows: int = Form(1, description="Number of rows to freeze", ge=1, le=100),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Freeze header requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    for ws in wb.worksheets:
        ws.freeze_panes = f"A{rows + 1}"

    output_bytes = save_workbook_to_bytes(wb)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="freeze-header",
        tool_name="Freeze Header",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="frozen.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
