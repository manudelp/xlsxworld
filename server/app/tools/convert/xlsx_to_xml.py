from __future__ import annotations

import re
from datetime import date, datetime, time
from decimal import Decimal
import math
import xml.etree.ElementTree as ET

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.services.excel_reader import ensure_supported_excel_filename, parse_excel_bytes
from app.tools._common import MAX_UPLOAD_SIZE_BYTES

router = APIRouter()

_TAG_RE = re.compile(r"[^A-Za-z0-9_.-]")


def _safe_tag(raw: str, fallback: str = "field") -> str:
    tag = _TAG_RE.sub("_", raw.strip()).strip("_.-")
    if not tag or tag[0].isdigit() or tag[0] in (".", "-"):
        tag = f"{fallback}_{tag}" if tag else fallback
    return tag


def _safe_xml_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, str)):
        return str(value)
    if isinstance(value, float):
        return str(value) if math.isfinite(value) else ""
    if isinstance(value, Decimal):
        return str(float(value))
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


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


def _safe_base_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-._")
    return safe or fallback


def _dedupe_headers(raw_headers: list) -> list[str]:
    headers: list[str] = []
    used: set[str] = set()
    for index, raw in enumerate(raw_headers):
        name = _safe_tag(str(raw).strip() if raw is not None else "", f"column_{index + 1}")
        candidate = name
        i = 2
        while candidate in used:
            candidate = f"{name}_{i}"
            i += 1
        used.add(candidate)
        headers.append(candidate)
    return headers


@router.post(
    "/xlsx-to-xml",
    summary="Export XLSX to XML",
    description="Uploads an Excel file and exports one or more sheets as XML.",
)
async def xlsx_to_xml(
    file: UploadFile = File(..., description="Excel file"),
    sheets: list[str] = Query(default=None, description="Sheet names to export (empty=all)"),
    root_tag: str = Query(default="workbook", description="Root XML element name"),
    row_tag: str = Query(default="row", description="Row XML element name"),
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

    root = ET.Element(_safe_tag(root_tag, "workbook"))

    for sheet_name in targets:
        rows = workbook_data[sheet_name]
        sheet_el = ET.SubElement(root, "sheet", name=sheet_name)

        if not rows:
            continue

        headers = _dedupe_headers(rows[0])
        for data_row in rows[1:]:
            row_el = ET.SubElement(sheet_el, _safe_tag(row_tag, "row"))
            for i, header in enumerate(headers):
                cell_el = ET.SubElement(row_el, header)
                cell_el.text = _safe_xml_value(data_row[i] if i < len(data_row) else None)

    ET.indent(root)
    xml_bytes = ET.tostring(root, encoding="unicode", xml_declaration=False)
    encoded = ('<?xml version="1.0" encoding="UTF-8"?>\n' + xml_bytes).encode("utf-8")

    download_name = f"{_safe_base_filename(file.filename, 'workbook')}.xml"

    return StreamingResponse(
        iter([encoded]),
        media_type="application/xml; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
            "Content-Encoding": "identity",
            "X-Content-Type-Options": "nosniff",
        },
    )
