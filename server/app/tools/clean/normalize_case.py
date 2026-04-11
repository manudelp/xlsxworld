from __future__ import annotations

import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

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

_VALID_MODES = {"lower", "upper", "title"}


def _title_case(value: str) -> str:
    return re.sub(r"[A-Za-z0-9]+", lambda m: m.group(0)[:1].upper() + m.group(0)[1:].lower(), value)


@router.post(
    "/normalize-case",
    summary="Normalize Case",
    description="Normalizes text columns to lower, upper, or title case.",
)
async def normalize_case(
    file: UploadFile = File(..., description="Excel file"),
    mode: str = Form("lower", description="Case mode: lower, upper, or title"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)

    if mode not in _VALID_MODES:
        raise HTTPException(status_code=400, detail="mode must be one of: lower, upper, title")

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

        normalized_rows: list[list[object]] = []
        for row in data_rows:
            updated_row = list(row)
            for index in column_indexes:
                value = get_cell(updated_row, index)
                if not isinstance(value, str):
                    continue

                if mode == "lower":
                    next_value = value.lower()
                elif mode == "upper":
                    next_value = value.upper()
                else:
                    next_value = _title_case(value)

                updated_row = with_updated_cell(updated_row, index, next_value)
            normalized_rows.append(updated_row)

        workbook_data[sheet_name] = [header, *normalized_rows]

    output_bytes = workbook_bytes_from_data(workbook_data)

    return file_response(
        output_bytes,
        "normalize-case.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=has_visual_elements(raw),
    )
