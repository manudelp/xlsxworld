from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from openpyxl.worksheet.protection import SheetProtection

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
    "/remove-password",
    summary="Remove Password",
    description="Removes sheet-level protection from all sheets.",
)
async def remove_password(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Remove password requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    for ws in wb.worksheets:
        # Assigning a fresh ``SheetProtection()`` fully clears the sheet
        # lock and password without ever routing ``None`` through
        # openpyxl's password-hash setter (which raises ``TypeError``).
        ws.protection = SheetProtection()

    wb.security.lockStructure = False

    output_bytes = save_workbook_to_bytes(wb)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="remove-password",
        tool_name="Remove Password",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="unprotected.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
