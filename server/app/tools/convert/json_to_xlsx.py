from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, time
from io import BytesIO
import json
import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

from app.tools._common import MAX_UPLOAD_SIZE_BYTES, safe_sheet_title, unique_sheet_title

router = APIRouter()


_JSON_CONTENT_TYPES = {"application/json", "text/json", "application/ld+json"}


def _safe_base_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-._")
    return safe or fallback


def _normalize_cell(value):
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool, datetime, date, time)):
        return value
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (list, tuple, set)):
        return json.dumps(list(value), ensure_ascii=False)
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


def _records_to_rows(records: list[dict], include_headers: bool = True) -> list[list]:
    if not records:
        return [[""]]

    headers_raw: list[str] = []
    seen: set[str] = set()
    for record in records:
        for key in record.keys():
            header = str(key)
            if header not in seen:
                seen.add(header)
                headers_raw.append(header)

    headers = _dedupe_headers(headers_raw)

    rows: list[list] = [headers] if include_headers else []
    for record in records:
        rows.append([_normalize_cell(record.get(header)) for header in headers])
    return rows


def _headers_and_rows_to_rows(
    headers_like: list,
    rows_like: list,
    include_headers: bool = True,
) -> list[list]:
    headers = _dedupe_headers(headers_like)
    if not headers:
        headers = ["column_1"]

    rows: list[list] = [headers] if include_headers else []
    for item in rows_like:
        if isinstance(item, dict):
            rows.append([_normalize_cell(item.get(header)) for header in headers])
            continue

        if isinstance(item, (list, tuple)):
            normalized = [_normalize_cell(cell) for cell in item[: len(headers)]]
            if len(normalized) < len(headers):
                normalized.extend([""] * (len(headers) - len(normalized)))
            rows.append(normalized)
            continue

        row = [_normalize_cell(item)]
        if len(headers) > 1:
            row.extend([""] * (len(headers) - 1))
        rows.append(row)

    return rows


def _list_rows_to_rows(rows_like: list, include_headers: bool = True) -> list[list]:
    if not rows_like:
        return [[""]]

    if all(isinstance(item, dict) for item in rows_like):
        return _records_to_rows(rows_like, include_headers=include_headers)

    if any(isinstance(item, dict) for item in rows_like):
        normalized_records: list[dict] = []
        for item in rows_like:
            if isinstance(item, dict):
                normalized_records.append(item)
            elif isinstance(item, (list, tuple)):
                normalized_records.append({"value": json.dumps(list(item), ensure_ascii=False)})
            else:
                normalized_records.append({"value": _normalize_cell(item)})
        return _records_to_rows(normalized_records, include_headers=include_headers)

    table_rows: list[list] = []
    for item in rows_like:
        if isinstance(item, list):
            table_rows.append([_normalize_cell(cell) for cell in item])
        elif isinstance(item, tuple):
            table_rows.append([_normalize_cell(cell) for cell in item])
        elif isinstance(item, dict):
            table_rows.append([json.dumps(item, ensure_ascii=False)])
        else:
            table_rows.append([_normalize_cell(item)])

    if include_headers and table_rows:
        max_columns = max(len(row) for row in table_rows)
        headers = [f"column_{index + 1}" for index in range(max_columns)]
        normalized_rows: list[list] = [headers]
        for row in table_rows:
            if len(row) < max_columns:
                normalized_rows.append(row + [""] * (max_columns - len(row)))
            else:
                normalized_rows.append(row)
        return normalized_rows

    return table_rows


def _to_sheet_map(payload, include_headers: bool = True) -> dict[str, list[list]]:
    if isinstance(payload, list):
        return {"Sheet1": _list_rows_to_rows(payload, include_headers=include_headers)}

    if isinstance(payload, dict):
        if not payload:
            return {"Sheet1": [[""]]}

        if (
            isinstance(payload.get("headers"), list)
            and isinstance(payload.get("rows"), list)
            and len(payload) <= 3
        ):
            return {
                "Sheet1": _headers_and_rows_to_rows(
                    payload.get("headers", []),
                    payload.get("rows", []),
                    include_headers=include_headers,
                )
            }

        if all(isinstance(value, list) for value in payload.values()):
            result: dict[str, list[list]] = {}
            for key, value in payload.items():
                sheet_name = str(key)
                result[sheet_name or "Sheet"] = _list_rows_to_rows(value, include_headers=include_headers)
            return result

        return {"Sheet1": _records_to_rows([payload], include_headers=include_headers)}

    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported JSON shape. Use an array of rows/objects or an object mapping sheet names to arrays."
        ),
    )


def _iter_sheet_map(sheet_map: dict[str, list[list]]) -> Iterable[tuple[str, list[list]]]:
    for key, rows in sheet_map.items():
        if not isinstance(rows, list):
            raise HTTPException(status_code=400, detail=f"Sheet '{key}' must be an array")
        yield key, rows


@router.post(
    "/json-to-xlsx",
    summary="JSON to XLSX",
    description="Uploads a JSON file and converts it into an XLSX workbook.",
)
async def json_to_xlsx(
    file: UploadFile = File(..., description="JSON file to convert"),
    include_headers: bool = Form(True, description="Include a header row when columns are inferred"),
):
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not filename.endswith(".json") and content_type not in _JSON_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected JSON")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    try:
        payload = json.loads(raw.decode("utf-8-sig"))
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {error.msg}") from error

    sheet_map = _to_sheet_map(payload, include_headers=include_headers)

    wb = Workbook()
    default_ws = wb.active
    wb.remove(default_ws)

    used_sheet_names: set[str] = set()
    for raw_name, rows in _iter_sheet_map(sheet_map):
        title = unique_sheet_title(safe_sheet_title(raw_name, "Sheet"), used_sheet_names)
        ws = wb.create_sheet(title=title)
        normalized_rows = rows if rows else [[""]]
        for row in normalized_rows:
            if isinstance(row, list):
                ws.append([_normalize_cell(cell) for cell in row])
            else:
                ws.append([_normalize_cell(row)])

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    out_name = f"{_safe_base_filename(file.filename, 'converted')}.xlsx"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={out_name}",
            "Content-Encoding": "identity",
        },
    )
