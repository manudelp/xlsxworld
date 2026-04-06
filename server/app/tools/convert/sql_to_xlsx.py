from __future__ import annotations

import re
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

from app.tools._common import MAX_UPLOAD_SIZE_BYTES, safe_sheet_title, unique_sheet_title

router = APIRouter()

_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+[`\"']?(\w+)[`\"']?\s*\(([^)]+)\)\s*VALUES\s*\((.+?)\)\s*;",
    re.IGNORECASE,
)

_SQL_CONTENT_TYPES = {"application/sql", "text/sql", "text/x-sql", "text/plain"}


def _parse_sql_value(raw: str) -> str | int | float | None:
    v = raw.strip()
    if v.upper() == "NULL":
        return None
    if v.upper() in ("TRUE", "FALSE"):
        return v.upper() == "TRUE"
    if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
        return v[1:-1].replace("''", "'")
    try:
        if "." in v:
            return float(v)
        return int(v)
    except ValueError:
        return v


def _split_values(values_str: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    in_quote = False
    quote_char = ""
    for ch in values_str:
        if in_quote:
            current.append(ch)
            if ch == quote_char:
                in_quote = False
        elif ch in ("'", '"'):
            in_quote = True
            quote_char = ch
            current.append(ch)
        elif ch == ",":
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    if current:
        parts.append("".join(current))
    return parts


def _safe_base_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-._")
    return safe or fallback


@router.post(
    "/sql-to-xlsx",
    summary="SQL to XLSX",
    description="Parses INSERT statements from a SQL file and converts them into an XLSX workbook.",
)
async def sql_to_xlsx(
    file: UploadFile = File(..., description="SQL file to convert"),
    include_headers: bool = Form(True, description="Include column headers"),
):
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not filename.endswith(".sql") and content_type not in _SQL_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected SQL")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    tables: dict[str, dict] = {}
    for match in _INSERT_RE.finditer(text):
        table_name = match.group(1)
        columns = [c.strip().strip("`\"'") for c in match.group(2).split(",")]
        values = [_parse_sql_value(v) for v in _split_values(match.group(3))]

        if table_name not in tables:
            tables[table_name] = {"columns": columns, "rows": []}
        tables[table_name]["rows"].append(values)

    if not tables:
        raise HTTPException(status_code=400, detail="No INSERT statements found in the SQL file")

    wb = Workbook()
    default_ws = wb.active
    wb.remove(default_ws)

    used_names: set[str] = set()
    for table_name, data in tables.items():
        title = unique_sheet_title(safe_sheet_title(table_name, "Sheet"), used_names)
        ws = wb.create_sheet(title=title)
        if include_headers:
            ws.append(data["columns"])
        for row in data["rows"]:
            padded = list(row)
            if len(padded) < len(data["columns"]):
                padded.extend([None] * (len(data["columns"]) - len(padded)))
            ws.append(padded)

    output = BytesIO()
    try:
        wb.save(output)
        result = output.getvalue()
    finally:
        output.close()

    out_name = f"{_safe_base_filename(file.filename, 'converted')}.xlsx"

    return StreamingResponse(
        iter([result]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{out_name}"',
            "Content-Encoding": "identity",
            "X-Content-Type-Options": "nosniff",
        },
    )
