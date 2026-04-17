from __future__ import annotations

import time
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from openpyxl import Workbook

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import (
    _INVALID_SHEET_CHARS,
    check_excel_file,
    has_visual_elements,
    read_upload_for_principal,
    safe_sheet_title,
    unique_sheet_title,
)
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/append-workbooks",
    summary="Append Workbooks",
    description="Combines sheets from multiple uploaded workbooks into one workbook.",
)
async def append_workbooks(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(..., description="Excel files to append"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least two workbook files are required")

    out_wb = Workbook()
    out_wb.remove(out_wb.active)
    used_titles: set[str] = set()
    copied_sheets = 0
    any_visuals = False

    for file_index, file in enumerate(files, start=1):
        filename = file.filename or f"workbook_{file_index}.xlsx"
        source_name = filename.rsplit(".", 1)[0] or f"workbook_{file_index}"
        source_name = _INVALID_SHEET_CHARS.sub("_", source_name)

        check_excel_file(file)
        raw = await read_upload_for_principal(file, principal=principal)
        if not any_visuals:
            any_visuals = has_visual_elements(raw)

        workbook_data = parse_excel_bytes(raw, file.filename)
        for sheet_name, rows in workbook_data.items():
            preferred_title = safe_sheet_title(sheet_name, f"sheet_{copied_sheets + 1}")
            requested_title = safe_sheet_title(
                f"{source_name}_{preferred_title}",
                preferred_title,
            )
            target_title = unique_sheet_title(requested_title, used_titles)
            out_ws = out_wb.create_sheet(target_title)

            for row in rows:
                out_ws.append(["" if v is None else v for v in row])

            copied_sheets += 1

    if copied_sheets == 0:
        raise HTTPException(status_code=400, detail="No data found in uploaded workbooks")

    output = BytesIO()
    out_wb.save(output)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="append-workbooks",
        tool_name="Append Workbooks",
        original_filename=files[0].filename,
        output_bytes=output.getvalue(),
        output_filename="appended.xlsx",
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=any_visuals,
    )
