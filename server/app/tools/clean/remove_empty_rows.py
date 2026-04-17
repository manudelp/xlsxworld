from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import supports_inplace_edit
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_upload_for_principal, normalize_sheet_selection
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import delete_rows_inplace, workbook_bytes_from_data

router = APIRouter()


_OUTPUT_FILENAME = "cleaned.xlsx"
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _expose_rows_removed_header(response, total_removed: int) -> None:
    response.headers["X-Rows-Removed"] = str(total_removed)
    exposed = response.headers.get("Access-Control-Expose-Headers", "")
    response.headers["Access-Control-Expose-Headers"] = (
        f"{exposed}, X-Rows-Removed".lstrip(", ")
    )


@router.post(
    "/remove-empty-rows",
    summary="Remove Empty Rows",
    description="Removes rows where all cells are empty across selected sheets.",
)
async def remove_empty_rows(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheets: str = Form("", description="Comma-separated sheet names (empty=all sheets)"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_upload_for_principal(file, principal=principal)

    def _is_empty_row(values: list) -> bool:
        return not any(c is not None and str(c).strip() != "" for c in values)

    if supports_inplace_edit(file.filename):
        # In-place row deletion: process all sheets one by one so we can use
        # the per-sheet helper. We loop through the sheet names from the file.
        from app.services.excel_editor import load_workbook_for_edit, save_workbook_to_bytes

        loaded = load_workbook_for_edit(raw, file.filename)
        workbook = loaded.workbook
        all_titles = list(workbook.sheetnames)
        if sheets.strip():
            requested = normalize_sheet_selection([sheets]) or []
            target_titles = [name for name in requested if name in all_titles]
        else:
            target_titles = all_titles

        total_removed = 0
        for sheet_name in target_titles:
            ws = workbook[sheet_name]
            if ws.max_row <= 1:
                continue
            rows_to_delete: list[int] = []
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=False):
                values = [cell.value for cell in row]
                if _is_empty_row(values):
                    rows_to_delete.append(row[0].row)
            for row_idx in reversed(rows_to_delete):
                ws.delete_rows(row_idx, 1)
            total_removed += len(rows_to_delete)

        output_bytes = save_workbook_to_bytes(workbook)
        has_visuals = loaded.visual_elements_lost or has_visual_elements(raw)
        resp = await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="remove-empty-rows",
            tool_name="Remove Empty Rows",
            original_filename=file.filename,
            output_bytes=output_bytes,
            output_filename=_OUTPUT_FILENAME,
            mime_type=_XLSX_MIME,
            success=True,
            error_type=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            visual_elements_removed=has_visuals,
        )
        _expose_rows_removed_header(resp, total_removed)
        return resp

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection([sheets]) if sheets.strip() else None
    target_sheets = selected if selected else list(workbook_data.keys())

    total_removed = 0
    for sheet_name in target_sheets:
        if sheet_name not in workbook_data:
            continue
        rows = workbook_data[sheet_name]
        if not rows:
            continue
        header = rows[0]
        data_rows = rows[1:]
        cleaned = [r for r in data_rows if any(c is not None and str(c).strip() != "" for c in r)]
        total_removed += len(data_rows) - len(cleaned)
        workbook_data[sheet_name] = [header, *cleaned]

    output_bytes = workbook_bytes_from_data(workbook_data)
    has_visuals = has_visual_elements(raw)
    resp = await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="remove-empty-rows",
        tool_name="Remove Empty Rows",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename=_OUTPUT_FILENAME,
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visuals,
    )
    _expose_rows_removed_header(resp, total_removed)
    return resp
