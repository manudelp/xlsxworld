from __future__ import annotations

import re
import time
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from openpyxl import Workbook

from app.core.security import AuthenticatedPrincipal
from app.services.jobs_service import JobsService
from app.tools._common import (
    read_with_limit,
    safe_base_filename,
    safe_sheet_title,
    unique_sheet_title,
)
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

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


@router.post(
    "/sql-to-xlsx",
    summary="SQL to XLSX",
    description="Parses INSERT statements from a SQL file and converts them into an XLSX workbook.",
)
async def sql_to_xlsx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="SQL file to convert"),
    include_headers: bool = Form(True, description="Include column headers"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not filename.endswith(".sql") and content_type not in _SQL_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type, expected SQL")

    raw = await read_with_limit(file)

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
    wb.save(output)

    out_name = f"{safe_base_filename(file.filename, 'converted')}.xlsx"

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="sql-to-xlsx",
        tool_name="SQL to XLSX",
        original_filename=file.filename,
        output_bytes=output.getvalue(),
        output_filename=out_name,
        mime_type=_XLSX_MIME,
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
    )
