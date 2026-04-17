from __future__ import annotations

import re
import time as _time
from datetime import date, datetime, time

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import (
    normalize_sheet_selection,
    read_upload_for_principal,
    safe_base_filename,
)
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)

router = APIRouter()

_IDENTIFIER_RE = re.compile(r"[^A-Za-z0-9_]")


def _safe_identifier(raw: str) -> str:
    name = _IDENTIFIER_RE.sub("_", raw.strip()).strip("_")
    if not name or name[0].isdigit():
        name = f"col_{name}"
    return name.lower()


_SQL_TYPE_RANK = {"BOOLEAN": 0, "INTEGER": 1, "REAL": 2, "DATE": 3, "TEXT": 4}


def _cell_sql_type(v) -> str | None:
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, bool):
        return "BOOLEAN"
    if isinstance(v, int):
        return "INTEGER"
    if isinstance(v, float):
        return "REAL" if v != int(v) else "INTEGER"
    if isinstance(v, (datetime, date, time)):
        return "DATE"
    return "TEXT"


def _infer_sql_type(values: list) -> str:
    best = -1
    for v in values:
        t = _cell_sql_type(v)
        if t is None:
            continue
        rank = _SQL_TYPE_RANK[t]
        if rank == 4:
            return "TEXT"
        if rank > best:
            best = rank
    return {0: "BOOLEAN", 1: "INTEGER", 2: "REAL", 3: "DATE"}.get(best, "TEXT")


def _escape_sql_value(value, sql_type: str) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (datetime, date, time)):
        return "'" + str(value) + "'"
    if isinstance(value, float) and sql_type == "INTEGER" and value == int(value):
        return str(int(value))
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _sheet_to_sql(table_name: str, rows: list[list]) -> str:
    if not rows:
        return ""

    headers = [_safe_identifier(str(h) if h is not None else f"col_{i+1}") for i, h in enumerate(rows[0])]
    seen: set[str] = set()
    unique_headers: list[str] = []
    for h in headers:
        candidate = h
        n = 2
        while candidate in seen:
            candidate = f"{h}_{n}"
            n += 1
        seen.add(candidate)
        unique_headers.append(candidate)

    data_rows = rows[1:]
    types = [_infer_sql_type([r[i] if i < len(r) else None for r in data_rows]) for i in range(len(unique_headers))]

    lines: list[str] = []
    col_defs = ", ".join(f"{col} {typ}" for col, typ in zip(unique_headers, types))
    lines.append(f"CREATE TABLE {table_name} ({col_defs});\n")

    for row in data_rows:
        vals = [_escape_sql_value(row[i] if i < len(row) else None, types[i]) for i in range(len(unique_headers))]
        lines.append(f"INSERT INTO {table_name} ({', '.join(unique_headers)}) VALUES ({', '.join(vals)});")

    return "\n".join(lines) + "\n"


@router.post(
    "/xlsx-to-sql",
    summary="Export XLSX to SQL",
    description="Uploads an Excel file and generates SQL CREATE TABLE and INSERT statements.",
)
async def xlsx_to_sql(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
    table_prefix: str = Query(default="", description="Prefix for table names"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = _time.perf_counter()
    ensure_supported_excel_filename(file.filename)
    raw = await read_upload_for_principal(file, principal=principal)

    workbook_data = parse_excel_bytes(raw, file.filename)

    selected = normalize_sheet_selection(sheets)
    if selected:
        missing = [name for name in selected if name not in workbook_data]
        if missing:
            raise HTTPException(status_code=404, detail=f"Sheet not found: {missing[0]}")
        targets = selected
    else:
        targets = list(workbook_data.keys())

    parts: list[str] = []
    for sheet_name in targets:
        table = _safe_identifier((table_prefix + sheet_name) if table_prefix else sheet_name)
        parts.append(_sheet_to_sql(table, workbook_data[sheet_name]))

    sql_text = "\n".join(parts)
    encoded = sql_text.encode("utf-8")
    download_name = f"{safe_base_filename(file.filename, 'workbook')}.sql"

    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="xlsx-to-sql",
        tool_name="XLSX to SQL",
        original_filename=file.filename,
        output_bytes=encoded,
        output_filename=download_name,
        mime_type="application/sql; charset=utf-8",
        success=True,
        error_type=None,
        duration_ms=int((_time.perf_counter() - started) * 1000),
    )
