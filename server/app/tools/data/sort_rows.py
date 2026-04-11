from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, read_with_limit
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()


def _sort_key(row: list[Any], col_indexes: list[int], directions: list[str]):
    parts: list[tuple[Any, ...]] = []
    for idx, direction in zip(col_indexes, directions):
        val = row[idx] if idx < len(row) else None
        if val is None:
            val = ""
        if isinstance(val, str):
            val = val.lower()
        parts.append((val,))
    return parts


@router.post(
    "/sort-rows",
    summary="Sort Rows",
    description="Sorts rows in a selected sheet by one or more columns.",
)
async def sort_rows(
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form(..., description="Sheet name"),
    sort_keys: str = Form(..., description='JSON array: [{"column":"Name","direction":"asc"}]'),
    has_header: bool = Form(True, description="Whether first row is header"),
):
    check_excel_file(file)
    raw = await read_with_limit(file)
    workbook_data = parse_excel_bytes(raw, file.filename)

    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")

    try:
        keys = json.loads(sort_keys)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sort_keys JSON")

    rows = workbook_data[sheet]
    if not rows:
        return file_response(
            (await read_with_limit(file)) if False else b"",
            "sorted.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    header = rows[0] if has_header else None
    data_rows = rows[1:] if has_header else rows

    header_map = {}
    if header:
        for i, h in enumerate(header):
            header_map[str(h).strip()] = i

    col_indexes: list[int] = []
    directions: list[str] = []
    for key in keys[:3]:
        col_name = key.get("column", "")
        direction = key.get("direction", "asc")
        if col_name in header_map:
            col_indexes.append(header_map[col_name])
            directions.append(direction)

    if not col_indexes:
        raise HTTPException(status_code=400, detail="No valid sort columns found")

    for idx, direction in reversed(list(zip(col_indexes, directions))):
        reverse = direction == "desc"
        data_rows.sort(
            key=lambda r, i=idx: (
                (0, r[i].lower() if isinstance(r[i] if i < len(r) else None, str) else r[i] if i < len(r) else "")
                if (i < len(r) and r[i] is not None)
                else (1, "")
            ),
            reverse=reverse,
        )

    workbook_data[sheet] = ([header] if header else []) + data_rows
    output_bytes = workbook_bytes_from_data(workbook_data)

    return file_response(
        output_bytes,
        "sorted.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
