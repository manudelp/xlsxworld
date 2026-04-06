from __future__ import annotations

import json
import math
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import (
    dedupe_headers,
    file_response,
    normalize_sheet_selection,
    read_with_limit,
    safe_base_filename,
)

router = APIRouter()


def _safe_json_value(value):
    if value is None:
        return None
    if isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _sheet_rows_to_records(rows: list[list]) -> list[dict[str, object | None]]:
    if not rows:
        return []

    headers = dedupe_headers(rows[0])
    records: list[dict[str, object | None]] = []
    for row in rows[1:]:
        record: dict[str, object | None] = {}
        for index, header in enumerate(headers):
            value = row[index] if index < len(row) else None
            record[header] = _safe_json_value(value)
        records.append(record)
    return records


@router.post(
    "/xlsx-to-json",
    summary="Export XLSX to JSON",
    description="Uploads an Excel file and exports one or more sheets as JSON.",
)
async def xlsx_to_json(
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
):
    ensure_supported_excel_filename(file.filename)
    raw = await read_with_limit(file)

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection(sheets)
    if selected:
        missing = [name for name in selected if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        targets = selected
    else:
        targets = list(workbook_data.keys())

    if len(targets) == 1:
        payload: object = _sheet_rows_to_records(workbook_data[targets[0]])
        download_name = f"{targets[0]}.json"
    else:
        payload = {
            sheet_name: _sheet_rows_to_records(workbook_data[sheet_name]) for sheet_name in targets
        }
        download_name = f"{safe_base_filename(file.filename, 'workbook')}.json"

    encoded = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False).encode("utf-8")

    return file_response(encoded, download_name, "application/json; charset=utf-8")
