from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from openpyxl.worksheet.protection import SheetProtection

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import (
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_upload_for_principal, normalize_sheet_selection
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/password-protect",
    summary="Password Protect",
    description="Adds sheet-level protection to an XLSX file.",
)
async def password_protect(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    password: str = Form(..., description="Protection password", min_length=1),
    sheets: str = Form("", description="Comma-separated sheet names (empty=all sheets)"),
    protect_structure: bool = Form(True, description="Protect sheet structure"),
    protect_content: bool = Form(True, description="Protect cell content"),
    protect_formatting: bool = Form(True, description="Protect formatting"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_upload_for_principal(file, principal=principal)

    if not supports_inplace_edit(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Password protect requires an .xlsx or .xlsm file.",
        )

    loaded = load_workbook_for_edit(raw, file.filename)
    wb = loaded.workbook

    selected = normalize_sheet_selection([sheets]) if sheets.strip() else None
    target_names = selected if selected else [ws.title for ws in wb.worksheets]

    for ws in wb.worksheets:
        if ws.title not in target_names:
            continue
        ws.protection = SheetProtection(
            sheet=protect_content,
            formatCells=not protect_formatting,
            formatColumns=not protect_formatting,
            formatRows=not protect_formatting,
            password=password,
        )

    if protect_structure:
        wb.security.lockStructure = True

    output_bytes = save_workbook_to_bytes(wb)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="password-protect",
        tool_name="Password Protect",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="protected.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
    )
