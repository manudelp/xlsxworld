from __future__ import annotations

import re

from fastapi import APIRouter, File, Form, UploadFile

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit
from app.tools.clean._utils import (
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
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    collapse_internal_spaces: bool = Form(False, description="Collapse internal whitespace sequences"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)
    target_sheets = resolve_target_sheets(workbook_data, sheet, all_sheets)
    selected_columns = parse_columns_arg(columns)

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

    return file_response(
        output_bytes,
        "trim-spaces.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=has_visual_elements(raw),
    )
