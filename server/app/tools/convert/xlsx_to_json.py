from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from io import BytesIO
import json
import math
import re

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES

router = APIRouter()


def _safe_json_value(value):
    if value is None:
        return None
    if isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        if math.isfinite(value):
            return value
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _dedupe_headers(raw_headers: list) -> list[str]:
    headers: list[str] = []
    used: set[str] = set()
    for index, raw in enumerate(raw_headers):
        name = (str(raw).strip() if raw is not None else "") or f"column_{index + 1}"
        candidate = name
        i = 2
        while candidate in used:
            candidate = f"{name}_{i}"
            i += 1
        used.add(candidate)
        headers.append(candidate)
    return headers


def _sheet_rows_to_records(rows: list[list]) -> list[dict[str, object | None]]:
    if not rows:
        return []

    headers = _dedupe_headers(rows[0])
    records: list[dict[str, object | None]] = []
    for row in rows[1:]:
        record: dict[str, object | None] = {}
        for index, header in enumerate(headers):
            value = row[index] if index < len(row) else None
            record[header] = _safe_json_value(value)
        records.append(record)
    return records


def _safe_base_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-._")
    return safe or fallback


def _normalize_sheet_selection(sheets: list[str] | None) -> list[str] | None:
    if not sheets:
        return None

    normalized: list[str] = []
    for entry in sheets:
        for part in entry.split(","):
            value = part.strip()
            if value:
                normalized.append(value)
    return normalized or None


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
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = _normalize_sheet_selection(sheets)
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
        download_name = f"{_safe_base_filename(file.filename, 'workbook')}.json"

    encoded = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False).encode("utf-8")
    stream = BytesIO(encoded)
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={download_name}",
            "Content-Encoding": "identity",
        },
    )
