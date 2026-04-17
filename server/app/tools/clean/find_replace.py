from __future__ import annotations

import re
import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import supports_inplace_edit
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
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


_OUTPUT_FILENAME = "find-replace.xlsx"
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/find-replace",
    summary="Find and Replace",
    description="Finds and replaces text (plain or regex) in selected columns.",
)
async def find_replace(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    find_text: str = Form(..., description="Text or regex pattern to find"),
    replace_text: str = Form("", description="Replacement text"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    use_regex: bool = Form(False, description="Interpret find_text as regex"),
    match_case: bool = Form(False, description="Case-sensitive matching"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)

    if not find_text:
        raise HTTPException(status_code=400, detail="find_text is required")

    flags = 0 if match_case else re.IGNORECASE
    pattern_text = find_text if use_regex else re.escape(find_text)

    try:
        pattern = re.compile(pattern_text, flags)
    except re.error as error:
        raise HTTPException(status_code=400, detail=f"Invalid pattern: {error}") from error

    selected_columns = parse_columns_arg(columns)

    def _replace(value):
        if not isinstance(value, str):
            return value
        return pattern.sub(replace_text, value)

    if supports_inplace_edit(file.filename):
        output_bytes, visual_lost = apply_value_mutation_inplace(
            raw,
            file.filename,
            sheet=sheet,
            all_sheets=all_sheets,
            selected_columns=selected_columns,
            mutate=_replace,
        )
        return await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="find-replace",
            tool_name="Find and Replace",
            original_filename=file.filename,
            output_bytes=output_bytes,
            output_filename=_OUTPUT_FILENAME,
            mime_type=_XLSX_MIME,
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
        column_indexes = resolve_column_indexes(header, selected_columns)

        replaced_rows: list[list[object]] = []
        for row in data_rows:
            updated_row = list(row)
            for index in column_indexes:
                value = get_cell(updated_row, index)
                if not isinstance(value, str):
                    continue
                updated_row = with_updated_cell(
                    updated_row,
                    index,
                    pattern.sub(replace_text, value),
                )
            replaced_rows.append(updated_row)

        workbook_data[sheet_name] = [header, *replaced_rows]

    output_bytes = workbook_bytes_from_data(workbook_data)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="find-replace",
        tool_name="Find and Replace",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename=_OUTPUT_FILENAME,
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visual_elements(raw),
    )
