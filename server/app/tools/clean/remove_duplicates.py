from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import (
    header_index_map,
    load_workbook_for_edit,
    save_workbook_to_bytes,
    supports_inplace_edit,
)
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import (
    get_cell,
    parse_columns_arg,
    resolve_column_indexes,
    resolve_target_sheet_titles,
    resolve_target_sheets,
    workbook_bytes_from_data,
)

router = APIRouter()


_OUTPUT_FILENAME = "remove-duplicates.xlsx"
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.post(
    "/remove-duplicates",
    summary="Remove Duplicates",
    description="Removes duplicate data rows based on selected columns.",
)
async def remove_duplicates(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    keep: str = Form("first", description="Duplicate retention strategy: first or last"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)

    if keep not in {"first", "last"}:
        raise HTTPException(status_code=400, detail="keep must be either 'first' or 'last'")

    selected_columns = parse_columns_arg(columns)

    if supports_inplace_edit(file.filename):
        loaded = load_workbook_for_edit(raw, file.filename)
        workbook = loaded.workbook
        target_titles = resolve_target_sheet_titles(workbook, sheet, all_sheets)

        for sheet_name in target_titles:
            ws = workbook[sheet_name]
            if ws.max_row <= 1:
                continue

            column_indexes = header_index_map(
                ws,
                header_row=1,
                selected_columns=selected_columns or None,
            )

            def _row_key(values: list[Any]) -> tuple[Any, ...]:
                if not column_indexes:
                    return tuple(values)
                return tuple(
                    values[idx - 1] if idx - 1 < len(values) else None
                    for idx in column_indexes
                )

            row_records: list[tuple[int, tuple[Any, ...]]] = []
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=False):
                values = [cell.value for cell in row]
                row_records.append((row[0].row, _row_key(values)))

            seen: set[tuple[Any, ...]] = set()
            rows_to_delete: list[int] = []
            iter_records = (
                row_records if keep == "first" else list(reversed(row_records))
            )
            for row_idx, key in iter_records:
                if key in seen:
                    rows_to_delete.append(row_idx)
                else:
                    seen.add(key)

            for row_idx in sorted(rows_to_delete, reverse=True):
                ws.delete_rows(row_idx, 1)

        output_bytes = save_workbook_to_bytes(workbook)
        return await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="remove-duplicates",
            tool_name="Remove Duplicates",
            original_filename=file.filename,
            output_bytes=output_bytes,
            output_filename=_OUTPUT_FILENAME,
            mime_type=_XLSX_MIME,
            success=True,
            error_type=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            visual_elements_removed=loaded.visual_elements_lost or has_visual_elements(raw),
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

        def build_key(row: list[Any]) -> tuple[Any, ...]:
            if not column_indexes:
                return tuple(row)
            return tuple(get_cell(row, index) for index in column_indexes)

        if keep == "first":
            seen: set[tuple[Any, ...]] = set()
            deduped_rows: list[list[Any]] = []
            for row in data_rows:
                key = build_key(row)
                if key in seen:
                    continue
                seen.add(key)
                deduped_rows.append(row)
        else:
            seen = set()
            reversed_rows = list(reversed(data_rows))
            deduped_reversed: list[list[Any]] = []
            for row in reversed_rows:
                key = build_key(row)
                if key in seen:
                    continue
                seen.add(key)
                deduped_reversed.append(row)
            deduped_rows = list(reversed(deduped_reversed))

        workbook_data[sheet_name] = [header, *deduped_rows]

    output_bytes = workbook_bytes_from_data(workbook_data)

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="remove-duplicates",
        tool_name="Remove Duplicates",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename=_OUTPUT_FILENAME,
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visual_elements(raw),
    )
