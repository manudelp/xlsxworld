from __future__ import annotations

from io import BytesIO
from typing import Any

from fastapi import HTTPException
from openpyxl import Workbook


def parse_columns_arg(columns: str) -> list[str]:
    return [column.strip() for column in columns.split(",") if column.strip()]


def resolve_target_sheets(
    workbook_data: dict[str, list[list[Any]]],
    sheet: str,
    all_sheets: bool,
) -> list[str]:
    if all_sheets:
        return list(workbook_data.keys())

    selected_sheet = sheet.strip()
    if not selected_sheet:
        raise HTTPException(status_code=400, detail="sheet is required when all_sheets is false")
    if selected_sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return [selected_sheet]


def resolve_column_indexes(
    header: list[Any],
    selected_columns: list[str],
    *,
    allow_missing: bool = False,
) -> list[int]:
    if not selected_columns:
        return list(range(len(header)))

    indexes: list[int] = []
    missing: list[str] = []

    normalized_header = ["" if value is None else str(value).strip() for value in header]

    for column in selected_columns:
        if column in normalized_header:
            indexes.append(normalized_header.index(column))
        else:
            missing.append(column)

    if missing and not allow_missing:
        raise HTTPException(
            status_code=400,
            detail=f"Column not found: {missing[0]}",
        )

    return indexes


def get_cell(row: list[Any], index: int) -> Any:
    if index < len(row):
        return row[index]
    return None


def with_updated_cell(row: list[Any], index: int, value: Any) -> list[Any]:
    out = list(row)
    if index >= len(out):
        out.extend([None] * (index + 1 - len(out)))
    out[index] = value
    return out


def workbook_bytes_from_data(workbook_data: dict[str, list[list[Any]]]) -> bytes:
    out_wb = Workbook()
    out_wb.remove(out_wb.active)

    for sheet_name, rows in workbook_data.items():
        out_ws = out_wb.create_sheet(sheet_name[:31] if sheet_name else "Sheet")
        for row in rows:
            out_ws.append(["" if cell is None else cell for cell in row])

    if not out_wb.worksheets:
        out_wb.create_sheet("Sheet1")

    output = BytesIO()
    out_wb.save(output)
    return output.getvalue()
