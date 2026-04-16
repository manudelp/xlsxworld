from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.excel_reader import parse_excel_bytes
from app.tools._common import check_excel_file, file_response, has_visual_elements, read_with_limit
from app.tools.clean._utils import workbook_bytes_from_data

router = APIRouter()


def _comparable(value: Any) -> tuple[int, Any]:
    """Return a tuple safe to compare across mixed types (numbers, strings, None).

    The leading int is a "type bucket" so that numbers compare against
    numbers, strings against strings, and None always sorts last.
    """
    if value is None or value == "":
        return (3, "")
    if isinstance(value, bool):
        return (1, int(value))
    if isinstance(value, (int, float)):
        return (1, float(value))
    if isinstance(value, str):
        return (2, value.casefold())
    return (2, str(value).casefold())


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
    has_visuals = has_visual_elements(raw)

    if sheet not in workbook_data:
        raise HTTPException(status_code=404, detail="Sheet not found")

    try:
        keys = json.loads(sort_keys)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sort_keys JSON")

    rows = workbook_data[sheet]
    if not rows:
        workbook_data[sheet] = []
        output_bytes = workbook_bytes_from_data(workbook_data)
        return file_response(
            output_bytes,
            "sorted.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            visual_elements_removed=has_visuals,
        )

    header = rows[0] if has_header else None
    data_rows = list(rows[1:] if has_header else rows)

    header_map: dict[str, int] = {}
    if header:
        for i, h in enumerate(header):
            header_map[str("" if h is None else h).strip()] = i

    col_indexes: list[int] = []
    directions: list[str] = []
    missing_columns: list[str] = []
    for key in keys[:3]:
        col_name = str(key.get("column", "")).strip()
        direction = str(key.get("direction", "asc")).lower()
        if direction not in {"asc", "desc"}:
            direction = "asc"
        if not col_name:
            continue
        if col_name in header_map:
            col_indexes.append(header_map[col_name])
            directions.append(direction)
        else:
            missing_columns.append(col_name)

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Sort column not found in sheet: {missing_columns[0]}",
        )

    if not col_indexes:
        raise HTTPException(status_code=400, detail="No sort columns provided")

    for idx, direction in reversed(list(zip(col_indexes, directions))):
        reverse = direction == "desc"
        data_rows.sort(
            key=lambda r, i=idx: _comparable(r[i] if i < len(r) else None),
            reverse=reverse,
        )

    workbook_data[sheet] = ([header] if header else []) + data_rows
    output_bytes = workbook_bytes_from_data(workbook_data)

    return file_response(
        output_bytes,
        "sorted.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        visual_elements_removed=has_visuals,
    )
