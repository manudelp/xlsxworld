from __future__ import annotations

import re
import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import supports_inplace_edit
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_upload_for_principal
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import (
    apply_value_mutation_inplace,
    get_cell,
    parse_columns_arg,
    resolve_column_indexes,
    resolve_target_sheets,
    with_updated_cell,
    workbook_bytes_from_data,
)

router = APIRouter()


@router.post(
    "/trim-spaces",
    summary="Trim Spaces",
    description="Trims leading and trailing spaces in selected text columns.",
)
async def trim_spaces(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    collapse_internal_spaces: bool = Form(False, description="Collapse internal whitespace sequences"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_upload_for_principal(file, principal=principal)
    selected_columns = parse_columns_arg(columns)

    def _trim(value):
        if not isinstance(value, str):
            return value
        cleaned = value.strip()
        if collapse_internal_spaces:
            cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned

    if supports_inplace_edit(file.filename):
        output_bytes, visual_lost = apply_value_mutation_inplace(
            raw,
            file.filename,
            sheet=sheet,
            all_sheets=all_sheets,
            selected_columns=selected_columns,
            mutate=_trim,
        )
        return await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="trim-spaces",
            tool_name="Trim Spaces",
            original_filename=file.filename,
            output_bytes=output_bytes,
            output_filename="trim-spaces.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            success=True,
            error_type=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            visual_elements_removed=visual_lost or has_visual_elements(raw),
        )

    workbook_data = parse_excel_bytes(raw, file.filename)
    target_sheets = resolve_target_sheets(workbook_data, sheet, all_sheets)

    for sheet_name in target_sheets:
        rows = workbook_data[sheet_name]
        if len(rows) <= 1:
            continue

        header = rows[0]
        data_rows = rows[1:]
        column_indexes = resolve_column_indexes(
            header,
            selected_columns,
            allow_missing=all_sheets,
        )

        cleaned_rows: list[list[object]] = []
        for row in data_rows:
            updated_row = list(row)
            for index in column_indexes:
                value = get_cell(updated_row, index)
                if not isinstance(value, str):
                    continue
                cleaned = value.strip()
                if collapse_internal_spaces:
                    cleaned = re.sub(r"\s+", " ", cleaned)
                updated_row = with_updated_cell(updated_row, index, cleaned)
            cleaned_rows.append(updated_row)

        workbook_data[sheet_name] = [header, *cleaned_rows]

    output_bytes = workbook_bytes_from_data(workbook_data)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="trim-spaces.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visual_elements(raw),
    )
