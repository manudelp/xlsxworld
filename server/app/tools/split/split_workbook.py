from __future__ import annotations

import time
import zipfile
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_upload_for_principal
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()


@router.post(
    "/split-workbook",
    summary="Split Workbook",
    description="Exports each workbook sheet as a separate XLSX file inside a ZIP archive.",
)
async def split_workbook(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet_names: str = Form("", description="Comma-separated sheet names to split (empty=all)"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_upload_for_principal(file, principal=principal)

    workbook_data = parse_excel_bytes(raw, file.filename)
    if not workbook_data:
        raise HTTPException(status_code=400, detail="Workbook is empty")

    has_visuals = has_visual_elements(raw)

    selected_sheet_names = [
        sheet_name.strip() for sheet_name in sheet_names.split(",") if sheet_name.strip()
    ]
    if selected_sheet_names:
        missing = [name for name in selected_sheet_names if name not in workbook_data]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Sheet not found: {missing[0]}",
            )
        selected_set = set(selected_sheet_names)
        workbook_data = {
            name: rows for name, rows in workbook_data.items() if name in selected_set
        }

    if not workbook_data:
        raise HTTPException(status_code=400, detail="Select at least one sheet")

    zipped = BytesIO()
    with zipfile.ZipFile(zipped, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sheet_name, rows in workbook_data.items():
            child_wb = Workbook()
            child_ws = child_wb.active
            child_ws.title = sheet_name[:31] if sheet_name else "Sheet1"

            for row in rows:
                child_ws.append(["" if v is None else v for v in row])

            child_bytes = BytesIO()
            child_wb.save(child_bytes)
            member_name = f"{sheet_name.replace(' ', '_') or 'sheet'}.xlsx"
            zf.writestr(member_name, child_bytes.getvalue())

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="split-workbook",
        tool_name="Split Workbook",
        original_filename=file.filename,
        output_bytes=zipped.getvalue(),
        output_filename="split_workbook.zip",
        mime_type="application/zip",
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visuals,
    )
