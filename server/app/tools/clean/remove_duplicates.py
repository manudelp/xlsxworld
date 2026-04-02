from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES, check_excel_file
from app.tools.clean._utils import (
    get_cell,
    parse_columns_arg,
    resolve_column_indexes,
    resolve_target_sheets,
    workbook_bytes_from_data,
)

router = APIRouter()


@router.post(
    "/remove-duplicates",
    summary="Remove Duplicates",
    description="Removes duplicate data rows based on selected columns.",
)
async def remove_duplicates(
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    keep: str = Form("first", description="Duplicate retention strategy: first or last"),
):
    check_excel_file(file)
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    if keep not in {"first", "last"}:
        raise HTTPException(status_code=400, detail="keep must be either 'first' or 'last'")

    workbook_data = parse_excel_bytes(raw, file.filename)
    target_sheets = resolve_target_sheets(workbook_data, sheet, all_sheets)
    selected_columns = parse_columns_arg(columns)

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

    return StreamingResponse(
        iter([output_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=deduplicated.xlsx"},
    )
